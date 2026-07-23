// src/app/portal/courses/page.tsx
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase/server';
import { getCourseProgressSummaries } from '@/lib/lms/memberState';
import EnrolledCourseList  from '@/components/portal/courses/EnrolledCourseList';
import CourseMarketplace   from '@/components/portal/courses/CourseMarketplace';

export const dynamic = 'force-dynamic';

async function getData(userId: string) {
  try {
    const [enrollRes, allCoursesRes,profileRes] = await Promise.all([
      supabaseAdmin
        .from('enrollments').select('*, course:courses(*)')
        .eq('user_id', userId).eq('status', 'active')
        .order('enrolled_at', { ascending: false }),
      supabaseAdmin.from('courses').select('*').eq('is_published', true).order('sort_order'),
      supabaseAdmin.from('profiles').select('ib_status').eq('id',userId).single(),
    ]);
    const enrollments = enrollRes.data ?? [];
    const enrolledIds = new Set(enrollments.map((e: any) => e.course_id));
    const courseIds = [...enrolledIds] as string[];
    // Reuse the same gated LMS progress calculation used by the course player,
    // including module/final assessments and certificate status.
    const progressByCourse = await getCourseProgressSummaries(userId, courseIds);

    return {
      enrolled: enrollments.map((enrollment: any) => ({
        ...enrollment,
        lms_summary: progressByCourse.get(enrollment.course_id) ?? {
          completed: 0,
          total: 0,
          percent: 0,
          completed_assessments: 0,
          total_assessments: 0,
          average_score: null,
          latest_score: null,
          last_viewed_at: null,
          last_lesson_id: null,
          next_lesson_title: null,
          certificate_issued: false,
        },
      })),
      available: (allCoursesRes.data ?? []).filter((c: any) => !enrolledIds.has(c.id)),
      ibApproved:profileRes.data?.ib_status==='active',
    };
  } catch { return { enrolled: [], available: [], ibApproved:false }; }
}

export default async function MyCourses() {
  let user = null;
  try { const sb = await createSupabaseServerClient(); const { data } = await sb.auth.getUser(); user = data.user; } catch {}
  if (!user) return <div style={{padding:'2rem',color:'#888',fontFamily:'Montserrat,sans-serif'}}>Please <a href="/portal" style={{color:'#D4AF37'}}>sign in</a>.</div>;

  const { enrolled, available, ibApproved } = await getData(user.id);

  return (
    <div style={{ padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', fontFamily: 'Montserrat,sans-serif', color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: '2rem', animation: 'fadeUp .5s ease forwards' }}>
        <p style={{ fontFamily:'Cinzel,serif', fontSize:'.58rem', letterSpacing:'5px', textTransform:'uppercase', color:'#D4AF37', marginBottom:'8px' }}>Academy</p>
        <h1 style={{ fontFamily:'Cinzel,serif', fontSize:'2rem', fontWeight:900 }}>My Courses</h1>
        <p style={{ fontSize:'.72rem', color:'#666', marginTop:'8px', maxWidth:'620px', lineHeight:1.7 }}>
          {enrolled.length > 0
            ? `Continue learning across your ${enrolled.length} enrolled course${enrolled.length !== 1 ? 's' : ''} and track every completed lesson.`
            : 'Your enrolled courses and learning progress will appear here.'}
        </p>
      </div>

      {ibApproved&&<div style={{display:'flex',alignItems:'center',gap:'12px',padding:'14px 16px',marginBottom:'2rem',background:'rgba(52,211,153,.07)',border:'1px solid rgba(52,211,153,.22)',color:'#D1FAE5'}}><span style={{fontSize:'1.2rem'}}>✓</span><div><strong style={{fontFamily:'Cinzel,serif',fontSize:'.72rem',color:'#34D399'}}>VERIFIED ELITE COURSE BENEFIT</strong><p style={{fontSize:'.68rem',color:'#7EAA99',marginTop:'3px'}}>Your approved Elite access gives you free enrollment in every available course.</p></div></div>}

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
          <CourseMarketplace courses={available as any} ibApproved={ibApproved} />
        </div>
      )}
    </div>
  );
}
