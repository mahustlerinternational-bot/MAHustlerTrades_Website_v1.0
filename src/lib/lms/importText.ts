export interface ImportedLesson{title:string;content:string;video_url:string|null;}
export interface ImportedModule{title:string;description:string|null;lessons:ImportedLesson[];}

function cleanHeading(line:string,prefix:RegExp){return line.replace(prefix,'').trim();}

export function parseLmsText(source:string,fallbackTitle='Imported Module'):ImportedModule[]{
  const text=source.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  if(!text)throw new Error('The text file is empty');
  const modules:ImportedModule[]=[];let currentModule:ImportedModule|null=null;let currentLesson:ImportedLesson|null=null;let buffer:string[]=[];
  const finishLesson=()=>{if(!currentLesson)return;currentLesson.content=buffer.join('\n').trim();buffer=[];currentModule?.lessons.push(currentLesson);currentLesson=null;};
  const finishModule=()=>{finishLesson();if(currentModule){if(!currentModule.lessons.length)currentModule.lessons.push({title:'Lesson 1',content:'',video_url:null});modules.push(currentModule);}currentModule=null;};
  const startModule=(title:string)=>{finishModule();currentModule={title:title||fallbackTitle,description:null,lessons:[]};};
  const startLesson=(title:string)=>{if(!currentModule)startModule(fallbackTitle);finishLesson();currentLesson={title:title||`Lesson ${(currentModule?.lessons.length??0)+1}`,content:'',video_url:null};};

  for(const rawLine of text.split('\n')){
    const line=rawLine.trim();
    if(/^#\s+/.test(line)||/^MODULE\s*:/i.test(line)){startModule(cleanHeading(line,/^(?:#\s+|MODULE\s*:\s*)/i));continue;}
    if(/^##\s+/.test(line)||/^LESSON\s*:/i.test(line)){startLesson(cleanHeading(line,/^(?:##\s+|LESSON\s*:\s*)/i));continue;}
    if(/^VIDEO\s*:/i.test(line)&&currentLesson){const value=cleanHeading(line,/^VIDEO\s*:\s*/i);(currentLesson as ImportedLesson).video_url=/^https?:\/\//i.test(value)?value:null;continue;}
    if(!currentModule)startModule(fallbackTitle);if(!currentLesson)startLesson('Lesson 1');buffer.push(rawLine);
  }
  finishModule();return modules;
}
