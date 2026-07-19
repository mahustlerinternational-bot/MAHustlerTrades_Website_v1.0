-- Stable public-facing member identifiers.
-- Authentication continues to use the internal UUID; member_code is safe to
-- display in the portal and support/admin workflows.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS member_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_member_code_unique
  ON public.profiles(member_code)
  WHERE member_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_member_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate TEXT;
BEGIN
  LOOP
    SELECT 'MAHT_' || string_agg(substr(alphabet, floor(random() * length(alphabet))::INT + 1, 1), '')
      INTO candidate
      FROM generate_series(1, 8);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE member_code = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN member_code SET DEFAULT public.generate_member_code();

UPDATE public.profiles
SET member_code = public.generate_member_code()
WHERE member_code IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN member_code SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_member_code_format;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_member_code_format
  CHECK (member_code ~ '^MAHT_[A-HJ-NP-Z2-9]{8}$');

CREATE OR REPLACE FUNCTION public.protect_member_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.member_code IS DISTINCT FROM NEW.member_code THEN
    RAISE EXCEPTION 'Member ID cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_member_code ON public.profiles;
CREATE TRIGGER trg_protect_member_code
  BEFORE UPDATE OF member_code ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_member_code();
