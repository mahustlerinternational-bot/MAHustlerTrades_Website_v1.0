'use client';

import {useState, type CSSProperties} from 'react';
import {FileBadge2, Loader2, Save, Trash2, Upload, X} from 'lucide-react';
import {toast} from 'sonner';

import {authFetch} from '@/lib/utils/authFetch';

interface CourseSettings {
  id: string;
  lms_sequential?: boolean;
  certificate_template_path?: string | null;
  certificate_template_name?: string | null;
  certificate_title?: string | null;
  certificate_signatory_name?: string | null;
  certificate_signatory_title?: string | null;
}

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
  });
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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
      toast.success('LMS and certificate settings saved');
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

  return (
    <div style={overlay} onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div style={modal} onMouseDown={event => event.stopPropagation()}>
        <header style={header}>
          <div>
            <p style={eyebrow}>COURSE CONFIGURATION</p>
            <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem', marginTop: '4px'}}>LMS & Certificate Settings</h2>
          </div>
          <button onClick={onClose} style={iconButton}><X size={15} /></button>
        </header>
        <div style={{padding: '18px', display: 'grid', gap: '15px', overflowY: 'auto'}}>
          <label style={togglePanel}>
            <input
              type="checkbox"
              checked={draft.lms_sequential}
              onChange={event => setDraft({...draft, lms_sequential: event.target.checked})}
              style={{accentColor: '#D4AF37'}}
            />
            <div>
              <strong style={{fontSize: '.7rem'}}>Sequential learning gates</strong>
              <p style={{fontSize: '.6rem', color: '#666', lineHeight: 1.55, marginTop: '3px'}}>
                Lock the next lesson and module until the member completes the current content and passes every required assessment.
              </p>
            </div>
          </label>

          <div style={certificatePanel}>
            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
              <FileBadge2 size={22} color="#D4AF37" />
              <div>
                <p style={eyebrow}>ELECTRONIC CERTIFICATE</p>
                <p style={{fontSize: '.62rem', color: '#777', marginTop: '4px'}}>
                  Generated only after full course completion and a passed final assessment.
                </p>
              </div>
            </div>
            <Field label="Certificate title">
              <input value={draft.certificate_title} onChange={event => setDraft({...draft, certificate_title: event.target.value})} style={input} />
            </Field>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '12px'}}>
              <Field label="Signatory name (optional)">
                <input value={draft.certificate_signatory_name} onChange={event => setDraft({...draft, certificate_signatory_name: event.target.value})} style={input} />
              </Field>
              <Field label="Signatory title (optional)">
                <input value={draft.certificate_signatory_title} onChange={event => setDraft({...draft, certificate_signatory_title: event.target.value})} style={input} />
              </Field>
            </div>
            <Field label="Certificate template — PNG, JPG, or PDF (maximum 10 MB)">
              <label style={uploadBox}>
                <Upload size={18} color="#D4AF37" />
                <span style={{fontSize: '.66rem', color: '#AAA'}}>
                  {file?.name ?? course.certificate_template_name ?? 'Choose certificate template'}
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,application/pdf"
                  hidden
                  onChange={event => {
                    const selected = event.target.files?.[0] ?? null;
                    if (selected && selected.size > 10 * 1024 * 1024) {
                      toast.error('Certificate template must be 10 MB or smaller');
                      event.target.value = '';
                      return;
                    }
                    setFile(selected);
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
        </div>
        <footer style={footer}>
          <button onClick={onClose} style={outlineButton}>Cancel</button>
          <button onClick={() => void save()} disabled={saving} style={{...goldButton, opacity: saving ? 0.55 : 1}}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <label><span style={labelStyle}>{label}</span>{children}</label>;
}

const overlay: CSSProperties = {position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px'};
const modal: CSSProperties = {width: 'min(720px,100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid rgba(212,175,55,.25)', boxShadow: '0 28px 90px rgba(0,0,0,.85)'};
const header: CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 18px', borderBottom: '1px solid rgba(255,255,255,.07)'};
const footer: CSSProperties = {display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '13px 18px', borderTop: '1px solid rgba(255,255,255,.07)'};
const eyebrow: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.54rem', letterSpacing: '3px', color: '#D4AF37'};
const labelStyle: CSSProperties = {display: 'block', fontSize: '.53rem', letterSpacing: '1.6px', textTransform: 'uppercase', color: '#666', marginBottom: '6px'};
const input: CSSProperties = {width: '100%', boxSizing: 'border-box', background: '#080808', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '10px 11px', fontSize: '.7rem', outline: 'none'};
const togglePanel: CSSProperties = {display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: '10px', alignItems: 'start', padding: '13px', border: '1px solid rgba(212,175,55,.15)', background: 'rgba(212,175,55,.04)', cursor: 'pointer'};
const certificatePanel: CSSProperties = {display: 'grid', gap: '13px', padding: '15px', border: '1px solid rgba(255,255,255,.075)', background: '#0A0A0A'};
const uploadBox: CSSProperties = {minHeight: '74px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px', border: '1px dashed rgba(212,175,55,.3)', background: 'rgba(212,175,55,.035)', cursor: 'pointer', padding: '12px', textAlign: 'center'};
const iconButton: CSSProperties = {width: '30px', height: '30px', display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,.08)', color: '#777', cursor: 'pointer'};
const outlineButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#111', color: '#999', border: '1px solid rgba(255,255,255,.1)', padding: '9px 13px', fontSize: '.63rem', cursor: 'pointer'};
const goldButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 0, padding: '10px 15px', fontSize: '.65rem', fontWeight: 700, fontFamily: 'Cinzel,serif', cursor: 'pointer'};
const dangerButton: CSSProperties = {justifySelf: 'start', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 10px', background: 'rgba(255,71,87,.06)', border: '1px solid rgba(255,71,87,.18)', color: '#FF6B78', fontSize: '.6rem', cursor: 'pointer'};
