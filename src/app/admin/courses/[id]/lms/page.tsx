import LmsBuilder from '@/components/admin/lms/LmsBuilder';

export default async function AdminLmsPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <LmsBuilder courseId={id}/>;}
