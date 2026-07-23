'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Import,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {toast} from 'sonner';

import AssessmentEditorModal, {
  type AssessmentTarget,
} from '@/components/admin/lms/AssessmentEditorModal';
import CourseLmsSettingsModal from '@/components/admin/lms/CourseLmsSettingsModal';
import {supabase} from '@/lib/supabase/client';
import {authFetch} from '@/lib/utils/authFetch';
import type {LessonMedia, LessonMediaType, LmsAssessment, LmsLesson, LmsModule} from '@/types/lms';

type BuilderCourse = {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  lms_sequential?: boolean;
  certificate_template_path?: string | null;
  certificate_template_name?: string | null;
  certificate_title?: string | null;
  certificate_signatory_name?: string | null;
  certificate_signatory_title?: string | null;
  certificate_layout?: import('@/lib/lms/certificateLayout').CertificateLayout | null;
};

type BuilderData = {
  course: BuilderCourse;
  modules: LmsModule[];
  assessments: LmsAssessment[];
};

type ModuleDraft = {
  id?: string;
  title: string;
  description: string;
};

type LessonDraft = {
  id?: string;
  module_id: string;
  parent_lesson_id: string | null;
  title: string;
  content: string;
  intro_media: LessonMediaDraft;
  outro_media: LessonMediaDraft;
  duration_minutes: string;
  is_preview: boolean;
  is_published: boolean;
};

type LessonMediaSlot = 'intro' | 'outro';
type LessonMediaDraft = {
  type: LessonMediaType | 'none';
  url: string;
  storage_path: string | null;
  playback_url: string | null;
};

const emptyMediaDraft = (): LessonMediaDraft => ({
  type: 'none',
  url: '',
  storage_path: null,
  playback_url: null,
});

function mediaDraft(
  media: LessonMedia | null | undefined,
  playbackUrl: string | null | undefined,
  legacy?: {url?: string | null; storage_path?: string | null; playback_url?: string | null},
): LessonMediaDraft {
  const normalized = media ?? (
    legacy?.url || legacy?.storage_path
      ? {type: 'video' as const, url: legacy.url ?? null, storage_path: legacy.storage_path ?? null}
      : null
  );
  return normalized
    ? {
        type: normalized.type,
        url: normalized.storage_path ? '' : (normalized.url ?? ''),
        storage_path: normalized.storage_path ?? null,
        playback_url: playbackUrl ?? legacy?.playback_url ?? normalized.url ?? null,
      }
    : emptyMediaDraft();
}

type AssessmentEditorState = {
  target: AssessmentTarget;
  existing: LmsAssessment | null;
};

export default function LmsBuilder({courseId}: {courseId: string}) {
  const [data, setData] = useState<BuilderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [assessmentEditor, setAssessmentEditor] = useState<AssessmentEditorState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<LessonMediaSlot | null>(null);
  const [mediaFiles, setMediaFiles] = useState<Record<LessonMediaSlot, File | null>>({
    intro: null,
    outro: null,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const importInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authFetch(`/api/admin/lms/courses/${courseId}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData({...result, assessments: result.assessments ?? []});
      setExpanded(current => {
        const next = {...current};
        for (const courseModule of result.modules ?? []) {
          if (next[courseModule.id] === undefined) next[courseModule.id] = true;
        }
        return next;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load LMS');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveModule() {
    if (!moduleDraft?.title.trim() || saving) return;
    setSaving(true);
    try {
      const response = await authFetch(
        moduleDraft.id ? `/api/admin/lms/modules/${moduleDraft.id}` : '/api/admin/lms/modules',
        {
          method: moduleDraft.id ? 'PATCH' : 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({...moduleDraft, course_id: courseId}),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(moduleDraft.id ? 'Module updated' : 'Module created');
      setModuleDraft(null);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Module save failed');
    } finally {
      setSaving(false);
    }
  }

  async function removeModule(courseModule: LmsModule) {
    if (!confirm(`Delete module “${courseModule.title}”, all lessons, submodules, and assessments?`)) return;
    const response = await authFetch(`/api/admin/lms/modules/${courseModule.id}`, {method: 'DELETE'});
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    toast.success('Module deleted');
    await load();
  }

  async function removeLesson(lesson: LmsLesson) {
    const label = lesson.parent_lesson_id ? 'submodule' : 'lesson';
    if (!confirm(`Delete ${label} “${lesson.title}”${lesson.parent_lesson_id ? '' : ' and all of its submodules'}?`)) return;
    const response = await authFetch(`/api/admin/lms/lessons/${lesson.id}`, {method: 'DELETE'});
    const result = await response.json();
    if (!response.ok) return toast.error(result.error);
    toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`);
    await load();
  }

  function editLesson(moduleId: string, lesson?: LmsLesson, parentLessonId: string | null = null) {
    setMediaFiles({intro: null, outro: null});
    setLessonDraft(
      lesson
        ? {
            id: lesson.id,
            module_id: moduleId,
            parent_lesson_id: lesson.parent_lesson_id ?? null,
            title: lesson.title,
            content: lesson.content ?? '',
            intro_media: mediaDraft(
              lesson.intro_media,
              lesson.intro_playback_url,
              {
                url: lesson.video_url,
                storage_path: lesson.video_storage_path,
                playback_url: lesson.playback_url,
              },
            ),
            outro_media: mediaDraft(lesson.outro_media, lesson.outro_playback_url),
            duration_minutes: lesson.duration_seconds
              ? String(Math.round(lesson.duration_seconds / 60))
              : '',
            is_preview: lesson.is_preview,
            is_published: lesson.is_published,
          }
        : {
            module_id: moduleId,
            parent_lesson_id: parentLessonId,
            title: '',
            content: '',
            intro_media: emptyMediaDraft(),
            outro_media: emptyMediaDraft(),
            duration_minutes: '',
            is_preview: false,
            is_published: false,
          },
    );
  }

  async function uploadMedia(file: File, mediaType: LessonMediaType, slot: LessonMediaSlot) {
    setUploadingSlot(slot);
    try {
      const prepared = await authFetch('/api/admin/lms/media-upload', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          course_id: courseId,
          media_type: mediaType,
          file_name: file.name,
          content_type: file.type,
          size: file.size,
        }),
      });
      const details = await prepared.json();
      if (!prepared.ok) throw new Error(details.error);
      const uploaded = await supabase.storage
        .from(details.bucket)
        .uploadToSignedUrl(details.path, details.token, file, {
          contentType: file.type,
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;
      return details.path as string;
    } finally {
      setUploadingSlot(null);
    }
  }

  async function saveLesson() {
    if (!lessonDraft?.title.trim() || saving) return;
    setSaving(true);
    try {
      async function resolvedMedia(slot:LessonMediaSlot,draftMedia:LessonMediaDraft){
        if(draftMedia.type==='none')return null;
        let storagePath=draftMedia.storage_path;
        const file=mediaFiles[slot];
        if(file)storagePath=await uploadMedia(file,draftMedia.type,slot);
        return {
          type:draftMedia.type,
          url:storagePath?null:draftMedia.url,
          storage_path:storagePath,
        };
      }
      const [introMedia,outroMedia]=await Promise.all([
        resolvedMedia('intro',lessonDraft.intro_media),
        resolvedMedia('outro',lessonDraft.outro_media),
      ]);
      const payload: Record<string, unknown> = {
        module_id: lessonDraft.module_id,
        parent_lesson_id: lessonDraft.parent_lesson_id,
        title: lessonDraft.title,
        content: lessonDraft.content,
        duration_seconds: lessonDraft.duration_minutes
          ? Number(lessonDraft.duration_minutes) * 60
          : null,
        is_preview: lessonDraft.is_preview,
        is_published: lessonDraft.is_published,
        intro_media:introMedia,
        outro_media:outroMedia,
      };
      const response = await authFetch(
        lessonDraft.id ? `/api/admin/lms/lessons/${lessonDraft.id}` : '/api/admin/lms/lessons',
        {
          method: lessonDraft.id ? 'PATCH' : 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const label = lessonDraft.parent_lesson_id ? 'Submodule' : 'Lesson';
      toast.success(`${label} ${lessonDraft.id ? 'updated' : 'created'}`);
      setLessonDraft(null);
      setMediaFiles({intro:null,outro:null});
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lesson save failed');
    } finally {
      setSaving(false);
    }
  }

  async function reorder(
    type: 'modules' | 'lessons',
    containerId: string,
    items: Array<{id: string}>,
    index: number,
    direction: -1 | 1,
    parentLessonId: string | null = null,
  ) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    const response = await authFetch('/api/admin/lms/reorder', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type,
        container_id: containerId,
        parent_lesson_id: parentLessonId,
        ordered_ids: ordered.map(item => item.id),
      }),
    });
    if (!response.ok) toast.error((await response.json()).error ?? 'Reorder failed');
    await load();
  }

  async function importText(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.set('course_id', courseId);
    form.set('file', file);
    const toastId = toast.loading('Importing curriculum…');
    try {
      const response = await authFetch('/api/admin/lms/import', {method: 'POST', body: form});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.success(`Imported ${result.modules} module(s) and ${result.lessons} lesson(s)`, {
        id: toastId,
      });
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed', {id: toastId});
    }
  }

  function assessmentFor(
    target: Pick<AssessmentTarget, 'scope' | 'module_id' | 'lesson_id'>,
  ) {
    return (
      data?.assessments.find(assessment => {
        if (assessment.scope !== target.scope) return false;
        if (target.module_id) return assessment.module_id === target.module_id;
        if (target.lesson_id) return assessment.lesson_id === target.lesson_id;
        return assessment.scope === 'final';
      }) ?? null
    );
  }

  function openAssessment(target: AssessmentTarget) {
    setAssessmentEditor({target, existing: assessmentFor(target)});
  }

  if (loading && !data) {
    return (
      <div style={pageStyle}>
        <div style={{display: 'grid', placeItems: 'center', minHeight: '60vh'}}>
          <Loader2 size={28} color="#D4AF37" className="animate-spin" />
        </div>
      </div>
    );
  }
  if (!data) {
    return <div style={pageStyle}><p style={{color: '#FF6B78'}}>The course builder could not be loaded.</p></div>;
  }

  const lessonTotal = data.modules.reduce((sum, courseModule) => sum + courseModule.lessons.length, 0);
  const published = data.modules.reduce(
    (sum, courseModule) => sum + courseModule.lessons.filter(lesson => lesson.is_published).length,
    0,
  );
  const finalAssessment = assessmentFor({
    scope: 'final',
    module_id: null,
    lesson_id: null,
  });

  return (
    <div style={pageStyle}>
      <style>{`
        .lms-action:hover{border-color:rgba(212,175,55,.4)!important;color:#D4AF37!important}
        @media(max-width:720px){
          .lms-builder-grid{grid-template-columns:1fr!important}
          .lms-builder-hide-mobile{display:none!important}
        }
      `}</style>

      <div style={pageHeader}>
        <div>
          <Link href="/admin/courses" style={{fontSize: '.65rem', color: '#777', textDecoration: 'none'}}>
            ← Course Management
          </Link>
          <p style={eyebrow}>LMS BUILDER</p>
          <h1 style={{fontFamily: 'Cinzel,serif', fontSize: '1.7rem', marginTop: '6px'}}>
            {data.course.title}
          </h1>
          <p style={{fontSize: '.68rem', color: '#555', marginTop: '5px'}}>
            {data.modules.length} modules · {lessonTotal} lessons/submodules · {published} published ·{' '}
            {data.assessments.length} assessments
          </p>
        </div>
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <input
            ref={importInput}
            type="file"
            accept=".txt,.md,.markdown"
            hidden
            onChange={event => void importText(event)}
          />
          <button onClick={() => setSettingsOpen(true)} style={outlineButton}>
            <Settings size={14} /> LMS Settings
          </button>
          <button
            onClick={() =>
              openAssessment({
                scope: 'final',
                module_id: null,
                lesson_id: null,
                label: 'Final Course Assessment',
              })
            }
            style={finalAssessment?.is_published ? successOutlineButton : outlineButton}
          >
            <Award size={14} />{' '}
            {finalAssessment ? 'Edit Final Course Assessment' : 'Add Final Course Assessment'}
          </button>
          <button onClick={() => importInput.current?.click()} style={outlineButton}>
            <Import size={14} /> Import Text
          </button>
          <button onClick={() => setModuleDraft({title: '', description: ''})} style={goldButton}>
            <FolderPlus size={14} /> Add Module
          </button>
        </div>
      </div>

      <div style={helpPanel}>
        <p style={{fontSize: '.68rem', color: '#93B7E8', lineHeight: 1.65, flex: '1 1 520px'}}>
          <strong>Course structure:</strong> Course → Module → Lesson → optional Submodules.
          Add a required assessment to each learning step and a module assessment to create passing
          gates. Text import uses <code># Module Title</code>, <code>## Lesson Title</code>, followed
          by lesson text.
        </p>
        <a
          href="/templates/lms-course-template.txt"
          download
          style={{...outlineButton, textDecoration: 'none', whiteSpace: 'nowrap'}}
        >
          <FileText size={13} /> Download Template
        </a>
      </div>

      {data.modules.length === 0 ? (
        <div style={emptyState}>
          <BookOpen size={32} color="#555" />
          <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem'}}>Build Your Curriculum</h2>
          <p style={{fontSize: '.72rem', color: '#666'}}>
            Add a module manually or import a prepared TXT/Markdown curriculum.
          </p>
        </div>
      ) : (
        <div style={{display: 'grid', gap: '12px'}}>
          {data.modules.map((courseModule, moduleIndex) => {
            const topLessons = courseModule.lessons.filter(lesson => !lesson.parent_lesson_id);
            const moduleAssessment = assessmentFor({
              scope: 'module',
              module_id: courseModule.id,
              lesson_id: null,
            });
            return (
              <section key={courseModule.id} style={moduleCard}>
                <header style={moduleHeader}>
                  <button
                    onClick={() =>
                      setExpanded(value => ({...value, [courseModule.id]: !value[courseModule.id]}))
                    }
                    style={expandButton}
                  >
                    {expanded[courseModule.id] ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
                  </button>
                  <div style={{flex: 1, minWidth: 0}}>
                    <p style={{fontSize: '.55rem', letterSpacing: '2px', color: '#666'}}>
                      MODULE {String(moduleIndex + 1).padStart(2, '0')}
                    </p>
                    <h2 style={moduleTitle}>{courseModule.title}</h2>
                    {courseModule.description && (
                      <p style={{fontSize: '.63rem', color: '#666', marginTop: '3px'}}>
                        {courseModule.description}
                      </p>
                    )}
                  </div>
                  <span className="lms-builder-hide-mobile" style={countBadge}>
                    {courseModule.lessons.length} units
                  </span>
                  <button
                    className="lms-action"
                    onClick={() =>
                      openAssessment({
                        scope: 'module',
                        module_id: courseModule.id,
                        lesson_id: null,
                        label: `Module ${moduleIndex + 1} - Module Assessment`,
                      })
                    }
                    style={moduleAssessment?.is_published ? activeQuizWideButton : quizButton}
                    title="Module assessment"
                  >
                    <ClipboardCheck size={13} />
                    <span className="lms-builder-hide-mobile">
                      {moduleAssessment ? 'Assessment' : 'Add Quiz'}
                    </span>
                  </button>
                  <MoveButtons
                    index={moduleIndex}
                    total={data.modules.length}
                    onMove={direction =>
                      void reorder('modules', courseId, data.modules, moduleIndex, direction)
                    }
                  />
                  <button
                    className="lms-action"
                    onClick={() =>
                      setModuleDraft({
                        id: courseModule.id,
                        title: courseModule.title,
                        description: courseModule.description ?? '',
                      })
                    }
                    style={iconButton}
                    title="Edit module"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => void removeModule(courseModule)}
                    style={{...iconButton, color: '#FF6B78'}}
                    title="Delete module"
                  >
                    <Trash2 size={13} />
                  </button>
                </header>

                {expanded[courseModule.id] && (
                  <div style={{padding: '10px 14px 14px'}}>
                    {topLessons.length === 0 ? (
                      <p style={emptyModuleText}>No lessons in this module yet.</p>
                    ) : (
                      <div style={{display: 'grid', gap: '8px'}}>
                        {topLessons.map((lesson, lessonIndex) => {
                          const submodules = courseModule.lessons.filter(
                            item => item.parent_lesson_id === lesson.id,
                          );
                          return (
                            <div key={lesson.id} style={lessonGroup}>
                              <LessonRow
                                lesson={lesson}
                                index={lessonIndex}
                                total={topLessons.length}
                                assessment={assessmentFor({
                                  scope: 'lesson',
                                  module_id: null,
                                  lesson_id: lesson.id,
                                })}
                                onMove={direction =>
                                  void reorder(
                                    'lessons',
                                    courseModule.id,
                                    topLessons,
                                    lessonIndex,
                                    direction,
                                  )
                                }
                                onEdit={() => editLesson(courseModule.id, lesson)}
                                onDelete={() => void removeLesson(lesson)}
                                onAssessment={() =>
                                  openAssessment({
                                    scope: 'lesson',
                                    module_id: null,
                                    lesson_id: lesson.id,
                                    label: `Lesson ${moduleIndex + 1}.${lessonIndex + 1} - Lesson Assessment`,
                                  })
                                }
                                onAddSubmodule={() =>
                                  editLesson(courseModule.id, undefined, lesson.id)
                                }
                              />

                              {submodules.length > 0 && (
                                <div style={submoduleList}>
                                  <div style={submoduleLabel}>
                                    <Layers3 size={11} /> SUBMODULES
                                  </div>
                                  {submodules.map((submodule, submoduleIndex) => (
                                    <LessonRow
                                      key={submodule.id}
                                      lesson={submodule}
                                      index={submoduleIndex}
                                      total={submodules.length}
                                      assessment={assessmentFor({
                                        scope: 'submodule',
                                        module_id: null,
                                        lesson_id: submodule.id,
                                      })}
                                      nested
                                      onMove={direction =>
                                        void reorder(
                                          'lessons',
                                          courseModule.id,
                                          submodules,
                                          submoduleIndex,
                                          direction,
                                          lesson.id,
                                        )
                                      }
                                      onEdit={() => editLesson(courseModule.id, submodule)}
                                      onDelete={() => void removeLesson(submodule)}
                                      onAssessment={() =>
                                        openAssessment({
                                          scope: 'submodule',
                                          module_id: null,
                                          lesson_id: submodule.id,
                                          label: `Lesson ${moduleIndex + 1}.${lessonIndex + 1}.${submoduleIndex + 1} - Submodule Assessment`,
                                        })
                                      }
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      onClick={() => editLesson(courseModule.id)}
                      style={{...outlineButton, width: '100%', justifyContent: 'center', marginTop: '9px'}}
                    >
                      <Plus size={13} /> Add Lesson
                    </button>

                    <div style={moduleGatePanel}>
                      <div>
                        <p style={{fontSize: '.56rem', letterSpacing: '1.8px', color: '#D4AF37'}}>
                          MODULE COMPLETION GATE
                        </p>
                        <p style={{fontSize: '.6rem', color: '#666', marginTop: '4px'}}>
                          {moduleAssessment
                            ? `${moduleAssessment.title} · ${moduleAssessment.passing_score}% passing score · ${moduleAssessment.is_published ? 'Published' : 'Draft'}`
                            : 'Add an assessment members must pass before the next module unlocks.'}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          openAssessment({
                            scope: 'module',
                            module_id: courseModule.id,
                            lesson_id: null,
                            label: `Module ${moduleIndex + 1} - Module Assessment`,
                          })
                        }
                        style={moduleAssessment ? successOutlineButton : outlineButton}
                      >
                        <ClipboardCheck size={13} />
                        {moduleAssessment ? 'Edit Module Assessment' : 'Add Module Assessment'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {moduleDraft && (
        <ModuleModal
          draft={moduleDraft}
          setDraft={setModuleDraft}
          saving={saving}
          onSave={() => void saveModule()}
          onClose={() => setModuleDraft(null)}
        />
      )}
      {lessonDraft && (
        <LessonModal
          draft={lessonDraft}
          setDraft={setLessonDraft}
          mediaFiles={mediaFiles}
          setMediaFile={(slot,file)=>setMediaFiles(current=>({...current,[slot]:file}))}
          saving={saving || Boolean(uploadingSlot)}
          uploadingSlot={uploadingSlot}
          onSave={() => void saveLesson()}
          onClose={() => {
            setLessonDraft(null);
            setMediaFiles({intro:null,outro:null});
          }}
        />
      )}
      {assessmentEditor && (
        <AssessmentEditorModal
          courseId={courseId}
          target={assessmentEditor.target}
          existing={assessmentEditor.existing}
          onSaved={load}
          onClose={() => setAssessmentEditor(null)}
        />
      )}
      {settingsOpen && (
        <CourseLmsSettingsModal
          course={data.course}
          onSaved={load}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  total,
  assessment,
  nested = false,
  onMove,
  onEdit,
  onDelete,
  onAssessment,
  onAddSubmodule,
}: {
  lesson: LmsLesson;
  index: number;
  total: number;
  assessment: LmsAssessment | null;
  nested?: boolean;
  onMove: (direction: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
  onAssessment: () => void;
  onAddSubmodule?: () => void;
}) {
  return (
    <div style={{...lessonRow, background: nested ? '#090909' : '#0B0B0B'}}>
      <span style={{width: '25px', fontSize: '.6rem', color: '#555'}}>
        {nested ? `${index + 1}.` : `${index + 1}.`}
      </span>
      <span style={{color: lesson.intro_media || lesson.outro_media || lesson.video_url || lesson.video_storage_path ? '#D4AF37' : '#777'}}>
        {lesson.intro_media?.type==='image'||lesson.outro_media?.type==='image'
          ? <ImageIcon size={14}/>
          : lesson.intro_media||lesson.outro_media||lesson.video_url||lesson.video_storage_path
            ? <Film size={14}/>
            : <FileText size={14}/>}
      </span>
      <div style={{flex: 1, minWidth: 0}}>
        <p style={{fontSize: '.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
          {lesson.title}
        </p>
        <p style={{fontSize: '.55rem', color: lesson.is_published ? '#34D399' : '#666', marginTop: '2px'}}>
          {nested ? 'SUBMODULE · ' : ''}
          {lesson.is_published ? '● PUBLISHED' : '○ DRAFT'}
          {lesson.is_preview ? ' · PREVIEW' : ''}
          {lesson.duration_seconds ? ` · ${Math.ceil(lesson.duration_seconds / 60)} MIN` : ''}
          {assessment
            ? ` · QUIZ ${assessment.is_published ? 'PUBLISHED' : 'DRAFT'} · PASS ${assessment.passing_score}%`
            : ' · NO QUIZ'}
        </p>
      </div>
      <MoveButtons index={index} total={total} onMove={onMove} />
      <button
        className="lms-action"
        onClick={onAssessment}
        style={assessment?.is_published ? activeQuizButton : iconButton}
        title={assessment ? 'Edit assessment' : 'Add assessment'}
      >
        <ClipboardCheck size={13} />
      </button>
      {onAddSubmodule && (
        <button
          className="lms-action"
          onClick={onAddSubmodule}
          style={iconButton}
          title="Add submodule"
        >
          <Layers3 size={13} />
        </button>
      )}
      <button className="lms-action" onClick={onEdit} style={iconButton} title="Edit">
        <Pencil size={13} />
      </button>
      <button onClick={onDelete} style={{...iconButton, color: '#FF6B78'}} title="Delete">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function MoveButtons({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div style={{display: 'flex'}}>
      <button
        disabled={index === 0}
        onClick={() => onMove(-1)}
        style={{...miniButton, opacity: index === 0 ? 0.25 : 1}}
        title="Move up"
      >
        <ChevronUp size={12} />
      </button>
      <button
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        style={{...miniButton, opacity: index === total - 1 ? 0.25 : 1}}
        title="Move down"
      >
        <ChevronDown size={12} />
      </button>
    </div>
  );
}

function ModuleModal({
  draft,
  setDraft,
  saving,
  onSave,
  onClose,
}: {
  draft: ModuleDraft;
  setDraft: (value: ModuleDraft) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={draft.id ? 'Edit Module' : 'New Module'} onClose={onClose}>
      <Field label="Module Title">
        <input
          autoFocus
          value={draft.title}
          onChange={event => setDraft({...draft, title: event.target.value})}
          style={inputStyle}
        />
      </Field>
      <Field label="Description (optional)">
        <textarea
          value={draft.description}
          onChange={event => setDraft({...draft, description: event.target.value})}
          rows={3}
          style={{...inputStyle, resize: 'vertical'}}
        />
      </Field>
      <ModalActions saving={saving} onSave={onSave} onClose={onClose} />
    </Modal>
  );
}

function LessonModal({
  draft,
  setDraft,
  mediaFiles,
  setMediaFile,
  saving,
  uploadingSlot,
  onSave,
  onClose,
}: {
  draft: LessonDraft;
  setDraft: (value: LessonDraft) => void;
  mediaFiles: Record<LessonMediaSlot, File | null>;
  setMediaFile: (slot: LessonMediaSlot, value: File | null) => void;
  saving: boolean;
  uploadingSlot: LessonMediaSlot | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const kind = draft.parent_lesson_id ? 'Submodule' : 'Lesson';
  return (
    <Modal title={draft.id ? `Edit ${kind}` : `New ${kind}`} onClose={onClose} wide>
      {draft.parent_lesson_id && (
        <div style={{padding: '9px 11px', background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.14)', color: '#93B7E8', fontSize: '.62rem'}}>
          This submodule appears beneath its parent lesson and can have its own content, video,
          progress, and required assessment.
        </div>
      )}
      <div className="lms-builder-grid" style={{display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 190px', gap: '12px'}}>
        <Field label={`${kind} Title`}>
          <input
            autoFocus
            value={draft.title}
            onChange={event => setDraft({...draft, title: event.target.value})}
            style={inputStyle}
          />
        </Field>
        <Field label="Duration (minutes)">
          <input
            type="number"
            min="0"
            value={draft.duration_minutes}
            onChange={event => setDraft({...draft, duration_minutes: event.target.value})}
            style={inputStyle}
          />
        </Field>
      </div>
      <Field label={`${kind} Content (plain text or Markdown-style headings/lists)`}>
        <textarea
          value={draft.content}
          onChange={event => setDraft({...draft, content: event.target.value})}
          rows={12}
          placeholder={`Write or paste the ${kind.toLowerCase()} content here…`}
          style={{
            ...inputStyle,
            resize: 'vertical',
            lineHeight: 1.65,
            fontFamily: 'JetBrains Mono,monospace',
          }}
        />
      </Field>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(330px,100%),1fr))',gap:'12px'}}>
        <LessonMediaEditor
          slot="intro"
          title="Lesson Introduction"
          description="Displayed before the lesson content."
          media={draft.intro_media}
          file={mediaFiles.intro}
          uploading={uploadingSlot==='intro'}
          onFile={file=>setMediaFile('intro',file)}
          onChange={intro_media=>setDraft({...draft,intro_media})}
        />
        <LessonMediaEditor
          slot="outro"
          title="Lesson Outro"
          description="Displayed after the lesson content and before assessments."
          media={draft.outro_media}
          file={mediaFiles.outro}
          uploading={uploadingSlot==='outro'}
          onFile={file=>setMediaFile('outro',file)}
          onChange={outro_media=>setDraft({...draft,outro_media})}
        />
      </div>
      <div style={{display: 'flex', gap: '18px', flexWrap: 'wrap'}}>
        <CheckField
          checked={draft.is_published}
          onChange={checked => setDraft({...draft, is_published: checked})}
          label="Published to enrolled members"
        />
        <CheckField
          checked={draft.is_preview}
          onChange={checked => setDraft({...draft, is_preview: checked})}
          label="Preview lesson"
        />
      </div>
      <ModalActions saving={saving} onSave={onSave} onClose={onClose} />
    </Modal>
  );
}

function LessonMediaEditor({
  slot,
  title,
  description,
  media,
  file,
  uploading,
  onFile,
  onChange,
}: {
  slot: LessonMediaSlot;
  title: string;
  description: string;
  media: LessonMediaDraft;
  file: File | null;
  uploading: boolean;
  onFile: (file: File | null) => void;
  onChange: (media: LessonMediaDraft) => void;
}) {
  const hasStored = Boolean(media.storage_path);
  const preview = media.playback_url ?? media.url;
  const selectType = (type: LessonMediaDraft['type']) => {
    onFile(null);
    onChange(type === 'none' ? emptyMediaDraft() : {...emptyMediaDraft(), type});
  };

  return (
    <section style={videoPanel}>
      <div style={{display:'flex',alignItems:'flex-start',gap:'9px',marginBottom:'11px'}}>
        {media.type==='image'
          ? <ImageIcon size={18} color="#D4AF37"/>
          : <Film size={18} color={media.type==='video'?'#D4AF37':'#555'}/>}
        <div>
          <p style={{fontSize:'.58rem',letterSpacing:'2px',color:'#D4AF37'}}>{title.toUpperCase()}</p>
          <p style={{fontSize:'.55rem',color:'#555',marginTop:'3px'}}>{description}</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'5px',marginBottom:'11px'}}>
        {(['none','video','image'] as const).map(type=>(
          <button
            type="button"
            key={type}
            onClick={()=>selectType(type)}
            style={{
              ...mediaTypeButton,
              color:media.type===type?'#050505':'#777',
              background:media.type===type?'#D4AF37':'#0B0B0B',
              borderColor:media.type===type?'#D4AF37':'rgba(255,255,255,.09)',
            }}
          >
            {type==='none'?'No Media':type==='video'?'Video':'Image'}
          </button>
        ))}
      </div>

      {media.type==='none' ? (
        <div style={adminMediaPlaceholder}>
          <span>{slot==='intro'?'INTRODUCTION':'OUTRO'} PLACEHOLDER</span>
          <small>Select Video or Image to add media.</small>
        </div>
      ) : (
        <>
          <Field label={`External ${media.type} link`}>
            <input
              value={media.url}
              onChange={event=>{
                onFile(null);
                onChange({...media,url:event.target.value,storage_path:null,playback_url:event.target.value||null});
              }}
              placeholder={media.type==='video'
                ? 'YouTube, Vimeo, streaming, or direct video URL'
                : 'Direct HTTPS image URL'}
              style={inputStyle}
            />
          </Field>
          <div style={{display:'flex',alignItems:'center',gap:'9px',marginTop:'9px',flexWrap:'wrap'}}>
            <label style={uploadButton}>
              <Upload size={13}/>
              {file?.name ?? (hasStored?`Replace ${media.type}`:`Upload ${media.type}`)}
              <input
                type="file"
                accept={media.type==='video'
                  ? 'video/mp4,video/webm,video/ogg,video/quicktime'
                  : 'image/png,image/jpeg,image/webp,image/gif'}
                hidden
                onChange={event=>{
                  const selected=event.target.files?.[0]??null;
                  const maximum=media.type==='video'?50*1024*1024:10*1024*1024;
                  if(selected&&selected.size>maximum){
                    toast.error(media.type==='video'
                      ? 'Direct videos must be 50 MB or smaller'
                      : 'Lesson images must be 10 MB or smaller');
                    event.target.value='';
                    return;
                  }
                  onFile(selected);
                  if(selected)onChange({...media,url:''});
                }}
              />
            </label>
            {(hasStored||file||media.url)&&(
              <button
                type="button"
                onClick={()=>selectType('none')}
                style={smallTextButton}
              >
                Remove {media.type}
              </button>
            )}
            {uploading&&(
              <span style={{fontSize:'.58rem',color:'#D4AF37'}}>
                Uploading private {media.type}…
              </span>
            )}
          </div>
          <p style={{fontSize:'.53rem',color:'#555',marginTop:'7px'}}>
            {media.type==='video'
              ? 'Private uploads up to 50 MB; use a streaming link for larger videos.'
              : 'PNG, JPG, WebP, or GIF uploads up to 10 MB.'}
          </p>
          {preview&&!file&&media.type==='image'&&(
            <img src={preview} alt={`${title} preview`} style={adminMediaPreview}/>
          )}
          {preview&&!file&&media.type==='video'&&hasStored&&(
            <video controls preload="metadata" src={preview} style={adminMediaPreview}/>
          )}
        </>
      )}
    </section>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      style={modalOverlay}
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        style={{...modalStyle, maxWidth: wide ? '820px' : '560px'}}
        onMouseDown={event => event.stopPropagation()}
      >
        <header style={modalHeader}>
          <h2 style={{fontFamily: 'Cinzel,serif', fontSize: '1rem'}}>{title}</h2>
          <button onClick={onClose} style={iconButton}><X size={15} /></button>
        </header>
        <div style={{padding: '18px', display: 'grid', gap: '14px', overflowY: 'auto'}}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({label, children}: {label: string; children: ReactNode}) {
  return <label><span style={labelStyle}>{label}</span>{children}</label>;
}

function CheckField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.67rem', color: '#999', cursor: 'pointer'}}>
      <input
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        style={{accentColor: '#D4AF37'}}
      />
      {label}
    </label>
  );
}

function ModalActions({
  saving,
  onSave,
  onClose,
}: {
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,.05)'}}>
      <button onClick={onClose} style={outlineButton}>Cancel</button>
      <button
        onClick={onSave}
        disabled={saving}
        style={{...goldButton, opacity: saving ? 0.55 : 1}}
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

const pageStyle: CSSProperties = {padding: '2.5rem', minHeight: '100vh', background: '#0A0A0A', color: '#fff', fontFamily: 'Montserrat,sans-serif'};
const pageHeader: CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px', flexWrap: 'wrap', marginBottom: '22px'};
const eyebrow: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.56rem', letterSpacing: '4px', color: '#D4AF37', marginTop: '12px'};
const goldButton: CSSProperties = {display: 'flex', alignItems: 'center', gap: '7px', background: 'linear-gradient(135deg,#B8860B,#D4AF37)', color: '#000', border: 0, padding: '10px 16px', fontSize: '.67rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Cinzel,serif'};
const outlineButton: CSSProperties = {display: 'flex', alignItems: 'center', gap: '7px', background: '#111', color: '#888', border: '1px solid rgba(255,255,255,.09)', padding: '9px 13px', fontSize: '.65rem', cursor: 'pointer'};
const successOutlineButton: CSSProperties = {...outlineButton, color: '#34D399', borderColor: 'rgba(52,211,153,.22)', background: 'rgba(52,211,153,.05)'};
const helpPanel: CSSProperties = {background: 'rgba(96,165,250,.05)', border: '1px solid rgba(96,165,250,.15)', padding: '12px 15px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap'};
const emptyState: CSSProperties = {minHeight: '330px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#111', border: '1px dashed rgba(212,175,55,.2)', textAlign: 'center'};
const moduleCard: CSSProperties = {background: '#101010', border: '1px solid rgba(255,255,255,.07)'};
const moduleHeader: CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', background: 'linear-gradient(90deg,rgba(212,175,55,.06),transparent)', borderBottom: '1px solid rgba(255,255,255,.04)', flexWrap: 'wrap'};
const expandButton: CSSProperties = {background: 'none', border: 0, color: '#D4AF37', cursor: 'pointer', padding: '3px'};
const moduleTitle: CSSProperties = {fontFamily: 'Cinzel,serif', fontSize: '.88rem', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis'};
const countBadge: CSSProperties = {fontSize: '.56rem', color: '#777', border: '1px solid rgba(255,255,255,.08)', padding: '3px 7px', whiteSpace: 'nowrap'};
const lessonGroup: CSSProperties = {border: '1px solid rgba(255,255,255,.045)', background: '#090909'};
const lessonRow: CSSProperties = {display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', flexWrap: 'wrap'};
const submoduleList: CSSProperties = {display: 'grid', gap: '5px', padding: '8px 8px 8px 28px', borderTop: '1px solid rgba(255,255,255,.045)', background: 'rgba(96,165,250,.025)'};
const submoduleLabel: CSSProperties = {display: 'flex', alignItems: 'center', gap: '5px', fontSize: '.5rem', letterSpacing: '1.6px', color: '#60A5FA', padding: '2px 4px'};
const moduleGatePanel: CSSProperties = {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', marginTop: '10px', background: 'rgba(212,175,55,.035)', border: '1px solid rgba(212,175,55,.13)', flexWrap: 'wrap'};
const emptyModuleText: CSSProperties = {padding: '18px', textAlign: 'center', fontSize: '.68rem', color: '#555'};
const iconButton: CSSProperties = {width: '29px', height: '29px', display: 'grid', placeItems: 'center', background: 'transparent', border: '1px solid rgba(255,255,255,.07)', color: '#777', cursor: 'pointer'};
const miniButton: CSSProperties = {...iconButton, width: '24px', height: '24px'};
const quizButton: CSSProperties = {...outlineButton, padding: '7px 9px', fontSize: '.58rem'};
const activeQuizButton: CSSProperties = {...iconButton, color: '#34D399', borderColor: 'rgba(52,211,153,.24)', background: 'rgba(52,211,153,.06)'};
const activeQuizWideButton: CSSProperties = {...quizButton, color: '#34D399', borderColor: 'rgba(52,211,153,.24)', background: 'rgba(52,211,153,.06)'};
const modalOverlay: CSSProperties = {position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px'};
const modalStyle: CSSProperties = {width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#0D0D0D', border: '1px solid rgba(212,175,55,.22)', boxShadow: '0 25px 80px rgba(0,0,0,.8)'};
const modalHeader: CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)'};
const labelStyle: CSSProperties = {display: 'block', fontSize: '.55rem', letterSpacing: '1.7px', textTransform: 'uppercase', color: '#666', marginBottom: '6px'};
const inputStyle: CSSProperties = {width: '100%', boxSizing: 'border-box', background: '#080808', border: '1px solid rgba(255,255,255,.1)', color: '#fff', padding: '10px 11px', fontSize: '.72rem', outline: 'none'};
const videoPanel: CSSProperties = {padding: '12px', background: 'rgba(212,175,55,.035)', border: '1px solid rgba(212,175,55,.12)'};
const mediaTypeButton: CSSProperties = {padding:'7px 5px',border:'1px solid',fontSize:'.55rem',textTransform:'uppercase',letterSpacing:'.8px',cursor:'pointer'};
const adminMediaPlaceholder: CSSProperties = {minHeight:'94px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'6px',border:'1px dashed rgba(255,255,255,.1)',background:'#090909',color:'#555',fontSize:'.56rem',letterSpacing:'1.5px',textAlign:'center'};
const adminMediaPreview: CSSProperties = {width:'100%',maxHeight:'210px',objectFit:'contain',background:'#050505',marginTop:'10px',border:'1px solid rgba(255,255,255,.07)'};
const uploadButton: CSSProperties = {display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '8px 11px', background: '#151515', border: '1px solid rgba(255,255,255,.1)', fontSize: '.63rem', color: '#AAA', cursor: 'pointer', maxWidth: '100%', overflow: 'hidden'};
const smallTextButton: CSSProperties = {background: 'none', border: 0, color: '#FF6B78', fontSize: '.6rem', cursor: 'pointer'};
