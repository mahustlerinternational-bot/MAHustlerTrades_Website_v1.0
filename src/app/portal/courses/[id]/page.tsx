import CoursePlayer from '@/components/portal/lms/CoursePlayer';

export default async function CoursePlayerPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <CoursePlayer courseId={id}/>;}
