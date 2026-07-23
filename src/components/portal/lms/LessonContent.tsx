import { AlertTriangle, Check, Info, Lightbulb, Sparkles } from 'lucide-react';
import { parseLessonContent } from '@/lib/lms/contentBlocks';

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={index} className="border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[0.92em] text-[#E4C65A]">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

const CALLOUT_STYLE = {
  note: {
    classes: 'border-blue-400/25 bg-blue-400/[0.07]',
    label: 'text-blue-300',
    icon: Info,
  },
  tip: {
    classes: 'border-emerald-400/25 bg-emerald-400/[0.07]',
    label: 'text-emerald-300',
    icon: Lightbulb,
  },
  important: {
    classes: 'border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.07)]',
    label: 'text-[#D4AF37]',
    icon: Sparkles,
  },
  warning: {
    classes: 'border-amber-400/25 bg-amber-400/[0.07]',
    label: 'text-amber-300',
    icon: AlertTriangle,
  },
} as const;

export default function LessonContent({ content }: { content: string }) {
  const blocks = parseLessonContent(content);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return block.level === 2 ? (
            <div key={index} className="border-l-2 border-[#D4AF37] pl-4 pt-1">
              <p className="mb-1 text-[9px] uppercase tracking-[2.5px] text-[#766424]">Lesson Section</p>
              <h3 className="font-serif text-lg font-semibold leading-snug text-white">{block.text}</h3>
            </div>
          ) : (
            <h4 key={index} className="pt-2 font-serif text-sm font-semibold uppercase tracking-[1px] text-[#E5E5E5]">
              {block.text}
            </h4>
          );
        }

        if (block.kind === 'paragraph') {
          return (
            <p key={index} className="text-[13px] leading-7 text-[#C5C5C5]">
              <InlineText text={block.text} />
            </p>
          );
        }

        if (block.kind === 'unordered-list') {
          return (
            <ul key={index} className="space-y-2.5 border-l border-white/[0.07] pl-4">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-3 text-[13px] leading-6 text-[#BDBDBD]">
                  <Check size={13} className="mt-1.5 shrink-0 text-[#D4AF37]" />
                  <span><InlineText text={item} /></span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === 'ordered-list') {
          return (
            <ol key={index} className="space-y-3">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 text-[13px] leading-6 text-[#BDBDBD]">
                  <span className="grid h-7 w-7 place-items-center border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.06)] font-mono text-[10px] text-[#D4AF37]">
                    {String(itemIndex + 1).padStart(2, '0')}
                  </span>
                  <span><InlineText text={item} /></span>
                </li>
              ))}
            </ol>
          );
        }

        if (block.kind === 'callout') {
          const style = CALLOUT_STYLE[block.tone];
          const Icon = style.icon;
          return (
            <aside key={index} className={`border p-4 ${style.classes}`}>
              <p className={`mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[2px] ${style.label}`}>
                <Icon size={13} /> {block.label}
              </p>
              <p className="text-[12px] leading-6 text-[#C8C8C8]"><InlineText text={block.text} /></p>
            </aside>
          );
        }

        if (block.kind === 'quote') {
          return (
            <blockquote key={index} className="border-l-2 border-[#766424] bg-black/20 px-5 py-4 font-serif text-sm italic leading-7 text-[#B8B8B8]">
              “<InlineText text={block.text} />”
            </blockquote>
          );
        }

        return <div key={index} className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />;
      })}
    </div>
  );
}
