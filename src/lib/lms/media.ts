import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const COURSE_MEDIA_BUCKET='course-media';
export const CERTIFICATE_MEDIA_BUCKET='course-certificates';
// Supabase's default project-level upload cap is 50 MB. Larger course videos
// should use the external URL option (YouTube, Vimeo, Bunny, Mux, etc.).
export const MAX_VIDEO_SIZE=50*1024*1024;
export const MAX_IMAGE_SIZE=10*1024*1024;
export const VIDEO_TYPES=new Map([
  ['video/mp4','mp4'],
  ['video/webm','webm'],
  ['video/ogg','ogv'],
  ['video/quicktime','mov'],
]);
export const IMAGE_TYPES=new Map([
  ['image/png','png'],
  ['image/jpeg','jpg'],
  ['image/webp','webp'],
  ['image/gif','gif'],
]);

export async function ensureCourseMediaBucket(){
  const options={public:false,fileSizeLimit:MAX_VIDEO_SIZE,allowedMimeTypes:[...VIDEO_TYPES.keys(),...IMAGE_TYPES.keys()]};
  const {data}=await supabaseAdmin.storage.getBucket(COURSE_MEDIA_BUCKET);
  if(data){
    const {error}=await supabaseAdmin.storage.updateBucket(COURSE_MEDIA_BUCKET,options);
    if(error)throw new Error(error.message);
    return;
  }
  const {error}=await supabaseAdmin.storage.createBucket(COURSE_MEDIA_BUCKET,options);
  if(error&&!/already exists/i.test(error.message))throw new Error(error.message);
}

export async function createLessonMediaUpload(courseId:string,fileName:string,contentType:string,size:number,mediaType:'video'|'image'){
  const typeMap=mediaType==='video'?VIDEO_TYPES:IMAGE_TYPES;
  const extension=typeMap.get(contentType);
  if(!extension)throw new Error(mediaType==='video'?'Use an MP4, WebM, OGG, or MOV video file':'Use a PNG, JPG, WebP, or GIF image file');
  const maximum=mediaType==='video'?MAX_VIDEO_SIZE:MAX_IMAGE_SIZE;
  if(size<=0||size>maximum)throw new Error(mediaType==='video'?'Direct video uploads must be 50 MB or smaller. Use an external video link for larger files':'Lesson images must be 10 MB or smaller');
  await ensureCourseMediaBucket();
  const fallback=mediaType==='video'?'lesson-video':'lesson-image';
  const safeBase=fileName.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||fallback;
  const path=`courses/${courseId}/${mediaType}/${crypto.randomUUID()}-${safeBase}.${extension}`;
  const {data,error}=await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if(error||!data)throw new Error(error?.message??'Could not prepare the video upload');
  return {path,token:data.token,bucket:COURSE_MEDIA_BUCKET};
}

export async function createVideoUpload(courseId:string,fileName:string,contentType:string,size:number){
  return createLessonMediaUpload(courseId,fileName,contentType,size,'video');
}

export async function createBrokerTutorialUpload(fileName:string,contentType:string,size:number){
  const extension=VIDEO_TYPES.get(contentType);
  if(!extension)throw new Error('Use an MP4, WebM, OGG, or MOV video file');
  if(size<=0||size>MAX_VIDEO_SIZE)throw new Error('Direct video uploads must be 50 MB or smaller. Use a YouTube, Vimeo, or hosted video link for larger files');
  await ensureCourseMediaBucket();
  const safeBase=fileName.replace(/\.[^.]+$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'broker-tutorial';
  const path=`brokers/tutorials/${crypto.randomUUID()}-${safeBase}.${extension}`;
  const {data,error}=await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).createSignedUploadUrl(path);
  if(error||!data)throw new Error(error?.message??'Could not prepare the broker tutorial upload');
  return {path,token:data.token,bucket:COURSE_MEDIA_BUCKET};
}

export async function signedCourseMediaUrl(path:string|null|undefined){
  if(!path)return null;const {data,error}=await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).createSignedUrl(path,60*60);
  return error?null:data.signedUrl;
}
export const signedVideoUrl=signedCourseMediaUrl;

export async function removeCourseMedia(path:string|null|undefined){if(path)await supabaseAdmin.storage.from(COURSE_MEDIA_BUCKET).remove([path]);}
export const removeVideo=removeCourseMedia;

export const CERTIFICATE_TEMPLATE_TYPES = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['application/pdf', 'pdf'],
]);
export const MAX_CERTIFICATE_TEMPLATE_SIZE = 10 * 1024 * 1024;

export async function ensureCertificateMediaBucket() {
  const {data} = await supabaseAdmin.storage.getBucket(CERTIFICATE_MEDIA_BUCKET);
  if (data) return;
  const {error} = await supabaseAdmin.storage.createBucket(CERTIFICATE_MEDIA_BUCKET, {
    public: false,
    fileSizeLimit: MAX_CERTIFICATE_TEMPLATE_SIZE,
    allowedMimeTypes: [...CERTIFICATE_TEMPLATE_TYPES.keys()],
  });
  if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
}

export async function uploadCertificateTemplate(courseId: string, file: File) {
  const extension = CERTIFICATE_TEMPLATE_TYPES.get(file.type);
  if (!extension) throw new Error('Certificate template must be a PNG, JPG, or PDF file');
  if (file.size <= 0 || file.size > MAX_CERTIFICATE_TEMPLATE_SIZE) {
    throw new Error('Certificate template must be 10 MB or smaller');
  }
  await ensureCertificateMediaBucket();
  const path = `templates/${courseId}/${crypto.randomUUID()}.${extension}`;
  const {error} = await supabaseAdmin.storage
    .from(CERTIFICATE_MEDIA_BUCKET)
    .upload(path, file, {contentType: file.type, upsert: false});
  if (error) throw new Error(error.message);
  return path;
}

export async function removeCertificateTemplate(path: string | null | undefined) {
  if (path) await supabaseAdmin.storage.from(CERTIFICATE_MEDIA_BUCKET).remove([path]);
}

export async function downloadCertificateTemplate(path: string) {
  const result = await supabaseAdmin.storage.from(CERTIFICATE_MEDIA_BUCKET).download(path);
  if (result.error || !result.data) throw new Error(result.error?.message ?? 'Certificate template could not be loaded');
  return result.data;
}
