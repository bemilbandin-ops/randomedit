import assert from 'node:assert/strict';
import test from 'node:test';
import { selectReviewMime } from './renderReview.ts';

test('prefers MP4 when requested and supported', () => {
  const result = selectReviewMime('mp4', (mime) => mime === 'video/mp4');
  assert.deepEqual(result, { mime: 'video/mp4', extension: 'mp4', usedFallback: false });
});

test('falls back to WebM when requested MP4 is unavailable', () => {
  const result = selectReviewMime('mp4', (mime) => mime === 'video/webm;codecs=vp9');
  assert.deepEqual(result, { mime: 'video/webm;codecs=vp9', extension: 'webm', usedFallback: true });
});

test('returns null when no browser recording format is supported', () => {
  assert.equal(selectReviewMime('webm', () => false), null);
});
