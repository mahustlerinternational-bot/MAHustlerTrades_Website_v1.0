'use client';

import {
  Archive,
  BookOpen,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileCode2,
  Folder,
  FolderOpen,
  LayoutGrid,
  Link2,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {toast} from 'sonner';

import {authFetch} from '@/lib/utils/authFetch';
import type {VaultFolder, VaultPayload, VaultResource} from '@/types/vault';

const ICONS: Record<string, string> = {
  folder: '📁',
  tools: '🧰',
  code: '💻',
  book: '📘',
  archive: '🗄️',
  chart: '📊',
  shield: '🛡️',
};

export default function EliteVaultPage() {
  const [payload, setPayload] = useState<VaultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch('/api/me/vault');
      const result = await response.json();
      if (response.status === 403) {
        setDenied(true);
        return;
      }
      if (!response.ok) throw new Error(result.error ?? 'Elite Vault could not be loaded');
      setPayload(result);
      setDenied(false);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Elite Vault could not be loaded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(() => payload?.folders ?? [], [payload]);
  const resources = useMemo(() => payload?.resources ?? [], [payload]);
  const currentFolder = folders.find(folder => folder.id === folderId) ?? null;
  const childFolders = folders.filter(folder => folder.parent_id === folderId);
  const needle = search.trim().toLowerCase();
  const visibleResources = resources.filter(resource => {
    if (needle) {
      return resource.title.toLowerCase().includes(needle) ||
        (resource.description ?? '').toLowerCase().includes(needle) ||
        (resource.file_name ?? '').toLowerCase().includes(needle) ||
        (resource.tags ?? []).some(tag => tag.toLowerCase().includes(needle));
    }
    return resource.folder_id === folderId;
  });
  const featured = resources.filter(resource => resource.is_featured).slice(0, 4);
  const breadcrumbs = useMemo(() => {
    const result: VaultFolder[] = [];
    let current = currentFolder;
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      result.unshift(current);
      current = folders.find(folder => folder.id === current?.parent_id) ?? null;
    }
    return result;
  }, [currentFolder, folders]);

  async function openResource(resource: VaultResource) {
    if (opening) return;
    setOpening(resource.id);
    const target = window.open('about:blank', '_blank');
    try {
      const response = await authFetch(`/api/me/vault/resources/${resource.id}/download?json=1`);
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error ?? 'Resource is unavailable');
      if (target) target.location.href = result.url;
      else window.location.href = result.url;
      setPayload(current => current ? {
        ...current,
        resources: current.resources.map(item =>
          item.id === resource.id
            ? {...item, download_count: Number(item.download_count ?? 0) + 1}
            : item,
        ),
      } : current);
    } catch (reason) {
      target?.close();
      toast.error(reason instanceof Error ? reason.message : 'Resource could not be opened');
    } finally {
      setOpening(null);
    }
  }

  if (loading) {
    return (
      <div style={centerPage}>
        <Loader2 size={30} color="#D4AF37" style={{animation: 'vaultSpin .8s linear infinite'}} />
        <p>Unlocking Elite Vault…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div style={centerPage}>
        <div style={lockedSeal}><LockKeyhole size={31} /></div>
        <p style={eyebrow}>RESTRICTED REPOSITORY</p>
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.55rem'}}>Elite Vault Access Required</h1>
        <p style={{fontSize: '.72rem', color: '#777', lineHeight: 1.75, maxWidth: '540px', textAlign: 'center'}}>
          The Elite Vault contains private tools and official member materials. Activate a membership package or complete the approved Elite registration process to enter.
        </p>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <Link href="/portal/ib" style={goldLink}>Apply for Elite Access</Link>
          <Link href="/portal/packages" style={outlineLink}>View Memberships</Link>
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div style={centerPage}>
        <Archive size={32} color="#D4AF37" />
        <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.1rem'}}>Vault Temporarily Unavailable</h1>
        <p style={{fontSize: '.7rem', color: '#777'}}>{error || 'Please try again.'}</p>
        <button onClick={() => void load()} style={goldButton}>Try Again</button>
      </div>
    );
  }

  return (
    <div style={page}>
      <style>{`
        @keyframes vaultFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes vaultSpin{to{transform:rotate(360deg)}}
        .member-vault-folder:hover,.member-vault-resource:hover{transform:translateY(-2px);border-color:rgba(212,175,55,.3)!important}
        .member-vault-tree:hover{color:#D4AF37!important;background:rgba(212,175,55,.04)!important}
        @media(max-width:900px){.member-vault-shell{grid-template-columns:1fr!important}.member-vault-sidebar{max-height:330px}.member-vault-head{align-items:flex-start!important}.member-vault-featured{grid-template-columns:1fr!important}}
      `}</style>

      <header className="member-vault-head" style={header}>
        <div>
          <p style={eyebrow}>OFFICIAL MEMBER REPOSITORY</p>
          <h1 style={title}>Elite Vault</h1>
          <p style={subtitle}>Your secure library for official trading tools, learning materials, downloads and member resources.</p>
        </div>
        <div style={accessBadge}><ShieldCheck size={13} /> ELITE MEMBER ACCESS</div>
      </header>

      {!folderId && !needle && featured.length > 0 && (
        <section style={{marginBottom: '18px', animation: 'vaultFade .45s .04s ease both'}}>
          <SectionHeading icon={<Star size={14} />} title="Featured Resources" count={featured.length} />
          <div className="member-vault-featured" style={featuredGrid}>
            {featured.map(resource => (
              <FeaturedResource
                key={resource.id}
                resource={resource}
                opening={opening === resource.id}
                onOpen={() => void openResource(resource)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="member-vault-shell" style={shell}>
        <aside className="member-vault-sidebar" style={sidebar}>
          <div style={sidebarHeader}>
            <p style={panelLabel}>VAULT DIRECTORY</p>
            <p style={{fontSize: '.54rem', color: '#555', marginTop: '4px'}}>{folders.length} folders · {resources.length} resources</p>
          </div>
          <button
            onClick={() => {
              setFolderId(null);
              setSearch('');
            }}
            className="member-vault-tree"
            style={{...treeButton, ...(folderId === null ? activeTreeButton : {})}}
          >
            <LayoutGrid size={14} /> Vault Home
          </button>
          <div style={{padding: '5px 8px 11px'}}>
            {folders.filter(folder => !folder.parent_id).map(folder => (
              <MemberFolderTree
                key={folder.id}
                folder={folder}
                folders={folders}
                selected={folderId}
                depth={0}
                onSelect={id => {
                  setFolderId(id);
                  setSearch('');
                }}
              />
            ))}
            {folders.length === 0 && <p style={{fontSize: '.62rem', color: '#555', padding: '15px 8px'}}>The administrator is preparing the first Vault folders.</p>}
          </div>
        </aside>

        <main style={library}>
          <div style={libraryHeader}>
            <div style={{minWidth: 0}}>
              <div style={breadcrumbsStyle}>
                <button onClick={() => setFolderId(null)} style={breadcrumbButton}>VAULT</button>
                {breadcrumbs.map(folder => (
                  <span key={folder.id} style={{display: 'contents'}}>
                    <ChevronRight size={10} color="#555" />
                    <button onClick={() => setFolderId(folder.id)} style={breadcrumbButton}>{folder.name.toUpperCase()}</button>
                  </span>
                ))}
              </div>
              <h2 style={libraryTitle}>{needle ? 'Search Results' : currentFolder?.name ?? 'Vault Home'}</h2>
              <p style={libraryDescription}>
                {needle
                  ? `${visibleResources.length} matching resource${visibleResources.length === 1 ? '' : 's'}`
                  : currentFolder?.description ?? 'Browse the official Elite member resource library.'}
              </p>
            </div>
            <div style={searchWrap}>
              <Search size={14} color="#666" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search all resources…" style={searchInput} />
            </div>
          </div>

          <div style={{padding: '16px'}}>
            {!needle && childFolders.length > 0 && (
              <section style={{marginBottom: '22px'}}>
                <SectionHeading icon={<FolderOpen size={14} />} title="Folders" count={childFolders.length} />
                <div style={folderGrid}>
                  {childFolders.map(folder => (
                    <button
                      key={folder.id}
                      className="member-vault-folder"
                      onClick={() => setFolderId(folder.id)}
                      style={folderCard}
                    >
                      <span style={{fontSize: '1.65rem'}}>{ICONS[folder.icon] ?? '📁'}</span>
                      <span style={{minWidth: 0, flex: 1, textAlign: 'left'}}>
                        <strong style={{fontFamily: 'Cinzel,serif', fontSize: '.7rem'}}>{folder.name}</strong>
                        <small style={{display: 'block', color: '#666', fontSize: '.55rem', lineHeight: 1.5, marginTop: '4px'}}>
                          {folder.description || `${folders.filter(item => item.parent_id === folder.id).length} subfolders`}
                        </small>
                      </span>
                      <ChevronRight size={14} color="#555" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <SectionHeading icon={<Archive size={14} />} title={needle ? 'Matching Resources' : 'Resources'} count={visibleResources.length} />
              {visibleResources.length === 0 ? (
                <div style={emptyLibrary}>
                  <Archive size={31} />
                  <p style={{fontFamily: 'Cinzel,serif', fontSize: '.76rem'}}>No Resources Available</p>
                  <span>{needle ? 'Try a different search term.' : 'Resources published here will appear automatically.'}</span>
                </div>
              ) : (
                <div style={resourceGrid}>
                  {visibleResources.map(resource => (
                    <MemberResourceCard
                      key={resource.id}
                      resource={resource}
                      folder={folders.find(folder => folder.id === resource.folder_id) ?? null}
                      opening={opening === resource.id}
                      onOpen={() => void openResource(resource)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function SectionHeading({icon, title, count}: {icon: React.ReactNode; title: string; count: number}) {
  return (
    <div style={sectionHeading}>
      <span style={{color: '#D4AF37'}}>{icon}</span>
      <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '.68rem', letterSpacing: '.5px'}}>{title}</h2>
      <span style={countBadge}>{count}</span>
      <span style={{height: '1px', flex: 1, background: 'rgba(255,255,255,.05)'}} />
    </div>
  );
}

function FeaturedResource({resource, opening, onOpen}: {resource: VaultResource; opening: boolean; onOpen: () => void}) {
  return (
    <article style={featuredCard}>
      <div style={featuredGlow} />
      <div style={featuredIcon}>{resource.resource_type === 'link' ? <Link2 size={22} /> : iconForMime(resource.mime_type, 22)}</div>
      <div style={{position: 'relative', flex: 1, minWidth: 0}}>
        <p style={{fontSize: '.5rem', letterSpacing: '2px', color: '#D4AF37'}}>FEATURED RESOURCE</p>
        <h3 style={{fontFamily: 'Cinzel,serif', fontSize: '.82rem', marginTop: '6px'}}>{resource.title}</h3>
        <p style={{fontSize: '.58rem', color: '#777', lineHeight: 1.55, marginTop: '5px'}}>{resource.description || resource.file_name || 'Official Elite resource'}</p>
      </div>
      <button disabled={opening} onClick={onOpen} style={smallGoldButton}>
        {opening ? <Loader2 size={13} style={{animation: 'vaultSpin .8s linear infinite'}} /> : resource.resource_type === 'file' ? <Download size={13} /> : <ExternalLink size={13} />}
      </button>
    </article>
  );
}

function MemberFolderTree({
  folder,
  folders,
  selected,
  depth,
  onSelect,
}: {
  folder: VaultFolder;
  folders: VaultFolder[];
  selected: string | null;
  depth: number;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <button
        className="member-vault-tree"
        onClick={() => onSelect(folder.id)}
        style={{
          ...treeButton,
          ...(selected === folder.id ? activeTreeButton : {}),
          paddingLeft: `${10 + depth * 15}px`,
        }}
      >
        <span>{ICONS[folder.icon] ?? '📁'}</span>
        <span style={{minWidth: 0, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>{folder.name}</span>
      </button>
      {folders.filter(item => item.parent_id === folder.id).map(child => (
        <MemberFolderTree key={child.id} folder={child} folders={folders} selected={selected} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  );
}

function MemberResourceCard({
  resource,
  folder,
  opening,
  onOpen,
}: {
  resource: VaultResource;
  folder: VaultFolder | null;
  opening: boolean;
  onOpen: () => void;
}) {
  return (
    <article className="member-vault-resource" style={resourceCard}>
      <div style={cardTop}>
        <div style={cardIcon}>{resource.resource_type === 'link' ? <Link2 size={21} /> : iconForMime(resource.mime_type, 21)}</div>
        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
          {resource.version && <span style={versionBadge}>v{resource.version.replace(/^v/i, '')}</span>}
          {resource.is_featured && <span style={featuredBadge}><Star size={8} /> FEATURED</span>}
        </div>
      </div>
      <p style={{fontSize: '.5rem', color: '#666', letterSpacing: '1.6px', marginTop: '12px'}}>
        {(folder?.name ?? 'VAULT ROOT').toUpperCase()}
      </p>
      <h3 style={resourceTitle}>{resource.title}</h3>
      <p style={resourceDescription}>{resource.description || (resource.resource_type === 'file' ? resource.file_name : 'Official external member resource')}</p>
      {(resource.tags ?? []).length > 0 && (
        <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '10px'}}>
          {resource.tags.slice(0, 4).map(tag => <span key={tag} style={tagBadge}>{tag}</span>)}
        </div>
      )}
      <div style={cardFooter}>
        <div>
          <p style={{fontSize: '.55rem', color: '#777'}}>
            {resource.resource_type === 'file' ? formatBytes(resource.file_size ?? 0) : 'EXTERNAL LINK'}
          </p>
          <p style={{fontSize: '.48rem', color: '#4F4F4F', marginTop: '3px'}}>{resource.download_count} access{resource.download_count === 1 ? '' : 'es'}</p>
        </div>
        <button disabled={opening} onClick={onOpen} style={resourceButton}>
          {opening
            ? <Loader2 size={13} style={{animation: 'vaultSpin .8s linear infinite'}} />
            : resource.resource_type === 'file'
              ? <Download size={13} />
              : <ExternalLink size={13} />}
          {resource.resource_type === 'file' ? 'Download' : 'Open Resource'}
        </button>
      </div>
    </article>
  );
}

function iconForMime(mime: string | null, size: number) {
  if (mime?.includes('zip') || mime?.includes('rar') || mime?.includes('compressed')) return <FileArchive size={size} />;
  if (mime?.includes('pdf') || mime?.includes('document')) return <BookOpen size={size} />;
  if (mime?.includes('text') || mime?.includes('json') || mime?.includes('javascript')) return <FileCode2 size={size} />;
  if (mime?.includes('application/octet-stream')) return <Wrench size={size} />;
  return <File size={size} />;
}

function formatBytes(value: number) {
  if (!value) return 'FILE';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const page: React.CSSProperties = {padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Montserrat,sans-serif'};
const centerPage: React.CSSProperties = {...page, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '13px', color: '#777'};
const header: React.CSSProperties = {display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap', marginBottom: '22px', animation: 'vaultFade .45s ease'};
const eyebrow: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.56rem', letterSpacing: '4.5px', color: '#D4AF37'};
const title: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '2rem', fontWeight: 900, marginTop: '7px'};
const subtitle: React.CSSProperties = {fontSize: '.7rem', color: '#666', lineHeight: 1.65, marginTop: '7px', maxWidth: '670px'};
const accessBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', border: '1px solid rgba(52,211,153,.25)', background: 'rgba(52,211,153,.055)', color: '#34D399', padding: '8px 12px', fontSize: '.54rem', letterSpacing: '1.8px'};
const featuredGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '9px'};
const featuredCard: React.CSSProperties = {position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg,rgba(212,175,55,.09),rgba(212,175,55,.025))', border: '1px solid rgba(212,175,55,.22)', padding: '14px'};
const featuredGlow: React.CSSProperties = {position: 'absolute', width: '150px', height: '150px', borderRadius: '50%', right: '-60px', top: '-70px', background: 'rgba(212,175,55,.06)', filter: 'blur(20px)'};
const featuredIcon: React.CSSProperties = {position: 'relative', width: '47px', height: '47px', display: 'grid', placeItems: 'center', flexShrink: 0, color: '#D4AF37', border: '1px solid rgba(212,175,55,.2)', background: '#0C0C0C'};
const smallGoldButton: React.CSSProperties = {position: 'relative', width: '34px', height: '34px', display: 'grid', placeItems: 'center', border: 0, background: '#D4AF37', color: '#080808', cursor: 'pointer'};
const shell: React.CSSProperties = {display: 'grid', gridTemplateColumns: '235px minmax(0,1fr)', gap: '12px', alignItems: 'start'};
const sidebar: React.CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.065)', minHeight: '570px', overflowY: 'auto'};
const sidebarHeader: React.CSSProperties = {padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const panelLabel: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '2.4px', color: '#D4AF37'};
const treeButton: React.CSSProperties = {width: '100%', minHeight: '35px', display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 0, borderLeft: '2px solid transparent', padding: '8px 12px', color: '#777', fontSize: '.65rem', cursor: 'pointer', transition: 'all .18s'};
const activeTreeButton: React.CSSProperties = {color: '#D4AF37', background: 'rgba(212,175,55,.075)', borderLeftColor: '#D4AF37'};
const library: React.CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.065)', minHeight: '570px'};
const libraryHeader: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: 'wrap', padding: '15px 17px', borderBottom: '1px solid rgba(255,255,255,.055)'};
const breadcrumbsStyle: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap'};
const breadcrumbButton: React.CSSProperties = {background: 'none', border: 0, color: '#666', fontSize: '.48rem', letterSpacing: '1.5px', cursor: 'pointer', padding: 0};
const libraryTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '1.05rem', marginTop: '6px'};
const libraryDescription: React.CSSProperties = {fontSize: '.58rem', color: '#666', marginTop: '5px', maxWidth: '620px', lineHeight: 1.55};
const searchWrap: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', width: '260px', background: '#080808', border: '1px solid rgba(255,255,255,.09)', padding: '9px 11px'};
const searchInput: React.CSSProperties = {flex: 1, minWidth: 0, background: 'transparent', color: '#fff', border: 0, outline: 0, fontSize: '.65rem'};
const sectionHeading: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '11px'};
const countBadge: React.CSSProperties = {fontSize: '.48rem', color: '#777', border: '1px solid rgba(255,255,255,.08)', padding: '2px 6px'};
const folderGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: '8px'};
const folderCard: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: '11px', padding: '13px', background: '#0C0C0C', border: '1px solid rgba(255,255,255,.065)', color: '#fff', cursor: 'pointer', transition: 'all .18s'};
const resourceGrid: React.CSSProperties = {display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(265px,1fr))', gap: '10px'};
const resourceCard: React.CSSProperties = {display: 'flex', flexDirection: 'column', minHeight: '250px', padding: '15px', background: '#0C0C0C', border: '1px solid rgba(255,255,255,.065)', transition: 'all .2s'};
const cardTop: React.CSSProperties = {display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px'};
const cardIcon: React.CSSProperties = {width: '45px', height: '45px', display: 'grid', placeItems: 'center', color: '#D4AF37', background: 'rgba(212,175,55,.055)', border: '1px solid rgba(212,175,55,.14)'};
const versionBadge: React.CSSProperties = {fontSize: '.48rem', color: '#60A5FA', padding: '2px 5px', border: '1px solid rgba(96,165,250,.2)'};
const featuredBadge: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '.45rem', color: '#D4AF37', padding: '2px 5px', border: '1px solid rgba(212,175,55,.2)'};
const resourceTitle: React.CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.8rem', lineHeight: 1.45, marginTop: '7px'};
const resourceDescription: React.CSSProperties = {fontSize: '.59rem', color: '#777', lineHeight: 1.65, marginTop: '7px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'};
const tagBadge: React.CSSProperties = {fontSize: '.46rem', color: '#777', background: 'rgba(255,255,255,.045)', padding: '2px 6px'};
const cardFooter: React.CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto', paddingTop: '13px', borderTop: '1px solid rgba(255,255,255,.05)'};
const resourceButton: React.CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#050505', border: 0, padding: '8px 10px', fontFamily: 'Cinzel,serif', fontSize: '.53rem', fontWeight: 700, cursor: 'pointer'};
const emptyLibrary: React.CSSProperties = {minHeight: '250px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#555', fontSize: '.6rem'};
const lockedSeal: React.CSSProperties = {width: '68px', height: '68px', display: 'grid', placeItems: 'center', color: '#D4AF37', border: '1px solid rgba(212,175,55,.28)', borderRadius: '50%', background: 'rgba(212,175,55,.05)'};
const goldLink: React.CSSProperties = {background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#050505', textDecoration: 'none', padding: '10px 16px', fontFamily: 'Cinzel,serif', fontSize: '.6rem', fontWeight: 700};
const outlineLink: React.CSSProperties = {border: '1px solid rgba(212,175,55,.25)', color: '#D4AF37', textDecoration: 'none', padding: '9px 16px', fontFamily: 'Cinzel,serif', fontSize: '.6rem'};
const goldButton: React.CSSProperties = {background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#050505', border: 0, padding: '9px 15px', fontFamily: 'Cinzel,serif', fontSize: '.6rem', fontWeight: 700, cursor: 'pointer'};
