export type VaultResourceType = 'file' | 'link';

export interface VaultFolder {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultResource {
  id: string;
  folder_id: string | null;
  resource_type: VaultResourceType;
  title: string;
  description: string | null;
  storage_path?: string | null;
  external_url?: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  version: string | null;
  tags: string[];
  sort_order: number;
  is_featured: boolean;
  is_published: boolean;
  download_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VaultPayload {
  folders: VaultFolder[];
  resources: VaultResource[];
  access: 'admin' | 'elite';
}

