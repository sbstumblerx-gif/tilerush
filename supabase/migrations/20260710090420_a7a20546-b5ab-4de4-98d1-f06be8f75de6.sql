
-- ============ profiles ============
CREATE TABLE public.profiles (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL DEFAULT 'Pelaaja',
  friend_code TEXT NOT NULL UNIQUE,
  avatar_team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Any signed-in user can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ friend_requests ============
CREATE TABLE public.friend_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_user, to_user),
  CHECK (from_user <> to_user)
);
GRANT SELECT, INSERT, DELETE ON public.friend_requests TO authenticated;
GRANT ALL ON public.friend_requests TO service_role;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own outgoing/incoming requests" ON public.friend_requests
  FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "Send request as self" ON public.friend_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);
CREATE POLICY "Cancel/reject own request" ON public.friend_requests
  FOR DELETE TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);

-- ============ friendships ============
CREATE TABLE public.friendships (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id <> friend_id)
);
GRANT SELECT, INSERT, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own friendships" ON public.friendships
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Insert own friendship row" ON public.friendships
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Delete own friendship" ON public.friendships
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Accept helper: creates both directional rows and deletes the pending request atomically.
CREATE OR REPLACE FUNCTION public.accept_friend_request(_request_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from UUID;
  _to UUID;
BEGIN
  SELECT from_user, to_user INTO _from, _to
    FROM public.friend_requests WHERE id = _request_id;
  IF _to IS NULL OR _to <> auth.uid() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (_from, _to)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.friendships (user_id, friend_id) VALUES (_to, _from)
    ON CONFLICT DO NOTHING;
  DELETE FROM public.friend_requests WHERE id = _request_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(UUID) TO authenticated;

-- Send request by friend code (validates target).
CREATE OR REPLACE FUNCTION public.send_friend_request_by_code(_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target UUID;
  _req_id UUID;
BEGIN
  SELECT user_id INTO _target FROM public.profiles WHERE friend_code = lower(_code);
  IF _target IS NULL THEN RAISE EXCEPTION 'Kaverikoodia ei löytynyt'; END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'Et voi lisätä itseäsi'; END IF;
  IF EXISTS(SELECT 1 FROM public.friendships WHERE user_id = auth.uid() AND friend_id = _target) THEN
    RAISE EXCEPTION 'Olette jo kavereita';
  END IF;
  -- If reverse request exists, accept it instead
  IF EXISTS(SELECT 1 FROM public.friend_requests WHERE from_user = _target AND to_user = auth.uid()) THEN
    INSERT INTO public.friendships (user_id, friend_id) VALUES (auth.uid(), _target) ON CONFLICT DO NOTHING;
    INSERT INTO public.friendships (user_id, friend_id) VALUES (_target, auth.uid()) ON CONFLICT DO NOTHING;
    DELETE FROM public.friend_requests WHERE from_user = _target AND to_user = auth.uid();
    RETURN NULL;
  END IF;
  INSERT INTO public.friend_requests (from_user, to_user) VALUES (auth.uid(), _target)
    ON CONFLICT (from_user, to_user) DO NOTHING
    RETURNING id INTO _req_id;
  RETURN _req_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_friend_request_by_code(TEXT) TO authenticated;

-- ============ parties ============
CREATE TABLE public.parties (
  code TEXT NOT NULL PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rounds INT NOT NULL DEFAULT 5,
  packs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'lobby',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parties TO authenticated;
GRANT ALL ON public.parties TO service_role;
ALTER TABLE public.parties ENABLE ROW LEVEL SECURITY;
-- Anyone signed-in can read a party (needed to join by code).
CREATE POLICY "Read parties" ON public.parties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Host creates party" ON public.parties FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host updates party" ON public.parties FOR UPDATE TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host deletes party" ON public.parties FOR DELETE TO authenticated USING (auth.uid() = host_id);

-- ============ party_members ============
CREATE TABLE public.party_members (
  party_code TEXT NOT NULL REFERENCES public.parties(code) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (party_code, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.party_members TO authenticated;
GRANT ALL ON public.party_members TO service_role;
ALTER TABLE public.party_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read party members" ON public.party_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Join as self" ON public.party_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Leave own membership" ON public.party_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.parties p WHERE p.code = party_code AND p.host_id = auth.uid()));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tr_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tr_touch_updated_at();
CREATE TRIGGER parties_touch BEFORE UPDATE ON public.parties FOR EACH ROW EXECUTE FUNCTION public.tr_touch_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.parties;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_members;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code TEXT;
  _tries INT := 0;
BEGIN
  LOOP
    _code := lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.profiles WHERE friend_code = _code);
    _tries := _tries + 1;
    IF _tries > 8 THEN EXIT; END IF;
  END LOOP;
  INSERT INTO public.profiles (user_id, username, friend_code)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Pelaaja'), _code)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
