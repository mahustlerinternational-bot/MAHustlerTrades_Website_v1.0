import assert from 'node:assert/strict';
import {parseLmsText} from '../src/lib/lms/importText';

const curriculum=parseLmsText(`
# Foundations
## Welcome
This is the opening lesson.
VIDEO: https://example.com/welcome.mp4
## Risk Basics
Use consistent position sizing.
# Execution
## Entry Checklist
Wait for confirmation.
`);

assert.equal(curriculum.length,2);
assert.equal(curriculum[0].title,'Foundations');
assert.equal(curriculum[0].lessons.length,2);
assert.equal(curriculum[0].lessons[0].title,'Welcome');
assert.equal(curriculum[0].lessons[0].video_url,'https://example.com/welcome.mp4');
assert.equal(curriculum[0].lessons[1].content,'Use consistent position sizing.');
assert.equal(curriculum[1].lessons[0].title,'Entry Checklist');

const labeled=parseLmsText('MODULE: Advanced\nLESSON: Review\nFinal notes.');
assert.equal(labeled[0].title,'Advanced');
assert.equal(labeled[0].lessons[0].title,'Review');

const fallback=parseLmsText('A plain lesson body.','Uploaded Notes');
assert.equal(fallback[0].title,'Uploaded Notes');
assert.equal(fallback[0].lessons[0].content,'A plain lesson body.');

assert.throws(()=>parseLmsText('   '),/empty/i);
console.log('LMS text importer tests passed');
