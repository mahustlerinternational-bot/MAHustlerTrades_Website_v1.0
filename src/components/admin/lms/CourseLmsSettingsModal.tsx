'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  FileBadge2,
  Loader2,
  Move,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {toast} from 'sonner';

import {
  CERTIFICATE_PLACEHOLDER_LABELS,
  DEFAULT_CERTIFICATE_LAYOUT,
  normalizeCertificateLayout,
  type CertificateLayout,
  type CertificatePlaceholderKey,
  type CertificateTextAlignment,
} from '@/lib/lms/certificateLayout';
import {authFetch} from '@/lib/utils/authFetch';

interface CourseSettings {
  id: string;
  title: string;
  lms_sequential?: boolean;
  certificate_template_path?: string | null;
  certificate_template_name?: string | null;
  certificate_title?: string | null;
  certificate_signatory_name?: string | null;
  certificate_signatory_title?: string | null;
  certificate_layout?: CertificateLayout | null;
}

const PLACEHOLDER_KEYS = Object.keys(
  CERTIFICATE_PLACEHOLDER_LABELS,
) as CertificatePlaceholderKey[];

export default function CourseLmsSettingsModal({
  course,
  onClose,
  onSaved,
}: {
  course: CourseSettings;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState({
    lms_sequential: course.lms_sequential ?? true,
    certificate_title: course.certificate_title ?? 'Certificate of Completion',
    certificate_signatory_name: course.certificate_signatory_name ?? '',
    certificate_signatory_title: course.certificate_signatory_title ?? '',
    certificate_layout: normalizeCertificateLayout(course.certificate_layout),
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPlaceholder, setSelectedPlaceholder] =
    useState<CertificatePlaceholderKey>('member_name');
  const [dragging, setDragging] = useState<CertificatePlaceholderKey | null>(null);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPreview() {
      setPreviewLoading(true);
      try {
        let blob: Blob | null = file;
        if (!blob && course.certificate_template_path) {
          const response = await authFetch(
            `/api/admin/lms/certificate-template?course_id=${encodeURIComponent(course.id)}`,
          );
          if (!response.ok) throw new Error('Current template preview could not be loaded');
          blob = await response.blob();
        }
        if (!blob || cancelled) {
          if (!cancelled) {
            setPreviewUrl(null);
            setPreviewType(null);
          }
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreviewUrl(objectUrl);
          setPreviewType(blob.type);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl(null);
          setPreviewType(null);
          toast.error(error instanceof Error ? error.message : 'Template preview failed');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }

    void loadPreview();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [course.certificate_template_path, course.id, file]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const response = await authFetch(`/api/admin/lms/courses/${course.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Course settings could not be saved');

      if (file) {
        const form = new FormData();
        form.set('course_id', course.id);
        form.set('file', file);
        const upload = await authFetch('/api/admin/lms/certificate-template', {
          method: 'POST',
          body: form,
        });
        const uploadResult = await upload.json();
        if (!upload.ok) throw new Error(uploadResult.error ?? 'Certificate template upload failed');
      }
      toast.success('LMS, certificate, and placeholder layout saved');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settings save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeTemplate() {
    if (saving || !course.certificate_template_path) return;
    if (!confirm('Remove this course certificate template?')) return;
    setSaving(true);
    try {
      const response = await authFetch(
        `/api/admin/lms/certificate-template?course_id=${encodeURIComponent(course.id)}`,
        {method: 'DELETE'},
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Template removal failed');
      toast.success('Certificate template removed');
      await onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Template removal failed');
    } finally {
      setSaving(false);
    }
  }

  function updatePlaceholder(
    key: CertificatePlaceholderKey,
    values: Partial<CertificateLayout[CertificatePlaceholderKey]>,
  ) {
    setDraft(current => ({
      ...current,
      certificate_layout: {
        ...current.certificate_layout,
        [key]: {...current.certificate_layout[key], ...values},
      },
    }));
  }

  function movePlaceholder(
    event: ReactPointerEvent<HTMLDivElement>,
    key: CertificatePlaceholderKey,
  ) {
    const bounds = previewRef.current?.getBoundingClientRect();
    if (!bounds) return;
    updatePlaceholder(key, {
      x: Math.min(0.97, Math.max(0.03, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(0.95, Math.max(0.05, (event.clientY - bounds.top) / bounds.height)),
    });
  }

  function startDragging(
    event: ReactPointerEvent<HTMLButtonElement>,
    key: CertificatePlaceholderKey,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedPlaceholder(key);
    setDragging(key);
    previewRef.current?.setPointerCapture(event.pointerId);
    movePlaceholder(event as unknown as ReactPointerEvent<HTMLDivElement>, key);
  }

  const selected = draft.certificate_layout[selectedPlaceholder];
  const sampleValues: Record<CertificatePlaceholderKey, string> = {
    certificate_title: draft.certificate_title || 'Certificate of Completion',
    member_name: 'MEMBER FULL NAME',
    course_title: course.title || 'COURSE TITLE',
    issued_date: 'Issued 23 July 2026',
  };

  return (
    <div style={overlay} onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div style={modal} onMouseDown={event => event.stopPropagation()}>
        <header style={header}>
          <div>
            <p style={eyebrow}>COURSE CONFIGURATION</p>
            <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '4px'}}>
              LMS & Certificate Settings
            </h2>
          </div>
          <button onClick={onClose} style={iconButton} aria-label="Close settings">
            <X size={15} />
          </button>
        </header>

        <div style={body}>
          <label style={togglePanel}>
            <input
              type="checkbox"
              checked={draft.lms_sequential}
              onChange={event => setDraft({...draft, lms_sequential: event.target.checked})}
              style={{accentColor: '#D4AF37'}}
            />
            <div>
              <strong style={{fontSize: '.7rem'}}>Sequential learning gates</strong>
              <p style={helpText}>
                Lock the next lesson and module until the member completes the current content and
                passes every required assessment.
              </p>
            </div>
          </label>

          <div style={certificatePanel}>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <FileBadge2 size={22} color="#D4AF37" />
              <div>
                <p style={eyebrow}>ELECTRONIC CERTIFICATE</p>
                <p style={helpText}>
                  Generated only after full course completion and a passed final assessment.
                </p>
              </div>
            </div>

            <div style={settingsGrid}>
              <div style={{display: 'grid', gap: '13px', alignContent: 'start'}}>
                <Field label="Certificate title">
                  <input
                    value={draft.certificate_title}
                    onChange={event =>
                      setDraft({...draft, certificate_title: event.target.value})
                    }
                    style={input}
                  />
                </Field>
                <div style={twoColumnGrid}>
                  <Field label="Signatory name (optional)">
                    <input
                      value={draft.certificate_signatory_name}
                      onChange={event =>
                        setDraft({...draft, certificate_signatory_name: event.target.value})
                      }
                      style={input}
                    />
                  </Field>
                  <Field label="Signatory title (optional)">
                    <input
                      value={draft.certificate_signatory_title}
                      onChange={event =>
                        setDraft({...draft, certificate_signatory_title: event.target.value})
                      }
                      style={input}
                    />
                  </Field>
                </div>
                <Field label="Certificate template — PNG, JPG, or PDF (maximum 10 MB)">
                  <label style={uploadBox}>
                    <Upload size={18} color="#D4AF37" />
                    <span style={{fontSize: '.66rem', color: '#AAA'}}>
                      {file?.name ??
                        course.certificate_template_name ??
                        'Choose certificate template'}
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      hidden
                      onChange={event => {
                        const selectedFile = event.target.files?.[0] ?? null;
                        if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
                          toast.error('Certificate template must be 10 MB or smaller');
                          event.target.value = '';
                          return;
                        }
                        setFile(selectedFile);
                      }}
                    />
                  </label>
                </Field>
                {course.certificate_template_path && (
                  <button onClick={() => void removeTemplate()} disabled={saving} style={dangerButton}>
                    <Trash2 size={12} /> Remove Current Template
                  </button>
                )}
              </div>

              <div style={layoutEditor}>
                <div style={previewHeader}>
                  <div>
                    <p style={eyebrow}>LIVE CERTIFICATE PREVIEW</p>
                    <p style={helpText}>Select and drag a placeholder to its exact position.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft(current => ({
                        ...current,
                        certificate_layout: normalizeCertificateLayout(
                          DEFAULT_CERTIFICATE_LAYOUT,
                        ),
                      }))
                    }
                    style={smallButton}
                    title="Reset the certificate placeholders"
                  >
                    <RotateCcw size={11} /> Reset
                  </button>
                </div>

                <div
                  ref={previewRef}
                  style={previewCanvas}
                  onPointerMove={event => {
                    if (dragging) movePlaceholder(event, dragging);
                  }}
                  onPointerUp={event => {
                    if (dragging && previewRef.current?.hasPointerCapture(event.pointerId)) {
                      previewRef.current.releasePointerCapture(event.pointerId);
                    }
                    setDragging(null);
                  }}
                  onPointerCancel={() => setDragging(null)}
                >
                  {previewLoading && (
                    <div style={previewLoadingPanel}>
                      <Loader2 size={19} color="#D4AF37" className="animate-spin" />
                    </div>
                  )}
                  {!previewUrl && !previewLoading && <DefaultCertificateBackground />}
                  {previewUrl &&
                    (previewType?.includes('pdf') ? (
                      <object
                        data={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        type="application/pdf"
                        aria-label="Certificate PDF template"
                        style={templateMedia}
                      />
                    ) : (
                      // The blob URL is produced from an admin-authenticated response or local file.
                      <img src={previewUrl} alt="Certificate template" style={templateMedia} />
                    ))}

                  {PLACEHOLDER_KEYS.map(key => {
                    const position = draft.certificate_layout[key];
                    const active = selectedPlaceholder === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onPointerDown={event => startDragging(event, key)}
                        onClick={() => setSelectedPlaceholder(key)}
                        style={{
                          ...placeholder,
                          left: `${position.x * 100}%`,
                          top: `${position.y * 100}%`,
                          transform:
                            position.align === 'center'
                              ? 'translate(-50%,-50%)'
                              : position.align === 'right'
                                ? 'translate(-100%,-50%)'
                                : 'translate(0,-50%)',
                          fontSize: `${Math.max(7, position.font_size * 0.42)}px`,
                          color:
                            key === 'member_name'
                              ? '#D4AF37'
                              : key === 'certificate_title' || key === 'course_title'
                                ? '#FAFAFA'
                                : '#D6D6D6',
                          borderColor: active ? '#D4AF37' : 'rgba(66,153,225,.75)',
                          background: active
                            ? 'rgba(212,175,55,.18)'
                            : 'rgba(3,12,24,.7)',
                          zIndex: active ? 5 : 4,
                        }}
                        title={`Drag ${CERTIFICATE_PLACEHOLDER_LABELS[key]}`}
                      >
                        <Move size={9} />
                        {sampleValues[key]}
                      </button>
                    );
                  })}
                </div>

                <div style={placeholderTabs}>
                  {PLACEHOLDER_KEYS.map(key => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setSelectedPlaceholder(key)}
                      style={{
                        ...placeholderTab,
                        borderColor:
                          selectedPlaceholder === key
                            ? 'rgba(212,175,55,.6)'
                            : 'rgba(255,255,255,.08)',
                        color: selectedPlaceholder === key ? '#D4AF37' : '#777',
                      }}
                    >
                      {CERTIFICATE_PLACEHOLDER_LABELS[key]}
                    </button>
                  ))}
                </div>

                <div style={placementControls}>
                  <div>
                    <span style={labelStyle}>Text alignment</span>
                    <div style={{display: 'flex', gap: '5px'}}>
                      {(
                        [
                          ['left', AlignLeft],
                          ['center', AlignCenter],
                          ['right', AlignRight],
                        ] as const
                      ).map(([alignment, Icon]) => (
                        <button
                          type="button"
                          key={alignment}
                          onClick={() =>
                            updatePlaceholder(selectedPlaceholder, {align: alignment})
                          }
                          aria-label={`${alignment} align`}
                          style={{
                            ...alignmentButton,
                            color: selected.align === alignment ? '#050505' : '#888',
                            background:
                              selected.align === alignment ? '#D4AF37' : '#0A0A0A',
                          }}
                        >
                          <Icon size={13} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <RangeControl
                    label={`Horizontal ${Math.round(selected.x * 100)}%`}
                    value={selected.x}
                    minimum={0.03}
                    maximum={0.97}
                    step={0.01}
                    onChange={x => updatePlaceholder(selectedPlaceholder, {x})}
                  />
                  <RangeControl
                    label={`Vertical ${Math.round(selected.y * 100)}%`}
                    value={selected.y}
                    minimum={0.05}
                    maximum={0.95}
                    step={0.01}
                    onChange={y => updatePlaceholder(selectedPlaceholder, {y})}
                  />
                  <RangeControl
                    label={`Font ${selected.font_size} pt`}
                    value={selected.font_size}
                    minimum={8}
                    maximum={48}
                    step={1}
                    onChange={font_size =>
                      updatePlaceholder(selectedPlaceholder, {font_size})
                    }
                  />
                </div>

                <p style={previewNote}>
                  Blue boxes are editable placeholders and will not appear on the final certificate.
                  Placement scales proportionally to the uploaded template.
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer style={footer}>
          <button onClick={onClose} style={outlineButton}>
            Cancel
          </button>
          <button
            onClick={() => void save()}
            disabled={saving}
            style={{...goldButton, opacity: saving ? 0.55 : 1}}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function DefaultCertificateBackground() {
  return (
    <div style={defaultCertificate}>
      <div style={defaultInnerBorder} />
      <p style={defaultBrand}>MAHUSTLER TRADES ACADEMY</p>
      <p style={{...defaultHelper, top: '41%'}}>This certifies that</p>
      <p style={{...defaultHelper, top: '59%'}}>has successfully completed</p>
      <p style={{...defaultHelper, top: '88%'}}>MAHT-CERT-PREVIEW</p>
    </div>
  );
}

function RangeControl({
  label,
  value,
  minimum,
  maximum,
  step,
  onChange,
}: {
  label: string;
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      <input
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{width: '100%', accentColor: '#D4AF37'}}
      />
    </label>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return (
    <label>
      <span style={labelStyle}>{label}</span>
      {children}
    </label>
  );
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1100,
  background: 'rgba(0,0,0,.88)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '18px',
};
const modal: CSSProperties = {
  width: 'min(1120px,100%)',
  maxHeight: '94vh',
  display: 'flex',
  flexDirection: 'column',
  background: '#0D0D0D',
  border: '1px solid rgba(212,175,55,.25)',
  boxShadow: '0 28px 90px rgba(0,0,0,.85)',
};
const header: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '15px 18px',
  borderBottom: '1px solid rgba(255,255,255,.07)',
};
const body: CSSProperties = {
  padding: '18px',
  display: 'grid',
  gap: '15px',
  overflowY: 'auto',
};
const footer: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  padding: '13px 18px',
  borderTop: '1px solid rgba(255,255,255,.07)',
};
const eyebrow: CSSProperties = {
  fontFamily: 'Cinzel,serif',
  fontSize: '.54rem',
  letterSpacing: '3px',
  color: '#D4AF37',
};
const helpText: CSSProperties = {
  fontSize: '.6rem',
  color: '#666',
  lineHeight: 1.55,
  marginTop: '3px',
};
const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '.53rem',
  letterSpacing: '1.4px',
  textTransform: 'uppercase',
  color: '#666',
  marginBottom: '6px',
};
const input: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#080808',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
  padding: '10px 11px',
  fontSize: '.7rem',
  outline: 'none',
};
const togglePanel: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '18px minmax(0,1fr)',
  gap: '10px',
  alignItems: 'start',
  padding: '13px',
  border: '1px solid rgba(212,175,55,.15)',
  background: 'rgba(212,175,55,.04)',
  cursor: 'pointer',
};
const certificatePanel: CSSProperties = {
  display: 'grid',
  gap: '15px',
  padding: '15px',
  border: '1px solid rgba(255,255,255,.075)',
  background: '#0A0A0A',
};
const settingsGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(min(430px,100%),1fr))',
  gap: '18px',
  alignItems: 'start',
};
const twoColumnGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
  gap: '12px',
};
const uploadBox: CSSProperties = {
  minHeight: '74px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '7px',
  border: '1px dashed rgba(212,175,55,.3)',
  background: 'rgba(212,175,55,.035)',
  cursor: 'pointer',
  padding: '12px',
  textAlign: 'center',
};
const layoutEditor: CSSProperties = {
  display: 'grid',
  gap: '10px',
  minWidth: 0,
  padding: '12px',
  border: '1px solid rgba(212,175,55,.13)',
  background: '#070707',
};
const previewHeader: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '10px',
};
const previewCanvas: CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '842 / 595',
  overflow: 'hidden',
  background: '#111',
  border: '1px solid rgba(212,175,55,.25)',
  touchAction: 'none',
  userSelect: 'none',
};
const templateMedia: CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'fill',
  border: 0,
  pointerEvents: 'none',
};
const previewLoadingPanel: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  display: 'grid',
  placeItems: 'center',
  background: '#090909',
};
const placeholder: CSSProperties = {
  position: 'absolute',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  maxWidth: '78%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontFamily: 'Georgia,serif',
  fontWeight: 700,
  letterSpacing: '.2px',
  padding: '3px 5px',
  border: '1px dashed',
  cursor: 'grab',
  lineHeight: 1.15,
  boxShadow: '0 2px 8px rgba(0,0,0,.45)',
};
const placeholderTabs: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(95px,1fr))',
  gap: '5px',
};
const placeholderTab: CSSProperties = {
  minWidth: 0,
  padding: '7px 4px',
  background: '#0A0A0A',
  border: '1px solid',
  fontSize: '.49rem',
  textTransform: 'uppercase',
  letterSpacing: '.6px',
  cursor: 'pointer',
};
const placementControls: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))',
  gap: '10px',
  alignItems: 'end',
  padding: '10px',
  background: '#0B0B0B',
  border: '1px solid rgba(255,255,255,.06)',
};
const alignmentButton: CSSProperties = {
  width: '26px',
  height: '26px',
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(255,255,255,.1)',
  cursor: 'pointer',
};
const defaultCertificate: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(circle at 50% 42%,rgba(212,175,55,.08),transparent 40%),#090909',
  border: '7px solid #9C7413',
  boxSizing: 'border-box',
};
const defaultInnerBorder: CSSProperties = {
  position: 'absolute',
  inset: '7px',
  border: '1px solid rgba(212,175,55,.55)',
};
const defaultBrand: CSSProperties = {
  position: 'absolute',
  top: '19%',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#D4AF37',
  fontSize: 'clamp(7px,1.15vw,13px)',
  fontFamily: 'Cinzel,serif',
  letterSpacing: '2px',
  whiteSpace: 'nowrap',
};
const defaultHelper: CSSProperties = {
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  color: '#888',
  fontSize: 'clamp(6px,.8vw,9px)',
  whiteSpace: 'nowrap',
};
const previewNote: CSSProperties = {
  color: '#555',
  fontSize: '.52rem',
  lineHeight: 1.5,
};
const iconButton: CSSProperties = {
  width: '30px',
  height: '30px',
  display: 'grid',
  placeItems: 'center',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,.08)',
  color: '#777',
  cursor: 'pointer',
};
const smallButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '6px 8px',
  background: '#0C0C0C',
  border: '1px solid rgba(255,255,255,.09)',
  color: '#777',
  fontSize: '.54rem',
  cursor: 'pointer',
};
const outlineButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  background: '#111',
  color: '#999',
  border: '1px solid rgba(255,255,255,.1)',
  padding: '9px 13px',
  fontSize: '.63rem',
  cursor: 'pointer',
};
const goldButton: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '7px',
  background: 'linear-gradient(135deg,#B8860B,#D4AF37)',
  color: '#000',
  border: 0,
  padding: '10px 15px',
  fontSize: '.65rem',
  fontWeight: 700,
  fontFamily: 'Cinzel,serif',
  cursor: 'pointer',
};
const dangerButton: CSSProperties = {
  justifySelf: 'start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 10px',
  background: 'rgba(255,71,87,.06)',
  border: '1px solid rgba(255,71,87,.18)',
  color: '#FF6B78',
  fontSize: '.6rem',
  cursor: 'pointer',
};
