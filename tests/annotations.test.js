import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMatches, validateAnnotations, normalizePath } from '../src/lib/annotations.js';

const text = '这句话重复。\n这句话重复。\n代码 😀 <safe>';
const annotation = { id: 'saved-one', start: 7, end: 12, text: '这句话重复', type: 'highlight', color: 'green', note: '第二处', createdAt: 0 };
test('a saved quote must match the precise occurrence in the document', () => {
  assert.equal(validateAnnotations([annotation], text)[0].start, 7);
  assert.throws(() => validateAnnotations([{ ...annotation, start: 8, end: 13 }], text), /不一致/);
});
test('malformed or ambiguous archive anchors cannot silently mark different text', () => {
  assert.throws(() => validateAnnotations([{ ...annotation, end: 2000 }], text), /不一致/);
  assert.throws(() => validateAnnotations([annotation, annotation], text), /不一致/);
  assert.throws(() => validateAnnotations([{ ...annotation, type: 'script' }], text), /不一致/);
});
test('literal search preserves Unicode offsets and handles regex punctuation', () => {
  const sample = 'İ.x 😀 İ.x 😀';
  assert.deepEqual(findMatches(sample, '😀'), [{ start: 4, end: 6, index: 0 }, { start: 11, end: 13, index: 1 }]);
  assert.equal(findMatches('Price $5 [test] a+b', '[test]')[0].start, 9);
  assert.equal(findMatches('ABC abc', 'abc').length, 2);
});
test('relative image paths resolve after parent segments and URL decoding', () => {
  assert.equal(normalizePath('folder/article/../images/a%20b.png'), 'folder/images/a b.png');
  assert.equal(normalizePath('folder\\images\\a.png'), 'folder/images/a.png');
});
