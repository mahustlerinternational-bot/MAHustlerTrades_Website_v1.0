-- Elite Vault: private member repository for downloadable tools and materials.

CREATE TABLE IF NOT EXISTS public.vault_folders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id     UUID REFERENCES public.vault_folders(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description   TEXT,
  icon          TEXT NOT NULL DEFAULT 'folder' CHECK (char_length(icon) BETWEEN 1 AND 40),
  sort_order    INT NOT NULL DEFAULT 0,
  is_published  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_folder_name_per_parent
  ON public.vault_folders (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::UUID), lower(name));
CREATE INDEX IF NOT EXISTS idx_vault_folders_parent_sort
  ON public.vault_folders(parent_id, sort_order, name);

CREATE TABLE IF NOT EXISTS public.vault_resources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id       UUID REFERENCES public.vault_folders(id) ON DELETE RESTRICT,
  resource_type   TEXT NOT NULL CHECK (resource_type IN ('file','link')),
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description     TEXT,
  storage_path    TEXT,
  external_url    TEXT,
  file_name       TEXT,
  mime_type       TEXT,
  file_size       BIGINT CHECK (file_size IS NULL OR file_size >= 0),
  version         TEXT,
  tags            TEXT[] NOT NULL DEFAULT '{}',
  sort_order      INT NOT NULL DEFAULT 0,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT FALSE,
  download_count  BIGINT NOT NULL DEFAULT 0 CHECK (download_count >= 0),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vault_resource_source CHECK (
    (resource_type='file' AND storage_path IS NOT NULL AND file_name IS NOT NULL AND external_url IS NULL)
    OR
    (resource_type='link' AND external_url IS NOT NULL AND storage_path IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_vault_resources_folder_sort
  ON public.vault_resources(folder_id, is_published, sort_order, title);
CREATE INDEX IF NOT EXISTS idx_vault_resources_featured
  ON public.vault_resources(is_featured, is_published, sort_order);

CREATE OR REPLACE FUNCTION public.set_vault_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vault_folders_updated ON public.vault_folders;
CREATE TRIGGER trg_vault_folders_updated
  BEFORE UPDATE ON public.vault_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_vault_updated_at();

DROP TRIGGER IF EXISTS trg_vault_resources_updated ON public.vault_resources;
CREATE TRIGGER trg_vault_resources_updated
  BEFORE UPDATE ON public.vault_resources
  FOR EACH ROW EXECUTE FUNCTION public.set_vault_updated_at();

CREATE OR REPLACE FUNCTION public.has_elite_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR ib_status = 'active'
        OR package_id IS NOT NULL
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.increment_vault_download(p_resource_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.vault_resources
  SET download_count = download_count + 1
  WHERE id = p_resource_id AND is_published = TRUE;
$$;

ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_resources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage vault folders" ON public.vault_folders;
CREATE POLICY "Admins manage vault folders"
  ON public.vault_folders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Elite members read vault folders" ON public.vault_folders;
CREATE POLICY "Elite members read vault folders"
  ON public.vault_folders FOR SELECT
  USING (is_published = TRUE AND public.has_elite_access());

DROP POLICY IF EXISTS "Admins manage vault resources" ON public.vault_resources;
CREATE POLICY "Admins manage vault resources"
  ON public.vault_resources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Elite members read vault resources" ON public.vault_resources;
CREATE POLICY "Elite members read vault resources"
  ON public.vault_resources FOR SELECT
  USING (is_published = TRUE AND public.has_elite_access());

-- The bucket itself is created by the application because Storage buckets are
-- not reliably provisioned by SQL migrations. These policies take effect as
-- soon as the private "elite-vault" bucket exists.
DROP POLICY IF EXISTS "Admins manage elite-vault files" ON storage.objects;
CREATE POLICY "Admins manage elite-vault files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'elite-vault' AND public.is_admin())
  WITH CHECK (bucket_id = 'elite-vault' AND public.is_admin());

DROP POLICY IF EXISTS "Elite members read elite-vault files" ON storage.objects;
CREATE POLICY "Elite members read elite-vault files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'elite-vault' AND public.has_elite_access());

