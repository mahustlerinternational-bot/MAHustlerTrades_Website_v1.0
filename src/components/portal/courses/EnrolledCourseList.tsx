'use client';
// src/components/portal/courses/EnrolledCourseList.tsx
import Link from 'next/link';
import { BookOpen, CheckCircle, Clock, PlayCircle } from 'lucide-react';
import type { Enrollment, Course } from '@/types';

interface EnrollmentWithCourse extends Enrollment { course: Course; }

function formatDuration(hours: number) {
  const totalMinutes = Math.max(0, Math.round(Number(hours) * 60));
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}

export function EnrolledCourseList({ enrollments }: { enrollments: EnrollmentWithCourse[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {enrollments.map(enr => (
        <div key={enr.id} className="bg-[#111] border border-[rgba(212,175,55,0.15)] overflow-hidden group hover:border-[rgba(212,175,55,0.3)] transition-all">
          {/* Cover */}
          <div className="h-32 bg-gradient-to-br from-[#0D0D0D] to-[#1A1500] flex items-center justify-center text-4xl border-b border-[rgba(255,255,255,0.05)] relative overflow-hidden">
            {enr.course.cover_image_url
              ? <img src={enr.course.cover_image_url} alt="" className="w-full h-full object-cover" />
              : <span>📈</span>
            }
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayCircle size={32} className="text-[#D4AF37]" />
            </div>
          </div>

          <div className="p-4">
            <p className="text-[9px] tracking-[2px] text-[#D4AF37] uppercase mb-1">{enr.course.level}</p>
            <h3 className="text-xs font-semibold text-white leading-tight mb-2">{enr.course.title}</h3>

            {/* Meta */}
            <div className="flex items-center gap-3 text-[10px] text-[#555] mb-3">
              {enr.course.duration_hours && <span className="flex items-center gap-1"><Clock size={10}/> {formatDuration(enr.course.duration_hours)}</span>}
              {enr.course.lesson_count   && <span className="flex items-center gap-1"><BookOpen size={10}/> {enr.course.lesson_count} lessons</span>}
            </div>

            {/* Enrolled badge */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] tracking-[1.5px] uppercase text-green-400">
                <CheckCircle size={10} /> Enrolled
              </span>
              <span className="text-[9px] text-[#777] tracking-[0.5px]">Enrollment Grant</span>
            </div>
            <Link href={`/portal/courses/${enr.course.id}`} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'7px',marginTop:'12px',padding:'9px 12px',background:'linear-gradient(135deg,#B8860B,#D4AF37)',color:'#000',textDecoration:'none',fontFamily:'Cinzel,serif',fontSize:'.62rem',fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase'}}><PlayCircle size={13}/> Open Course</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EnrolledCourseList;
