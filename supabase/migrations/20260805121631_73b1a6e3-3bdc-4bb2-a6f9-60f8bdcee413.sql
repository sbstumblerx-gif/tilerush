CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE DEFAULT lower(substr(md5((random())::text || (clock_timestamp())::text), 1, 6)),
  name TEXT NOT NULL DEFAULT 'Joukkue',
  description TEXT NOT NULL DEFAULT '',
  owner_id UUID NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id),
  UNIQUE (user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.team_messages TO authenticated;
GRANT ALL ON public.team_messages TO service_role;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  kind TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1,
  rarity TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.team_gifts TO authenticated;
GRANT ALL ON public.team_gifts TO service_role;
ALTER TABLE public.team_gifts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_team_member(_team UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.team_members WHERE team_id = _team AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(_team UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.teams WHERE id = _team AND owner_id = _user)
$$;

CREATE POLICY "Read teams" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create own team" ON public.teams FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner updates team" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner deletes team" ON public.teams FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE POLICY "Members read own team members" ON public.team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Join as self" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave or owner kicks" ON public.team_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "Members read messages" ON public.team_messages FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Members write messages" ON public.team_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Delete own message or owner" ON public.team_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_team_owner(team_id, auth.uid()));

CREATE POLICY "Members read gifts" ON public.team_gifts FOR SELECT TO authenticated
  USING (public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Members send gifts" ON public.team_gifts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user AND public.is_team_member(team_id, auth.uid()));
CREATE POLICY "Recipient claims gift" ON public.team_gifts FOR UPDATE TO authenticated
  USING (auth.uid() = to_user) WITH CHECK (auth.uid() = to_user);

CREATE OR REPLACE FUNCTION public.tr_team_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _count INT;
  _max INT;
BEGIN
  SELECT count(*) INTO _count FROM public.team_members WHERE team_id = NEW.team_id;
  SELECT max_members INTO _max FROM public.teams WHERE id = NEW.team_id;
  IF _count >= COALESCE(_max, 30) THEN
    RAISE EXCEPTION 'Joukkue on täynnä';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER team_member_limit BEFORE INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.tr_team_member_limit();

CREATE TRIGGER teams_touch BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.tr_touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_gifts;