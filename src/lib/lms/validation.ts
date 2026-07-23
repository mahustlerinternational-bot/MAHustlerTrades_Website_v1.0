import type {LessonMedia} from '@/types/lms';

export function externalVideoUrl(value:unknown){
  const raw=String(value??'').trim();if(!raw)return null;
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error();return url.toString();}
  catch{throw new Error('Video link must be a valid HTTP or HTTPS URL');}
}

export function externalMediaUrl(value:unknown,label='Media link'){
  const raw=String(value??'').trim();if(!raw)return null;
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error();return url.toString();}
  catch{throw new Error(`${label} must be a valid HTTP or HTTPS URL`);}
}

export function lessonMediaInput(
  value:unknown,
  courseId:string,
  label:string,
):LessonMedia|null{
  if(value===null||value===undefined||value==='')return null;
  if(typeof value!=='object'||Array.isArray(value))throw new Error(`${label} is invalid`);
  const source=value as Record<string,unknown>;
  const type=String(source.type??'');
  if(type!=='video'&&type!=='image')throw new Error(`${label} must be a video or image`);
  const storagePath=String(source.storage_path??'').trim()||null;
  const url=storagePath?null:externalMediaUrl(source.url,`${label} link`);
  if(storagePath&&!storagePath.startsWith(`courses/${courseId}/`)){
    throw new Error(`${label} has an invalid storage path`);
  }
  if(!storagePath&&!url)throw new Error(`${label} requires an upload or external link`);
  return {type,url,storage_path:storagePath};
}

export function cleanTitle(value:unknown,label='Title'){
  const title=String(value??'').trim();if(title.length<2||title.length>180)throw new Error(`${label} must be between 2 and 180 characters`);return title;
}
