import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/server';

export const SUPPORT_ATTACHMENT_BUCKET='support-attachments';
export const MAX_SUPPORT_ATTACHMENT_SIZE=10*1024*1024;

const ALLOWED_TYPES=new Map([
  ['image/jpeg','jpg'],
  ['image/png','png'],
  ['image/webp','webp'],
  ['image/gif','gif'],
  ['application/pdf','pdf'],
  ['text/plain','txt'],
  ['text/csv','csv'],
  ['application/msword','doc'],
  ['application/vnd.openxmlformats-officedocument.wordprocessingml.document','docx'],
  ['application/vnd.ms-excel','xls'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','xlsx'],
]);

export type StoredSupportAttachment={
  bucket:string;
  path:string;
  name:string;
  type:string;
  size:number;
};

export type SupportAttachment=Pick<StoredSupportAttachment,'name'|'type'|'size'>&{url:string};

export function validateSupportAttachment(file:File):string|null{
  if(file.size<=0)return 'The selected file is empty';
  if(file.size>MAX_SUPPORT_ATTACHMENT_SIZE)return 'The attachment must be 10 MB or smaller';
  if(!ALLOWED_TYPES.has(file.type))return 'Allowed files: JPG, PNG, WebP, GIF, PDF, TXT, CSV, DOC, DOCX, XLS, and XLSX';
  return null;
}

async function ensureBucket(){
  const {data}=await supabaseAdmin.storage.getBucket(SUPPORT_ATTACHMENT_BUCKET);
  if(data)return;
  const {error}=await supabaseAdmin.storage.createBucket(SUPPORT_ATTACHMENT_BUCKET,{public:false,fileSizeLimit:MAX_SUPPORT_ATTACHMENT_SIZE,allowedMimeTypes:[...ALLOWED_TYPES.keys()]});
  if(error&&!/already exists/i.test(error.message))throw new Error(`Attachment storage is unavailable: ${error.message}`);
}

function safeDisplayName(name:string){
  const cleaned=name.replace(/[\u0000-\u001f\u007f]/g,'').trim();
  return (cleaned||'attachment').slice(0,140);
}

export async function storeSupportAttachment(userId:string,file:File):Promise<StoredSupportAttachment>{
  const validation=validateSupportAttachment(file);
  if(validation)throw new Error(validation);
  await ensureBucket();
  const extension=ALLOWED_TYPES.get(file.type)!;
  const month=new Date().toISOString().slice(0,7);
  const path=`${userId}/${month}/${crypto.randomUUID()}.${extension}`;
  const bytes=Buffer.from(await file.arrayBuffer());
  const {error}=await supabaseAdmin.storage.from(SUPPORT_ATTACHMENT_BUCKET).upload(path,bytes,{contentType:file.type,cacheControl:'3600',upsert:false});
  if(error)throw new Error(`Upload failed: ${error.message}`);
  return {bucket:SUPPORT_ATTACHMENT_BUCKET,path,name:safeDisplayName(file.name),type:file.type,size:file.size};
}

export async function removeSupportAttachment(attachment:StoredSupportAttachment){
  await supabaseAdmin.storage.from(attachment.bucket).remove([attachment.path]);
}

function storedAttachment(metadata:unknown):StoredSupportAttachment|null{
  if(!metadata||typeof metadata!=='object')return null;
  const value=(metadata as Record<string,unknown>).attachment;
  if(!value||typeof value!=='object')return null;
  const item=value as Record<string,unknown>;
  if(item.bucket!==SUPPORT_ATTACHMENT_BUCKET||typeof item.path!=='string'||typeof item.name!=='string'||typeof item.type!=='string'||typeof item.size!=='number')return null;
  return {bucket:item.bucket,path:item.path,name:item.name,type:item.type,size:item.size};
}

export async function addSignedAttachments<T extends {metadata?:unknown}>(messages:T[]):Promise<Array<T&{attachment:SupportAttachment|null}>>{
  return Promise.all(messages.map(async message=>{
    const attachment=storedAttachment(message.metadata);
    if(!attachment)return {...message,attachment:null};
    const {data,error}=await supabaseAdmin.storage.from(attachment.bucket).createSignedUrl(attachment.path,60*60);
    return {...message,attachment:error||!data?.signedUrl?null:{name:attachment.name,type:attachment.type,size:attachment.size,url:data.signedUrl}};
  }));
}
