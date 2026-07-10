'use client';
// src/components/admin/members/MemberDetailDrawer.tsx
import { useEffect, useState } from 'react';
import { X, UserCog, BookOpen, Calendar, Network, Loader2, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Enrollment, EventRegistration, IbRegistration, Package } from '@/types';

interface MemberDetail {
  profile:     Profile & { package?: Package };
  enrollments: (Enrollment & { course?: { title: string; price: number } })[];
  eventRegs:   (EventRegistration & { event?: { title: string; event_date: string } })[];
  ibReg:       IbRegistration | null;
}

interface Props { memberId: string; onClose: () => void; onUpdated: () => void; }

const ROLES   = ['member', 'ib_member', 'admin'] as const;
const ROLE_COLOR: Record<string, string> = { admin: 'text-purple-400', member: 'text-[#D4AF37]', ib_member: 'text-blue-400' };

export default function MemberDetailDrawer({ memberId, onClose, onUpdated }: Props) {
  const [data,    setData]    = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState<string | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [courseId, setCourseId] = useState('');
  const [courses,  setCourses]  = useState<{ id: string; title: string }[]>([]);
  const [ibNotes,  setIbNotes]  = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/members/${memberId}`).then(r => r.json()),
      fetch('/api/admin/courses?limit=100').then(r => r.json()),
      fetch('/api/packages').then(r => r.json()),
    ]).then(([detail, coursesRes, pkgsRes]) => {
      setData(detail);
      setCourses(coursesRes.data ?? []);
      setPackages(Array.isArray(pkgsRes) ? pkgsRes : pkgsRes.data ?? []);
      setIbNotes(detail.ibReg?.admin_notes ?? '');
    }).finally(() => setLoading(false));
  }, [memberId]);

  async function patch(action: string, extra: Record<string, unknown> = {}) {
    setSaving(action);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
      toast.success('Updated');
      // Refetch detail
      const updated = await fetch(`/api/admin/members/${memberId}`).then(r => r.json());
      setData(updated);
      onUpdated();
    } finally { setSaving(null); }
  }

  async function updateField(field: string, value: unknown) {
    setSaving(field);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ [field]: value }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error); return; }
      toast.success('Updated');
      const updated = await fetch(`/api/admin/members/${memberId}`).then(r => r.json());
      setData(updated);
      onUpdated();
    } finally { setSaving(null); }
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/60" onClick={onClose} />
      <div className="w-[520px] bg-[#0D0D0D] border-l border-[rgba(212,175,55,0.15)] flex items-center justify-center">
        <div className="w-6 h-6 border border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!data) return null;
  const { profile, enrollments, eventRegs, ibReg } = data;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60" onClick={onClose} />

      {/* Drawer */}
      <div className="w-[520px] bg-[#0D0D0D] border-l border-[rgba(212,175,55,0.15)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A1000] to-[#B8860B] flex items-center justify-center text-sm font-bold font-serif text-[#D4AF37]">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-white font-semibold">{profile.full_name ?? 'Unknown'}</p>
              <p className={`text-[10px] tracking-[2px] uppercase ${ROLE_COLOR[profile.role]}`}>{profile.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors mt-1"><X size={16} /></button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── Role & Package ───────────────────────────── */}
          <Section icon={<UserCog size={14} />} title="Access & Role">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] tracking-[2px] text-[#555] uppercase mb-1.5">Role</label>
                <select
                  defaultValue={profile.role}
                  onChange={e => updateField('role', e.target.value)}
                  className={sCls}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] text-[#555] uppercase mb-1.5">Package</label>
                <select
                  defaultValue={profile.package_id ?? ''}
                  onChange={e => updateField('package_id', e.target.value || null)}
                  className={sCls}
                >
                  <option value="">No Package</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* ── Grant Course Access ───────────────────────── */}
          <Section icon={<BookOpen size={14} />} title={`Enrolled Courses (${enrollments.length})`}>
            {enrollments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {enrollments.map(enr => (
                  <div key={enr.id} className="flex items-center justify-between bg-[#111] border border-[rgba(255,255,255,0.05)] px-3 py-2">
                    <div>
                      <p className="text-xs text-white">{enr.course?.title ?? '—'}</p>
                      <p className="text-[10px] text-[#555] capitalize">{enr.payment_method.replace('_', ' ')} · ${enr.amount_paid.toFixed(2)}</p>
                    </div>
                    <button
                      onClick={() => patch('revoke_enrollment', { enrollment_id: enr.id })}
                      disabled={saving === 'revoke_enrollment'}
                      className="p-1 text-[#555] hover:text-red-400 transition-colors"
                      title="Revoke enrollment"
                    >
                      {saving === 'revoke_enrollment' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Grant new course */}
            <div className="flex gap-2">
              <select value={courseId} onChange={e => setCourseId(e.target.value)} className={`${sCls} flex-1`}>
                <option value="">Select course to grant...</option>
                {courses
                  .filter(c => !enrollments.some(e => e.course_id === c.id))
                  .map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <button
                onClick={() => { if (courseId) patch('grant_course', { course_id: courseId }); }}
                disabled={!courseId || saving === 'grant_course'}
                className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37] text-xs font-medium hover:bg-[rgba(212,175,55,0.2)] transition-all disabled:opacity-40"
              >
                {saving === 'grant_course' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Grant
              </button>
            </div>
          </Section>

          {/* ── Event Registrations ───────────────────────── */}
          {eventRegs.length > 0 && (
            <Section icon={<Calendar size={14} />} title={`Event Registrations (${eventRegs.length})`}>
              <div className="space-y-1.5">
                {eventRegs.map(reg => (
                  <div key={reg.id} className="flex items-center justify-between bg-[#111] border border-[rgba(255,255,255,0.05)] px-3 py-2">
                    <div>
                      <p className="text-xs text-white">{reg.event?.title ?? '—'}</p>
                      <p className="text-[10px] text-[#555] capitalize">{reg.ticket_type} · {reg.status}</p>
                    </div>
                    <span className={`text-[9px] uppercase tracking-[1px] ${reg.status === 'confirmed' ? 'text-green-400' : 'text-[#555]'}`}>
                      {reg.status}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── IB Registration Review ────────────────────── */}
          {ibReg && (
            <Section icon={<Network size={14} />} title="IB Registration">
              <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] p-4 space-y-3 mb-3">
                <Row label="Broker"  value={ibReg.broker_name} />
                <Row label="Account" value={ibReg.account_number} />
                <Row label="Status"  value={ibReg.status} colored={
                  ibReg.status === 'approved' ? 'text-green-400' :
                  ibReg.status === 'pending'  ? 'text-amber-400' : 'text-red-400'
                } />
                <Row label="Submitted" value={new Date(ibReg.submitted_at).toLocaleDateString()} />
              </div>

              {ibReg.status === 'pending' && (
                <>
                  <div className="mb-3">
                    <label className="block text-[9px] tracking-[2px] text-[#555] uppercase mb-1.5">Admin Notes</label>
                    <textarea
                      value={ibNotes}
                      onChange={e => setIbNotes(e.target.value)}
                      rows={2}
                      className={`${sCls} resize-none`}
                      placeholder="Optional review notes..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => patch('review_ib', { status: 'approved', admin_notes: ibNotes })}
                      disabled={!!saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/20 transition-all disabled:opacity-40"
                    >
                      {saving === 'review_ib' ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Approve
                    </button>
                    <button
                      onClick={() => patch('review_ib', { status: 'rejected', admin_notes: ibNotes })}
                      disabled={!!saving}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40"
                    >
                      <X size={12} /> Reject
                    </button>
                  </div>
                </>
              )}
            </Section>
          )}

          {/* IB status detail */}
          <div className="bg-[#111] border border-[rgba(255,255,255,0.05)] px-4 py-3">
            <p className="text-[9px] tracking-[2px] text-[#444] uppercase mb-2">Account Info</p>
            <Row label="Member ID"  value={profile.id.slice(0, 16) + '...'} />
            <Row label="IB Status"  value={profile.ib_status} />
            <Row label="Created"    value={new Date(profile.created_at).toLocaleDateString()} />
            {profile.stripe_customer_id && <Row label="Stripe" value={profile.stripe_customer_id} />}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Small helper sub-components ── */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[#D4AF37]">{icon}</span>
        <p className="text-xs font-semibold text-white tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, colored }: { label: string; value: string; colored?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.03)] last:border-0">
      <span className="text-[10px] text-[#555]">{label}</span>
      <span className={`text-[11px] font-mono capitalize ${colored ?? 'text-[#888]'}`}>{value}</span>
    </div>
  );
}

const sCls = 'w-full bg-[#0A0A0A] border border-[rgba(255,255,255,0.08)] text-white text-xs px-3 py-2 outline-none focus:border-[rgba(212,175,55,0.4)] transition-colors';
