export type LessonContentBlock =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'unordered-list'; items: string[] }
  | { kind: 'ordered-list'; items: string[] }
  | { kind: 'callout'; tone: 'note' | 'tip' | 'important' | 'warning'; label: string; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'divider' };

type CalloutTone = Extract<LessonContentBlock, { kind: 'callout' }>['tone'];

const CALLOUT_TONES: Record<string, CalloutTone> = {
  NOTE: 'note',
  TIP: 'tip',
  IMPORTANT: 'important',
  WARNING: 'warning',
  REMEMBER: 'important',
  'KEY POINT': 'important',
};

function isSectionLabel(line: string) {
  return /^[A-Z][A-Za-z0-9 &/()+-]{2,54}:$/.test(line);
}

function isUppercaseHeading(line: string) {
  const letters = line.replace(/[^A-Za-z]/g, '');
  return line.length <= 72 && letters.length >= 4 && letters === letters.toUpperCase();
}

export function parseLessonContent(content: string): LessonContentBlock[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: LessonContentBlock[] = [];
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').replace(/\s+/g, ' ').trim();
    if (text) blocks.push({ kind: 'paragraph', text });
    paragraph = [];
  };
  const flushUnordered = () => {
    if (unordered.length) blocks.push({ kind: 'unordered-list', items: unordered });
    unordered = [];
  };
  const flushOrdered = () => {
    if (ordered.length) blocks.push({ kind: 'ordered-list', items: ordered });
    ordered = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushUnordered();
    flushOrdered();
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushAll();
      continue;
    }

    if (/^(?:-{3,}|_{3,}|\*{3,}|━{3,}|═{3,})$/.test(line)) {
      flushAll();
      blocks.push({ kind: 'divider' });
      continue;
    }

    const markdownHeading = /^(#{1,4})\s+(.+)$/.exec(line);
    if (markdownHeading) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: markdownHeading[1].length <= 2 ? 2 : 3,
        text: markdownHeading[2].trim(),
      });
      continue;
    }

    const callout = /^(NOTE|TIP|IMPORTANT|WARNING|REMEMBER|KEY POINT)\s*:\s*(.*)$/i.exec(line);
    if (callout) {
      flushAll();
      const label = callout[1].toUpperCase();
      blocks.push({
        kind: 'callout',
        tone: CALLOUT_TONES[label] ?? 'note',
        label,
        text: callout[2].trim(),
      });
      continue;
    }

    if (line.startsWith('>')) {
      flushAll();
      blocks.push({ kind: 'quote', text: line.replace(/^>\s?/, '') });
      continue;
    }

    const unorderedItem = /^(?:[-*•▪◦])\s+(.+)$/.exec(line);
    if (unorderedItem) {
      flushParagraph();
      flushOrdered();
      unordered.push(unorderedItem[1].trim());
      continue;
    }

    const orderedItem = /^\d+[.)]\s+(.+)$/.exec(line);
    if (orderedItem) {
      flushParagraph();
      flushUnordered();
      ordered.push(orderedItem[1].trim());
      continue;
    }

    if (isSectionLabel(line) || isUppercaseHeading(line)) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: 3,
        text: line.replace(/:$/, ''),
      });
      continue;
    }

    flushUnordered();
    flushOrdered();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}
