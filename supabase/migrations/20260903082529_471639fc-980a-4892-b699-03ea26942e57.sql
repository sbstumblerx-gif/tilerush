-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- 2. One-time admin claim codes
CREATE TABLE public.admin_codes (
  code text PRIMARY KEY,
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_codes TO service_role;

ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;
-- No policies: reachable only through the security definer function below.

INSERT INTO public.admin_codes (code) VALUES ('xt92wq');

CREATE OR REPLACE FUNCTION public.claim_admin_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.admin_codes;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _row FROM public.admin_codes
    WHERE code = lower(trim(_code)) FOR UPDATE;

  IF _row.code IS NULL THEN RETURN false; END IF;

  IF _row.claimed_by IS NOT NULL AND _row.claimed_by <> _uid THEN
    RETURN false;
  END IF;

  UPDATE public.admin_codes
    SET claimed_by = _uid, claimed_at = COALESCE(claimed_at, now())
    WHERE code = _row.code;

  INSERT INTO public.user_roles (user_id, role)
    VALUES (_uid, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

  RETURN true;
END;
$$;

-- 3. Official flag + pack theme colour
ALTER TABLE public.community_levels
  ADD COLUMN official boolean NOT NULL DEFAULT false;

ALTER TABLE public.community_packs
  ADD COLUMN official boolean NOT NULL DEFAULT false,
  ADD COLUMN theme_rgb text NOT NULL DEFAULT '34,197,235';

-- Only admins may mark content official or modify official content.
CREATE OR REPLACE FUNCTION public.tr_guard_official()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.official AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'Vain admin voi luoda virallista sisältöä';
    END IF;
    RETURN NEW;
  END IF;

  IF (OLD.official OR NEW.official)
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Vain admin voi muokata virallista sisältöä';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_levels_guard_official
  BEFORE INSERT OR UPDATE ON public.community_levels
  FOR EACH ROW EXECUTE FUNCTION public.tr_guard_official();

CREATE TRIGGER community_packs_guard_official
  BEFORE INSERT OR UPDATE ON public.community_packs
  FOR EACH ROW EXECUTE FUNCTION public.tr_guard_official();

-- Admins can manage any official content (including other admins' rows).
CREATE POLICY "Admins manage official levels" ON public.community_levels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage official packs" ON public.community_packs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));