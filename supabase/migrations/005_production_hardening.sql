-- Production hardening and live-database repair.
-- Safe to run after migrations 001-004 on an existing project.

-- The application uses Ziina for paid enrollments. The original enum omitted
-- it, causing successful payment fulfillment to fail at the database layer.
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ziina';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'free';

ALTER TABLE payment_intents
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Repair the signup trigger. A broken/stale trigger currently aborts inserts
-- into auth.users with "Database error creating new user". Keep this trigger
-- deliberately failure-tolerant: the application registration endpoint also
-- creates/validates the profile and rolls back an unusable auth account.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user profile creation failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Repair the admin predicate with a fixed search path and fully-qualified
-- relation. This also replaces any malformed version from an early schema.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- RPCs use p_* argument names. Recreate them with explicit schema references
-- so server calls are atomic and independent of the caller's search_path.
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(
  p_coupon_id UUID,
  p_max_uses INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.coupons
  SET uses_count = uses_count + 1
  WHERE id = p_coupon_id
    AND is_active = TRUE
    AND (p_max_uses IS NULL OR uses_count < p_max_uses);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon limit reached or coupon inactive';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_event_count(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.events
  SET registered_count = registered_count + 1
  WHERE id = p_event_id
    AND (capacity IS NULL OR registered_count < capacity);
  IF NOT FOUND THEN RAISE EXCEPTION 'Event is at full capacity'; END IF;
END;
$$;
