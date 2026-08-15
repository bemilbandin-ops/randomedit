import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderHasStalled,
  reviewExportCapability,
  selectReviewMime,
} from './renderReview.ts';

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

test('reports review export unavailable before rendering when recorder support is missing', () => {
  const capability = reviewExportCapability('webm', {
    hasMediaRecorder: false,
    hasCanvasCapture: true,
    isTypeSupported: () => true,
  });
  assert.equal(capability.available, false);
  assert.match(capability.reason ?? '', /mediarecorder/i);
});

test('reports review export unavailable before rendering when canvas capture is missing', () => {
  const capability = reviewExportCapability('webm', {
    hasMediaRecorder: true,
    hasCanvasCapture: false,
    isTypeSupported: () => true,
  });
  assert.equal(capability.available, false);
  assert.match(capability.reason ?? '', /canvas/i);
});

test('reports review export unavailable when no supported recording MIME exists', () => {
  const capability = reviewExportCapability('mp4', {
    hasMediaRecorder: true,
    hasCanvasCapture: true,
    isTypeSupported: () => false,
  });
  assert.equal(capability.available, false);
  assert.match(capability.reason ?? '', /format/i);
});

test('detects a stalled render only after the timeout expires', () => {
  assert.equal(renderHasStalled(1000, 5999, 5000), false);
  assert.equal(renderHasStalled(1000, 6001, 5000), true);
});
