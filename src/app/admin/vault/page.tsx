'use client';

import {
  Archive,
  BookOpen,
  Box,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileCode2,
  Folder,
  FolderOpen,
  FolderPlus,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';
import {FormEvent, useCallback, useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

import {supabase} from '@/lib/supabase/client';
import {authFetch} from '@/lib/utils/authFetch';
import type {VaultFolder, VaultResource, VaultResourceType} from '@/types/vault';

type FolderDraft = {
  id?: string;
  parent_id: string;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_published: boolean;
};

type ResourceDraft = {
  id?: string;
  original_type?: VaultResourceType;
  folder_id: string;
  resource_type: VaultResourceType;
  title: string;
  description: string;
  external_url: string;
  version: string;
  tags: string;
  sort_order: number;
  is_featured: boolean;
  is_published: boolean;
  file_name?: string | null;
};

const EMPTY_FOLDER: FolderDraft = {
  parent_id: '',
  name: '',
  description: '',
  icon: 'folder',
  sort_order: 0,
  is_published: false,
};

const EMPTY_RESOURCE: ResourceDraft = {
  folder_id: '',
  resource_type: 'file',
  title: '',
  description: '',
  external_url: '',
  version: '',
  tags: '',
  sort_order: 0,
  is_featured: false,
  is_published: false,
};

const ICONS: Record<string, string> = {
  folder: '📁',
  tools: '🧰',
  code: '💻',
  book: '📘',
  archive: '🗄️',
  chart: '📊',
  shield: '🛡️',
};

export default function AdminEliteVaultPage() {
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [resources, setResources] = useState<VaultResource[]>([]);
  const [selected, setSelected] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [folderResponse, resourceResponse] = await Promise.all([
        authFetch('/api/admin/vault/folders'),
        authFetch('/api/admin/vault/resources'),
      ]);
      const [folderData, resourceData] = await Promise.all([
        folderResponse.json(),
        resourceResponse.json(),
      ]);
      if (!folderResponse.ok) throw new Error(folderData.error ?? 'Folders could not be loaded');
      if (!resourceResponse.ok) throw new Error(resourceData.error ?? 'Resources could not be loaded');
      setFolders(Array.isArray(folderData) ? folderData : []);
      setResources(Array.isArray(resourceData) ? resourceData : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Elite Vault could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const descendants = useMemo(() => {
    const ids = new Set<string>();
    if (selected === 'all' || selected === 'root') return ids;
    const visit = (parentId: string) => {
      for (const folder of folders.filter(item => item.parent_id === parentId)) {
        ids.add(folder.id);
        visit(folder.id);
      }
    };
    visit(selected);
    return ids;
  }, [folders, selected]);

  const filtered = resources.filter(resource => {
    const inFolder =
      selected === 'all' ||
      (selected === 'root' && !resource.folder_id) ||
      resource.folder_id === selected ||
      Boolean(resource.folder_id && descendants.has(resource.folder_id));
    const needle = search.trim().toLowerCase();
    const matches =
      !needle ||
      resource.title.toLowerCase().includes(needle) ||
      (resource.description ?? '').toLowerCase().includes(needle) ||
      (resource.tags ?? []).some(tag => tag.toLowerCase().includes(needle)) ||
      (resource.file_name ?? '').toLowerCase().includes(needle);
    return inFolder && matches;
  });

  const currentFolder = folders.find(folder => folder.id === selected) ?? null;
  const publishedResources = resources.filter(resource => resource.is_published).length;
  const totalBytes = resources.reduce((total, resource) => total + Number(resource.file_size ?? 0), 0);

  function editFolder(folder: VaultFolder) {
    setFolderDraft({
      id: folder.id,
      parent_id: folder.parent_id ?? '',
      name: folder.name,
      description: folder.description ?? '',
      icon: folder.icon,
      sort_order: folder.sort_order,
      is_published: folder.is_published,
    });
  }

  function editResource(resource: VaultResource) {
    setResourceDraft({
      id: resource.id,
      original_type: resource.resource_type,
      folder_id: resource.folder_id ?? '',
      resource_type: resource.resource_type,
      title: resource.title,
      description: resource.description ?? '',
      external_url: resource.external_url ?? '',
      version: resource.version ?? '',
      tags: (resource.tags ?? []).join(', '),
      sort_order: resource.sort_order,
      is_featured: resource.is_featured,
      is_published: resource.is_published,
      file_name: resource.file_name,
    });
  }

  async function removeFolder(folder: VaultFolder) {
    if (!confirm(`Delete folder “${folder.name}”? Empty folders only can be deleted.`)) return;
    const response = await authFetch(`/api/admin/vault/folders?id=${encodeURIComponent(folder.id)}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? 'Folder could not be deleted');
    if (selected === folder.id) setSelected('all');
    toast.success('Folder deleted');
    await load();
  }

  async function removeResource(resource: VaultResource) {
    if (!confirm(`Delete “${resource.title}” permanently?${resource.resource_type === 'file' ? ' Its stored file will also be removed.' : ''}`)) return;
    const response = await authFetch(`/api/admin/vault/resources?id=${encodeURIComponent(resource.id)}`, {
      method: 'DELETE',
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? 'Resource could not be deleted');
    toast.success('Resource deleted');
    await load();
  }

  async function toggleResource(resource: VaultResource, field: 'is_published' | 'is_featured') {
    const response = await authFetch('/api/admin/vault/resources', {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({id: resource.id, [field]: !resource[field]}),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error ?? 'Resource could not be updated');
    toast.success(field === 'is_published'
      ? result.is_published ? 'Resource published' : 'Resource hidden'
      : result.is_featured ? 'Resource featured' : 'Removed from featured');
    await load();
  }

  return (
    <div style={page}>
      <style>{`
        @keyframes vaultFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes vaultSpin{to{transform:rotate(360deg)}}
        .vault-resource:hover{border-color:rgba(212,175,55,.28)!important;background:#131313!important}
        .vault-folder-row:hover{background:rgba(255,255,255,.035)!important}
        .vault-folder-row .vault-folder-actions{opacity:0}
        .vault-folder-row:hover .vault-folder-actions{opacity:1}
        @media(max-width:1050px){.vault-admin-shell{grid-template-columns:1fr!important}.vault-admin-tree{max-height:360px}.vault-admin-stats{grid-template-columns:repeat(2,1fr)!important}}
      `}</style>

      <header style={header}>
        <div>
          <p style={eyebrow}>PRIVATE MEMBER REPOSITORY</p>
          <h1 style={title}>Elite Vault</h1>
          <p style={subtitle}>Organize, publish and securely distribute official tools, downloads and member materials.</p>
        </div>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <button
            onClick={() => setFolderDraft({...EMPTY_FOLDER, parent_id: currentFolder?.id ?? ''})}
            style={outlineButton}
          >
            <FolderPlus size={14} /> New Folder
          </button>
          <button
            onClick={() => setResourceDraft({...EMPTY_RESOURCE, folder_id: currentFolder?.id ?? ''})}
            style={goldButton}
          >
            <Plus size={14} /> Add Resource
          </button>
        </div>
      </header>

      <section className="vault-admin-stats" style={statsGrid}>
        <Stat icon={<FolderOpen size={19} />} label="Folders" value={String(folders.length)} color="#D4AF37" />
        <Stat icon={<Box size={19} />} label="Resources" value={String(resources.length)} color="#60A5FA" />
        <Stat icon={<ShieldCheck size={19} />} label="Published" value={String(publishedResources)} color="#34D399" />
        <Stat icon={<Archive size={19} />} label="Stored Files" value={formatBytes(totalBytes)} color="#A78BFA" />
      </section>

      <div className="vault-admin-shell" style={shell}>
        <aside className="vault-admin-tree" style={treePanel}>
          <div style={panelHeader}>
            <div>
              <p style={panelLabel}>FOLDER DIRECTORY</p>
              <p style={panelHint}>Nested folders are supported</p>
            </div>
          </div>
          <div style={{padding: '8px'}}>
            <DirectoryButton
              active={selected === 'all'}
              label="All Resources"
              count={resources.length}
              icon={<Archive size={14} />}
              onClick={() => setSelected('all')}
            />
            <DirectoryButton
              active={selected === 'root'}
              label="Unfiled"
              count={resources.filter(resource => !resource.folder_id).length}
              icon={<File size={14} />}
              onClick={() => setSelected('root')}
            />
            <div style={{height: '1px', background: 'rgba(255,255,255,.05)', margin: '8px 6px'}} />
            {folders.filter(folder => !folder.parent_id).map(folder => (
              <FolderTreeRow
                key={folder.id}
                folder={folder}
                folders={folders}
                resources={resources}
                selected={selected}
                depth={0}
                onSelect={setSelected}
                onEdit={editFolder}
                onDelete={removeFolder}
              />
            ))}
            {!loading && folders.length === 0 && (
              <div style={emptyTree}>
                <Folder size={22} />
                <span>No folders yet</span>
              </div>
            )}
          </div>
        </aside>

        <main style={contentPanel}>
          <div style={contentHeader}>
            <div style={{minWidth: 0}}>
              <p style={panelLabel}>
                {selected === 'all' ? 'ALL RESOURCES' : selected === 'root' ? 'UNFILED RESOURCES' : 'CURRENT FOLDER'}
              </p>
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '5px'}}>
                <h2 style={contentTitle}>{currentFolder?.name ?? (selected === 'root' ? 'Unfiled' : 'Vault Library')}</h2>
                {currentFolder && (
                  <span style={currentFolder.is_published ? liveBadge : draftBadge}>
                    {currentFolder.is_published ? 'Published' : 'Draft'}
                  </span>
                )}
              </div>
              {currentFolder?.description && <p style={folderDescription}>{currentFolder.description}</p>}
            </div>
            <div style={searchWrap}>
              <Search size={14} color="#666" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search Vault..."
                style={searchInput}
              />
            </div>
          </div>

          {loading ? (
            <div style={emptyState}><Loader2 size={27} color="#D4AF37" style={{animation: 'vaultSpin .8s linear infinite'}} /><span>Loading Vault...</span></div>
          ) : filtered.length === 0 ? (
            <div style={emptyState}>
              <Archive size={34} color="#555" />
              <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '.9rem'}}>No Resources Here</h3>
              <p style={{fontSize: '.68rem', color: '#666'}}>Add a downloadable file or an external resource link.</p>
            </div>
          ) : (
            <div style={{display: 'grid', gap: '8px', padding: '12px'}}>
              {filtered.map(resource => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  folder={folders.find(folder => folder.id === resource.folder_id) ?? null}
                  onEdit={() => editResource(resource)}
                  onDelete={() => void removeResource(resource)}
                  onTogglePublished={() => void toggleResource(resource, 'is_published')}
                  onToggleFeatured={() => void toggleResource(resource, 'is_featured')}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {folderDraft && (
        <FolderModal
          draft={folderDraft}
          folders={folders}
          onChange={setFolderDraft}
          onClose={() => setFolderDraft(null)}
          onSaved={async () => {
            setFolderDraft(null);
            await load();
          }}
        />
      )}

      {resourceDraft && (
        <ResourceModal
          draft={resourceDraft}
          folders={folders}
          onChange={setResourceDraft}
          onClose={() => setResourceDraft(null)}
          onSaved={async () => {
            setResourceDraft(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function Stat({icon, label, value, color}: {icon: React.ReactNode; label: string; value: string; color: string}) {
  return (
    <div style={statCard}>
      <span style={{color}}>{icon}</span>
      <div>
        <p style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem', color}}>{value}</p>
        <p style={{fontSize: '.54rem', letterSpacing: '1.8px', color: '#666'}}>{label.toUpperCase()}</p>
      </div>
    </div>
  );
}

function DirectoryButton({
  active,
  label,
  count,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{...directoryButton, ...(active ? activeDirectory : {})}}>
      {icon}
      <span style={{flex: 1, textAlign: 'left'}}>{label}</span>
      <span style={countPill}>{count}</span>
    </button>
  );
}

function FolderTreeRow({
  folder,
  folders,
  resources,
  selected,
  depth,
  onSelect,
  onEdit,
  onDelete,
}: {
  folder: VaultFolder;
  folders: VaultFolder[];
  resources: VaultResource[];
  selected: string;
  depth: number;
  onSelect: (id: string) => void;
  onEdit: (folder: VaultFolder) => void;
  onDelete: (folder: VaultFolder) => void;
}) {
  const children = folders.filter(item => item.parent_id === folder.id);
  return (
    <>
      <div
        className="vault-folder-row"
        style={{
          ...folderTreeRow,
          paddingLeft: `${10 + depth * 15}px`,
          background: selected === folder.id ? 'rgba(212,175,55,.08)' : 'transparent',
          color: selected === folder.id ? '#D4AF37' : '#888',
          borderLeftColor: selected === folder.id ? '#D4AF37' : 'transparent',
        }}
      >
        <button onClick={() => onSelect(folder.id)} style={folderSelectButton}>
          <span>{ICONS[folder.icon] ?? '📁'}</span>
          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{folder.name}</span>
          {!folder.is_published && <span title="Draft" style={{color: '#555'}}>●</span>}
        </button>
        <span style={countPill}>{resources.filter(resource => resource.folder_id === folder.id).length}</span>
        <div className="vault-folder-actions" style={{display: 'flex'}}>
          <button onClick={() => onEdit(folder)} style={treeAction} title="Edit folder"><Pencil size={11} /></button>
          <button onClick={() => onDelete(folder)} style={{...treeAction, color: '#FF6B78'}} title="Delete folder"><Trash2 size={11} /></button>
        </div>
      </div>
      {children.map(child => (
        <FolderTreeRow
          key={child.id}
          folder={child}
          folders={folders}
          resources={resources}
          selected={selected}
          depth={depth + 1}
          onSelect={onSelect}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function ResourceRow({
  resource,
  folder,
  onEdit,
  onDelete,
  onTogglePublished,
  onToggleFeatured,
}: {
  resource: VaultResource;
  folder: VaultFolder | null;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <article className="vault-resource" style={resourceRow}>
      <div style={resourceIcon}>
        {resource.resource_type === 'link' ? <Link2 size={19} /> : iconForMime(resource.mime_type)}
      </div>
      <div style={{minWidth: 0, flex: 1}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap'}}>
          <h3 style={resourceTitle}>{resource.title}</h3>
          {resource.version && <span style={versionBadge}>v{resource.version.replace(/^v/i, '')}</span>}
          {resource.is_featured && <span style={featuredBadge}><Star size={9} /> Featured</span>}
          <span style={resource.is_published ? liveBadge : draftBadge}>
            {resource.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
        <p style={resourceMeta}>
          {folder?.name ?? 'Unfiled'} · {resource.resource_type === 'file'
            ? `${resource.file_name ?? 'File'} · ${formatBytes(resource.file_size ?? 0)}`
            : 'External link'} · {resource.download_count} access{resource.download_count === 1 ? '' : 'es'}
        </p>
        {resource.description && <p style={resourceDescription}>{resource.description}</p>}
        {(resource.tags ?? []).length > 0 && (
          <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px'}}>
            {resource.tags.map(tag => <span key={tag} style={tagBadge}>{tag}</span>)}
          </div>
        )}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
        {resource.is_published && (
          <a
            href={`/api/me/vault/resources/${resource.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            style={{...rowButton, textDecoration: 'none'}}
            title={resource.resource_type === 'file' ? 'Test download' : 'Open link'}
          >
            {resource.resource_type === 'file' ? <Download size={12} /> : <ExternalLink size={12} />}
          </a>
        )}
        <button onClick={onToggleFeatured} style={{...rowButton, color: resource.is_featured ? '#D4AF37' : '#777'}} title="Toggle featured"><Star size={12} /></button>
        <button onClick={onTogglePublished} style={{...rowButton, color: resource.is_published ? '#34D399' : '#777'}} title="Toggle published"><ShieldCheck size={12} /></button>
        <button onClick={onEdit} style={rowButton} title="Edit"><Pencil size={12} /></button>
        <button onClick={onDelete} style={{...rowButton, color: '#FF6B78'}} title="Delete"><Trash2 size={12} /></button>
      </div>
    </article>
  );
}

function FolderModal({
  draft,
  folders,
  onChange,
  onClose,
  onSaved,
}: {
  draft: FolderDraft;
  folders: VaultFolder[];
  onChange: (draft: FolderDraft) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await authFetch('/api/admin/vault/folders', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...draft, parent_id: draft.parent_id || null}),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error ?? 'Folder could not be saved');
      toast.success(draft.id ? 'Folder updated' : 'Folder created');
      onSaved();
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal title={draft.id ? 'Edit Vault Folder' : 'Create Vault Folder'} onClose={onClose}>
      <form onSubmit={submit} style={{display: 'grid', gap: '13px'}}>
        <Field label="Folder name">
          <input required value={draft.name} onChange={event => onChange({...draft, name: event.target.value})} style={input} placeholder="Trading Tools" />
        </Field>
        <Field label="Description">
          <textarea value={draft.description} onChange={event => onChange({...draft, description: event.target.value})} style={{...input, minHeight: '82px', resize: 'vertical'}} placeholder="What members will find in this folder" />
        </Field>
        <div style={twoColumns}>
          <Field label="Parent folder">
            <select value={draft.parent_id} onChange={event => onChange({...draft, parent_id: event.target.value})} style={input}>
              <option value="">Vault root</option>
              {folderOptions(folders, draft.id).map(folder => (
                <option key={folder.id} value={folder.id}>{folder.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Folder icon">
            <select value={draft.icon} onChange={event => onChange({...draft, icon: event.target.value})} style={input}>
              {Object.entries(ICONS).map(([value, icon]) => <option key={value} value={value}>{icon} {value}</option>)}
            </select>
          </Field>
        </div>
        <div style={twoColumns}>
          <Field label="Display order">
            <input type="number" value={draft.sort_order} onChange={event => onChange({...draft, sort_order: Number(event.target.value)})} style={input} />
          </Field>
          <CheckField
            label="Published to members"
            checked={draft.is_published}
            onChange={checked => onChange({...draft, is_published: checked})}
          />
        </div>
        <ModalFooter saving={saving} onClose={onClose} label={draft.id ? 'Save Folder' : 'Create Folder'} />
      </form>
    </Modal>
  );
}

function ResourceModal({
  draft,
  folders,
  onChange,
  onClose,
  onSaved,
}: {
  draft: ResourceDraft;
  folders: VaultFolder[];
  onChange: (draft: ResourceDraft) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const needsFile =
      draft.resource_type === 'file' &&
      (!draft.id || draft.original_type !== 'file');
    if (needsFile && !file) {
      toast.error('Choose the file to upload');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        ...(draft.id ? {id: draft.id} : {}),
        folder_id: draft.folder_id || null,
        title: draft.title,
        description: draft.description,
        version: draft.version,
        tags: draft.tags,
        sort_order: draft.sort_order,
        is_featured: draft.is_featured,
        is_published: draft.is_published,
      };
      if (!draft.id || draft.resource_type !== draft.original_type || file || draft.resource_type === 'link') {
        payload.resource_type = draft.resource_type;
      }
      if (draft.resource_type === 'link') {
        payload.external_url = draft.external_url;
      }
      if (file) {
        const preparedResponse = await authFetch('/api/admin/vault/upload', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            file_name: file.name,
            file_size: file.size,
            content_type: file.type || 'application/octet-stream',
          }),
        });
        const prepared = await preparedResponse.json();
        if (!preparedResponse.ok) throw new Error(prepared.error ?? 'Upload could not be prepared');
        const {error: uploadError} = await supabase.storage
          .from(prepared.bucket)
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type || 'application/octet-stream',
          });
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        Object.assign(payload, {
          resource_type: 'file',
          storage_path: prepared.path,
          file_name: prepared.file_name,
          file_size: prepared.file_size,
          mime_type: prepared.mime_type,
        });
      }
      const response = await authFetch('/api/admin/vault/resources', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Resource could not be saved');
      toast.success(draft.id ? 'Vault resource updated' : 'Vault resource created');
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Resource could not be saved');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={draft.id ? 'Edit Vault Resource' : 'Add Vault Resource'} onClose={onClose} wide>
      <form onSubmit={submit} style={{display: 'grid', gap: '13px'}}>
        <div style={typeTabs}>
          {(['file', 'link'] as const).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setFile(null);
                onChange({...draft, resource_type: type});
              }}
              style={{...typeTab, ...(draft.resource_type === type ? activeTypeTab : {})}}
            >
              {type === 'file' ? <UploadCloud size={15} /> : <Link2 size={15} />}
              {type === 'file' ? 'Downloadable File' : 'External Resource Link'}
            </button>
          ))}
        </div>

        <div style={twoColumns}>
          <Field label="Resource title">
            <input required value={draft.title} onChange={event => onChange({...draft, title: event.target.value})} style={input} placeholder="Quant Toolkit" />
          </Field>
          <Field label="Vault folder">
            <select value={draft.folder_id} onChange={event => onChange({...draft, folder_id: event.target.value})} style={input}>
              <option value="">Unfiled / Vault root</option>
              {folderOptions(folders).map(folder => <option key={folder.id} value={folder.id}>{folder.label}</option>)}
            </select>
          </Field>
        </div>

        {draft.resource_type === 'file' ? (
          <div style={uploadPanel}>
            <UploadCloud size={23} color="#D4AF37" />
            <div style={{flex: 1}}>
              <p style={{fontSize: '.66rem', color: '#DDD'}}>
                {file?.name ?? draft.file_name ?? 'Choose a file for secure Vault storage'}
              </p>
              <p style={{fontSize: '.55rem', color: '#666', marginTop: '4px'}}>
                Maximum 50 MB. Files stay private and are delivered through authenticated, expiring links.
              </p>
            </div>
            <label style={uploadButton}>
              <UploadCloud size={13} /> {file || draft.file_name ? 'Replace File' : 'Choose File'}
              <input
                type="file"
                hidden
                onChange={event => {
                  const selected = event.target.files?.[0] ?? null;
                  if (selected && selected.size > 50 * 1024 * 1024) {
                    toast.error('Vault files must be 50 MB or smaller');
                    event.target.value = '';
                    return;
                  }
                  setFile(selected);
                  if (selected && !draft.title) {
                    onChange({...draft, title: selected.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')});
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <Field label="External HTTPS link">
            <input required type="url" value={draft.external_url} onChange={event => onChange({...draft, external_url: event.target.value})} style={input} placeholder="https://drive.google.com/..." />
          </Field>
        )}

        <Field label="Description">
          <textarea value={draft.description} onChange={event => onChange({...draft, description: event.target.value})} style={{...input, minHeight: '88px', resize: 'vertical'}} placeholder="Explain what this resource contains and how members should use it." />
        </Field>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1.6fr .6fr', gap: '11px'}}>
          <Field label="Version">
            <input value={draft.version} onChange={event => onChange({...draft, version: event.target.value})} style={input} placeholder="3.0" />
          </Field>
          <Field label="Tags (comma separated)">
            <input value={draft.tags} onChange={event => onChange({...draft, tags: event.target.value})} style={input} placeholder="XAUUSD, MT5, Risk" />
          </Field>
          <Field label="Order">
            <input type="number" value={draft.sort_order} onChange={event => onChange({...draft, sort_order: Number(event.target.value)})} style={input} />
          </Field>
        </div>

        <div style={{display: 'flex', gap: '22px', flexWrap: 'wrap'}}>
          <CheckField label="Published to members" checked={draft.is_published} onChange={checked => onChange({...draft, is_published: checked})} />
          <CheckField label="Featured resource" checked={draft.is_featured} onChange={checked => onChange({...draft, is_featured: checked})} />
        </div>

        <ModalFooter saving={saving} onClose={onClose} label={draft.id ? 'Save Resource' : 'Add to Vault'} />
      </form>
    </Modal>
  );
}

function Modal({title, onClose, wide = false, children}: {title: string; onClose: () => void; wide?: boolean; children: React.ReactNode}) {
  return (
    <div style={modalOverlay} onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section style={{...modal, maxWidth: wide ? '820px' : '580px'}}>
        <header style={modalHeader}>
          <div>
            <p style={eyebrow}>ELITE VAULT ADMIN</p>
            <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '5px'}}>{title}</h2>
          </div>
          <button onClick={onClose} style={closeButton}><X size={16} /></button>
        </header>
        <div style={{padding: '18px'}}>{children}</div>
      </section>
    </div>
  );
}

function ModalFooter({saving, onClose, label}: {saving: boolean; onClose: () => void; label: string}) {
  return (
    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '14px', marginTop: '4px'}}>
      <button type="button" onClick={onClose} style={outlineButton}>Cancel</button>
      <button disabled={saving} style={{...goldButton, opacity: saving ? 0.6 : 1}}>
        {saving ? <Loader2 size={14} style={{animation: 'vaultSpin .8s linear infinite'}} /> : <ShieldCheck size={14} />}
        {saving ? 'Saving...' : label}
      </button>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label style={fieldLabel}>{label}<div style={{marginTop: '6px'}}>{children}</div></label>;
}

function CheckField({label, checked, onChange}: {label: string; checked: boolean; onChange: (checked: boolean) => void}) {
  return (
    <label style={checkLabel}>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} style={{accentColor: '#D4AF37'}} />
      {label}
    </label>
  );
}

function folderOptions(folders: VaultFolder[], excludedId?: string) {
  const result: Array<{id: string; label: string}> = [];
  const excluded = new Set<string>();
  if (excludedId) {
    excluded.add(excludedId);
    const visit = (id: string) => folders.filter(folder => folder.parent_id === id).forEach(folder => {
      excluded.add(folder.id);
      visit(folder.id);
    });
    visit(excludedId);
  }
  const visit = (parentId: string | null, depth: number) => {
    folders
      .filter(folder => folder.parent_id === parentId && !excluded.has(folder.id))
      .forEach(folder => {
        result.push({id: folder.id, label: `${'— '.repeat(depth)}${folder.name}`});
        visit(folder.id, depth + 1);
      });
  };
  visit(null, 0);
  return result;
}

function iconForMime(mime: string | null) {
  if (mime?.includes('zip') || mime?.includes('rar') || mime?.includes('compressed')) return <Archive size={19} />;
  if (mime?.includes('pdf') || mime?.includes('document')) return <BookOpen size={19} />;
  if (mime?.includes('text') || mime?.includes('json') || mime?.includes('javascript')) return <FileCode2 size={19} />;
  if (mime?.includes('application/octet-stream')) return <Wrench size={19} />;
  return <File size={19} />;
}

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const page: React.CSSProperties = {padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Montserrat,sans-serif'};
const header: React.CSSProperties = {display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', marginBottom: '1.5rem', animation: 'vaultFade .45s ease'};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '4px', color: '#D4AF37'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '2rem', fontWeight: 900, marginTop: '7px'};
const subtitle: React.CSSProperties = {fontSize: '.7rem', color: '#666', marginTop: '7px', lineHeight: 1.6, maxWidth: '680px'};
const statsGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '9px', marginBottom: '14px'};
const statCard: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '11px', background: '#111', border: '1px solid rgba(255,255,255,.065)', padding: '13px 15px'};
const shell: React.CSSProperties = {display: 'grid', gridTemplateColumns: '285px minmax(0,1fr)', gap: '12px', alignItems: 'start'};
const treePanel: React.CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.065)', minHeight: '580px', overflowY: 'auto'};
const contentPanel: React.CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.065)', minHeight: '580px'};
const panelHeader: React.CSSProperties = {padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const panelLabel: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.55rem', letterSpacing: '2.5px', color: '#D4AF37'};
const panelHint: React.CSSProperties = {fontSize: '.55rem', color: '#555', marginTop: '4px'};
const directoryButton: React.CSSProperties = {width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', background: 'transparent', border: 0, borderLeft: '2px solid transparent', color: '#777', fontSize: '.68rem', cursor: 'pointer'};
const activeDirectory: React.CSSProperties = {background: 'rgba(212,175,55,.08)', color: '#D4AF37', borderLeftColor: '#D4AF37'};
const countPill: React.CSSProperties = {fontSize: '.5rem', minWidth: '18px', padding: '2px 5px', textAlign: 'center', background: 'rgba(255,255,255,.055)', color: '#666', borderRadius: '10px'};
const folderTreeRow: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '4px', minHeight: '34px', borderLeft: '2px solid transparent', transition: 'background .15s'};
const folderSelectButton: React.CSSProperties = {minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 0, color: 'inherit', fontSize: '.67rem', cursor: 'pointer', padding: '7px 2px'};
const treeAction: React.CSSProperties = {width: '23px', height: '23px', display: 'grid', placeItems: 'center', background: 'none', border: 0, color: '#777', cursor: 'pointer'};
const emptyTree: React.CSSProperties = {display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', padding: '25px', color: '#555', fontSize: '.63rem'};
const contentHeader: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap', padding: '15px 17px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const contentTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'};
const folderDescription: React.CSSProperties = {fontSize: '.6rem', color: '#666', marginTop: '5px', maxWidth: '620px'};
const searchWrap: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', width: '260px', background: '#080808', border: '1px solid rgba(255,255,255,.08)', padding: '8px 10px'};
const searchInput: React.CSSProperties = {flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 0, color: '#fff', fontSize: '.67rem'};
const emptyState: React.CSSProperties = {minHeight: '430px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '9px', color: '#666'};
const resourceRow: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '12px', padding: '13px', background: '#0C0C0C', border: '1px solid rgba(255,255,255,.06)', transition: 'all .18s'};
const resourceIcon: React.CSSProperties = {width: '42px', height: '42px', flexShrink: 0, display: 'grid', placeItems: 'center', color: '#D4AF37', background: 'rgba(212,175,55,.06)', border: '1px solid rgba(212,175,55,.14)'};
const resourceTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.76rem'};
const resourceMeta: React.CSSProperties = {fontSize: '.55rem', color: '#666', marginTop: '5px'};
const resourceDescription: React.CSSProperties = {fontSize: '.61rem', color: '#888', marginTop: '6px', lineHeight: 1.55};
const versionBadge: React.CSSProperties = {fontSize: '.5rem', color: '#60A5FA', border: '1px solid rgba(96,165,250,.2)', padding: '2px 5px'};
const featuredBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '.48rem', color: '#D4AF37', border: '1px solid rgba(212,175,55,.2)', padding: '2px 5px'};
const liveBadge: React.CSSProperties = {fontSize: '.48rem', color: '#34D399', border: '1px solid rgba(52,211,153,.2)', background: 'rgba(52,211,153,.05)', padding: '2px 5px'};
const draftBadge: React.CSSProperties = {fontSize: '.48rem', color: '#777', border: '1px solid rgba(255,255,255,.09)', padding: '2px 5px'};
const tagBadge: React.CSSProperties = {fontSize: '.48rem', color: '#777', background: 'rgba(255,255,255,.045)', padding: '2px 6px'};
const rowButton: React.CSSProperties = {width: '29px', height: '29px', display: 'grid', placeItems: 'center', background: '#121212', border: '1px solid rgba(255,255,255,.08)', color: '#888', cursor: 'pointer'};
const modalOverlay: React.CSSProperties = {position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,.84)', display: 'grid', placeItems: 'center', padding: '20px'};
const modal: React.CSSProperties = {width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#101010', border: '1px solid rgba(212,175,55,.25)', boxShadow: '0 28px 90px rgba(0,0,0,.7)'};
const modalHeader: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,.06)'};
const closeButton: React.CSSProperties = {width: '31px', height: '31px', display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,.08)', color: '#777', cursor: 'pointer'};
const fieldLabel: React.CSSProperties = {display: 'block', fontSize: '.53rem', letterSpacing: '1.7px', textTransform: 'uppercase', color: '#777'};
const input: React.CSSProperties = {width: '100%', boxSizing: 'border-box', background: '#080808', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '10px 11px', fontSize: '.68rem', outline: 'none'};
const twoColumns: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px'};
const checkLabel: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', color: '#999', fontSize: '.64rem', alignSelf: 'end', minHeight: '37px'};
const outlineButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: '#111', color: '#AAA', border: '1px solid rgba(255,255,255,.11)', padding: '9px 14px', fontSize: '.63rem', cursor: 'pointer'};
const goldButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#050505', border: 0, padding: '10px 16px', fontFamily: 'Cinzel,serif', fontWeight: 700, fontSize: '.62rem', cursor: 'pointer'};
const typeTabs: React.CSSProperties = {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px'};
const typeTab: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', background: '#090909', border: '1px solid rgba(255,255,255,.08)', color: '#777', cursor: 'pointer', fontSize: '.62rem'};
const activeTypeTab: React.CSSProperties = {borderColor: 'rgba(212,175,55,.4)', color: '#D4AF37', background: 'rgba(212,175,55,.06)'};
const uploadPanel: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '12px', border: '1px dashed rgba(212,175,55,.25)', background: 'rgba(212,175,55,.035)', padding: '13px', flexWrap: 'wrap'};
const uploadButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#161616', border: '1px solid rgba(212,175,55,.25)', color: '#D4AF37', padding: '9px 12px', fontSize: '.6rem', cursor: 'pointer'};
