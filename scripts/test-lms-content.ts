import assert from 'node:assert/strict';
import { parseLessonContent } from '../src/lib/lms/contentBlocks';

const blocks = parseLessonContent(`
### Learning Objectives
Understand market structure.

- Identify the trend
- Mark liquidity

1. Wait for confirmation
2. Define risk

IMPORTANT: Never enter without a stop loss.

> Discipline protects capital.
`);

assert.deepEqual(blocks.map(block => block.kind), [
  'heading',
  'paragraph',
  'unordered-list',
  'ordered-list',
  'callout',
  'quote',
]);
assert.equal(blocks[0].kind === 'heading' && blocks[0].text, 'Learning Objectives');
assert.equal(blocks[2].kind === 'unordered-list' && blocks[2].items.length, 2);
assert.equal(blocks[4].kind === 'callout' && blocks[4].tone, 'important');

const plain = parseLessonContent('First line\ncontinues on the second line.');
assert.deepEqual(plain, [{ kind: 'paragraph', text: 'First line continues on the second line.' }]);

console.log('LMS lesson content tests passed');
