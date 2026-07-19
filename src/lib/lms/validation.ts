export function externalVideoUrl(value:unknown){
  const raw=String(value??'').trim();if(!raw)return null;
  try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw new Error();return url.toString();}
  catch{throw new Error('Video link must be a valid HTTP or HTTPS URL');}
}

export function cleanTitle(value:unknown,label='Title'){
  const title=String(value??'').trim();if(title.length<2||title.length>180)throw new Error(`${label} must be between 2 and 180 characters`);return title;
}
