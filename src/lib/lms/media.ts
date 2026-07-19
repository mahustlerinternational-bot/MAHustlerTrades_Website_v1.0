import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const COURSE_MEDIA_BUCKET='course-media';
// Supabase's default project-level upload cap is 50 MB. Larger course videos
// should use the external URL option (YouTube, Vimeo, Bunny, Mux, etc.).
export const MAX_VIDEO_SIZE=50*1024*1024;
export const VIDEO_TYPES=new Map([
  ['video/mp4','mp4'],
  ['video/webm','webm'],
  ['video/ogg','ogv'],
  ['video/quicktime','mov'],
]);

export async function ensureCourseMediaBucket(){
  const {data}=await supabaseAdmin.storage.getBucket(COURSE_MEDIA_BUCKET);if(data)return;
  const {error}=await supabaseAdmin.storage.createBucket(COURSE_MEDIA_BUCKET,{public:false,fileSizeLimit:MAX_VIDEO_SIZE,allowedMimeTypes:[...VIDEO_TYPES.keys()]});
  if(error&&!/already exists/i.test(error.message))throw new Error(error.message);
}

export async function createVideoUpload(courseId:string,fileName:string,contentType:string,size:number){
  const extension=VIDEO_TYPES.get(contentType);if(!extension)throw new Error('Use an MP4, WebM, OGG, or MOV video file');
  if(size<=0||size>MAX_VIDEO_SIZE)throw new Error('Direct video uploads must be 50 MB or smaller. Use an external video link for larger files');
  await ensureCourseMediaBucket();
  const safeBase=fileName.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'lesson-video';
  const path=`courses/${courseId}/${crypto.randomUUID()}-${safeBase}.${extension}`;
  const {data,error}=await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if(error||!data)throw new Error(error?.message??'Could not prepare the video upload');
  return {path,token:data.token,bucket:COURSE_MEDIA_BUCKET};
}

export async function signedVideoUrl(path:string|null|undefined){
  if(!path)return null;const {data,error}=await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).createSignedUrl(path,60*60);
  return error?null:data.signedUrl;
}

export async function removeVideo(path:string|null|undefined){if(path)await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).remove([path]);}
