-- Migration 004: Storage RLS policies + missing profiles INSERT policy
--
-- The 'course-assets' and 'avatars' Storage buckets were created (via the
-- /api/admin/setup-storage route) but Supabase Storage enables Row Level
-- Security on storage.objects by default, with NO policies attached to a
-- freshly-created bucket. Without explicit policies, every upload is
-- rejected with "new row violates row-level security policy" — exactly
-- the error seen when uploading a course logo/cover image.

-- ── course-assets bucket ────────────────────────────────────────────────
-- Admins can upload/update/delete. Anyone (including anonymous visitors)
-- can read, since course logos/covers are shown on public marketing pages.
CREATE POLICY "Admins manage course-assets"
  ON storage.objects FOR ALL
  USING (bucket_id = 'course-assets' AND is_admin())
  WITH CHECK (bucket_id = 'course-assets' AND is_admin());

CREATE POLICY "Public read course-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'course-assets');

-- ── avatars bucket ──────────────────────────────────────────────────────
-- Any authenticated member can upload/update only their OWN avatar
-- (path convention: avatars/<user_id>.<ext> — enforced by matching the
-- first path segment after the bucket to the user's own id).
CREATE POLICY "Users manage own avatar"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '.', 1))
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '.', 1));

CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Admins can manage any avatar too (e.g. moderation).
CREATE POLICY "Admins manage avatars"
  ON storage.objects FOR ALL
  USING (bucket_id = 'avatars' AND is_admin())
  WITH CHECK (bucket_id = 'avatars' AND is_admin());

-- ── profiles: missing INSERT policy ─────────────────────────────────────
-- Defense in depth. The actual registration flow uses the service-role
-- key (which bypasses RLS entirely), so this isn't the cause of the
-- "Database error creating new user" issue — but a user-facing INSERT
-- policy should still exist so a regular authenticated client could,
-- in principle, create their own profile row matching their own auth uid.
CREATE POLICY "Users insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
