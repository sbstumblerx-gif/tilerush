CREATE TABLE public.community_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Kentta',
  size INT NOT NULL DEFAULT 5,
  moves INT NOT NULL DEFAULT 15,
  grid JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_levels TO authenticated;
GRANT ALL ON public.community_levels TO service_role;
ALTER TABLE public.community_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read community levels" ON public.community_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create own community level" ON public.community_levels FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Update own community level" ON public.community_levels FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Delete own community level" ON public.community_levels FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.community_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Paketti',
  level_codes TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_packs TO authenticated;
GRANT ALL ON public.community_packs TO service_role;
ALTER TABLE public.community_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read community packs" ON public.community_packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create own community pack" ON public.community_packs FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Update own community pack" ON public.community_packs FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Delete own community pack" ON public.community_packs FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TRIGGER community_packs_touch BEFORE UPDATE ON public.community_packs
FOR EACH ROW EXECUTE FUNCTION public.tr_touch_updated_at();

CREATE TABLE public.matchmaking_queue (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  match_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matchmaking_queue TO authenticated;
GRANT ALL ON public.matchmaking_queue TO service_role;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own queue entry" ON public.matchmaking_queue FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own queue entry" ON public.matchmaking_queue FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.matchmaking_join()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me UUID := auth.uid();
  _other UUID;
  _code TEXT;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  DELETE FROM public.matchmaking_queue WHERE created_at < now() - interval '45 seconds';

  SELECT user_id INTO _other
    FROM public.matchmaking_queue
    WHERE user_id <> _me AND match_code IS NULL
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

  IF _other IS NOT NULL THEN
    _code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    UPDATE public.matchmaking_queue SET match_code = _code WHERE user_id = _other;
    INSERT INTO public.matchmaking_queue (user_id, match_code) VALUES (_me, _code)
      ON CONFLICT (user_id) DO UPDATE SET match_code = _code, created_at = now();
    RETURN _code;
  END IF;

  INSERT INTO public.matchmaking_queue (user_id, match_code) VALUES (_me, NULL)
    ON CONFLICT (user_id) DO UPDATE SET match_code = NULL, created_at = now();
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.matchmaking_poll()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT match_code FROM public.matchmaking_queue WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.matchmaking_leave()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.matchmaking_queue WHERE user_id = auth.uid();
$$;