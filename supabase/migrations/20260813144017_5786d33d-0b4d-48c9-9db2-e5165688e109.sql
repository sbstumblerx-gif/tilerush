ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'puu',
  ADD COLUMN IF NOT EXISTS league_week integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.league_current_week()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 1 + floor((extract(epoch from now()) - 1786320000) / 604800)::int
$$;

CREATE TABLE IF NOT EXISTS public.league_scores (
  week integer NOT NULL,
  user_id uuid NOT NULL,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  trophies integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (week, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.league_scores TO authenticated;
GRANT ALL ON public.league_scores TO service_role;
ALTER TABLE public.league_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in can read league scores" ON public.league_scores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insert own league score" ON public.league_scores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own league score" ON public.league_scores
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER league_scores_touch
  BEFORE UPDATE ON public.league_scores
  FOR EACH ROW EXECUTE FUNCTION public.tr_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.league_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid,
  week integer NOT NULL,
  kind text NOT NULL DEFAULT 'box',
  amount integer NOT NULL DEFAULT 5,
  rarity text,
  reason text NOT NULL DEFAULT 'promotion',
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.league_rewards TO authenticated;
GRANT ALL ON public.league_rewards TO service_role;
ALTER TABLE public.league_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own league rewards" ON public.league_rewards
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Claim own league rewards" ON public.league_rewards
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Kerää pokaaleja omalle joukkueelle kuluvalla liigaviikolla
CREATE OR REPLACE FUNCTION public.league_add_trophies(_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _team uuid;
  _week integer := public.league_current_week();
BEGIN
  IF _uid IS NULL OR _amount IS NULL OR _amount <= 0 THEN RETURN; END IF;
  SELECT team_id INTO _team FROM public.team_members WHERE user_id = _uid LIMIT 1;
  IF _team IS NULL THEN RETURN; END IF;
  INSERT INTO public.league_scores (week, user_id, team_id, trophies)
  VALUES (_week, _uid, _team, _amount)
  ON CONFLICT (week, user_id)
  DO UPDATE SET trophies = public.league_scores.trophies + _amount,
                team_id = _team,
                updated_at = now();
END;
$$;

-- Viikonvaihto: laskee taulukot, jakaa palkinnot ja siirtää joukkueet tasoille
CREATE OR REPLACE FUNCTION public.league_settle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _week integer := public.league_current_week();
  _tiers text[] := ARRAY['puu','pronssi','hopea','kulta','timantti','ultra'];
  _tier text;
  _old_week integer;
  _n integer;
  _up integer;
  _down integer;
  _rec record;
  _settled integer := 0;
  _new_tier text;
  _idx integer;
BEGIN
  FOR _old_week IN
    SELECT DISTINCT league_week FROM public.teams WHERE league_week < _week ORDER BY 1
  LOOP
    FOREACH _tier IN ARRAY _tiers LOOP
      SELECT count(*) INTO _n FROM public.teams WHERE league_week = _old_week AND tier = _tier;
      CONTINUE WHEN _n = 0;
      _up := ceil(_n * 0.35)::int;
      _down := floor(_n * 0.35)::int;
      IF _up + _down > _n THEN _down := _n - _up; END IF;
      _idx := array_position(_tiers, _tier);

      FOR _rec IN
        SELECT t.id,
               row_number() OVER (ORDER BY COALESCE(s.total, 0) DESC, t.created_at ASC) AS rank
        FROM public.teams t
        LEFT JOIN (
          SELECT team_id, sum(trophies) AS total
          FROM public.league_scores WHERE week = _old_week GROUP BY team_id
        ) s ON s.team_id = t.id
        WHERE t.league_week = _old_week AND t.tier = _tier
      LOOP
        _new_tier := _tier;
        IF _rec.rank <= _up AND _idx < array_length(_tiers, 1) THEN
          _new_tier := _tiers[_idx + 1];
        ELSIF _rec.rank > _n - _down AND _idx > 1 THEN
          _new_tier := _tiers[_idx - 1];
        END IF;

        IF _rec.rank <= 3 THEN
          INSERT INTO public.league_rewards (user_id, team_id, week, kind, amount, rarity, reason)
          SELECT m.user_id, _rec.id, _old_week, 'box', 5, 'ultra', 'top3'
          FROM public.team_members m WHERE m.team_id = _rec.id;
        ELSIF _new_tier <> _tier AND _rec.rank <= _up THEN
          INSERT INTO public.league_rewards (user_id, team_id, week, kind, amount, rarity, reason)
          SELECT m.user_id, _rec.id, _old_week, 'box', 5, NULL, 'promotion'
          FROM public.team_members m WHERE m.team_id = _rec.id;
        END IF;

        UPDATE public.teams SET tier = _new_tier, league_week = _week, updated_at = now()
        WHERE id = _rec.id;
        _settled := _settled + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  UPDATE public.teams SET league_week = _week WHERE league_week < _week;
  RETURN _settled;
END;
$$;