// src/app/portal/courses/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import EnrolledCourseList  from '@/components/portal/courses/EnrolledCourseList';
import CourseMarketplace   from '@/components/portal/courses/CourseMarketplace';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [enrollRes, allCoursesRes] = await Promise.all([
      supabaseAdmin
        .from('enrollments').select('*, course:courses(*)')
        .eq('user_id', userId).eq('status', 'active')
        .order('enrolled_at', { ascending: false }),
      supabaseAdmin.from('courses').select('*').eq('is_published', true).order('sort_order'),
    ]);
    const enrolledIds = new Set((enrollRes.data ?? []).map((e: any) => e.course_id));
    return {
      enrolled:  enrollRes.data ?? [],
      available: (allCoursesRes.data ?? []).filter((c: any) => !enrolledIds.has(c.id)),
    };
  } catch { return { enrolled: [], available: [] }; }
}

export default async function MyCourses() {
  let session = null;
  try { const sb = createSupabaseServerClient(); const { data } = await sb.auth.getSession(); session = data.session; } catch {}
  if (!session?.user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { enrolled, available } = await getData(session.user.id);

  return (
    <div style={{ padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Montserrat,sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '2rem', animation: 'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Academy</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>My Courses</h1>
        <p style={{ fontSize:'.72rem', color:'#555', marginTop:'6px' }}>
          {enrolled.length > 0 ? `${enrolled.length} course${enrolled.length !== 1 ? 's' : ''} enrolled` : 'No courses enrolled yet'}
        </p>
      </div>

      {/* Enrolled */}
      {enrolled.length > 0 ? (
        <div style={{ marginBottom: '3rem', animation: 'fadeUp .5s .08s ease forwards', opacity: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.25rem' }}>
            <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#D4AF37,#B8860B)' }} />
            <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Enrolled Courses</p>
          </div>
          <EnrolledCourseList enrollments={enrolled as any} />
        </div>
      ) : (
        <div style={{ background:'#111', border:'1px solid rgba(255,255,255,.06)', padding:'3rem', textAlign:'center', marginBottom:'3rem', animation:'fadeUp .5s .08s ease forwards', opacity:0 }}>
          <p style={{ fontSize:'2.5rem', marginBottom:'12px' }}>🎓</p>
          <p style={{ fontFamily:'Cinzel,serif', fontSize:'.9rem', fontWeight:600, marginBottom:'6px' }}>No Courses Yet</p>
          <p style={{ fontSize:'.78rem', color:'#555' }}>Browse the available courses below and enroll to start learning.</p>
        </div>
      )}

      {/* Marketplace */}
      {available.length > 0 && (
        <div style={{ animation: 'fadeUp .5s .16s ease forwards', opacity: 0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'3rem', marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
              <div style={{ width:'3px', height:'18px', background:'linear-gradient(180deg,#60A5FA,#2563EB)' }} />
              <p style={{ fontFamily:'Cinzel,serif', fontSize:'.72rem', fontWeight:700, letterSpacing:'1px' }}>Available Courses</p>
            </div>
            <div style={{ flex:1, height:'1px', background:'rgba(255,255,255,.04)' }} />
            <p style={{ fontSize:'.65rem', color:'#555' }}>{available.length} course{available.length !== 1 ? 's' : ''} available</p>
          </div>
          <CourseMarketplace courses={available as any} />
        </div>
      )}
    </div>
  );
}
