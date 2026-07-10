import { Suspense } from 'react';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'64px' }}>
        <div style={{ width:'20px', height:'20px', border:'2px solid #D4AF37', borderTopColor:'transparent', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      </div>
    }>
      <ProfileClient />
    </Suspense>
  );
}
