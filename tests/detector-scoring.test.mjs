import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace([
  'shared/constants.js',
  'content/geometry.js',
  'content/banner-detector.js'
], {
  getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1', backgroundImage: 'none' })
});

test('a wide profile-header image with an edit control scores highly', () => {
  const score = LD.bannerDetector.scoreBannerCandidateMeta({
    rect: { left: 100, top: 80, width: 792, height: 198 },
    knownSelector: true,
    isImage: true,
    hasImageUrl: true,
    imageHostHint: true,
    keywordHint: true,
    insideMain: true,
    hasNearbyEditControl: true
  });
  assert(score > 150);
});

test('a narrow or tiny element is rejected as a banner', () => {
  const score = LD.bannerDetector.scoreBannerCandidateMeta({
    rect: { left: 0, top: 0, width: 300, height: 80 }
  });
  assert.equal(score, -1000);
});

test('an upper-right camera control scores above a random button', () => {
  const banner = { left: 100, top: 80, width: 792, height: 198, right: 892, bottom: 278 };
  const editScore = LD.bannerDetector.scoreEditButtonMeta({
    buttonRect: { left: 840, top: 95, width: 38, height: 38 },
    bannerRect: banner,
    keywordHint: true,
    hasSvg: true,
    isButton: true,
    insideSameContainer: true,
    disabled: false
  });
  const randomScore = LD.bannerDetector.scoreEditButtonMeta({
    buttonRect: { left: 120, top: 400, width: 100, height: 40 },
    bannerRect: banner,
    keywordHint: false,
    hasSvg: false,
    isButton: true,
    insideSameContainer: false,
    disabled: false
  });
  assert(editScore > 100);
  assert(editScore > randomScore + 80);
});

test('generic suggestion actions are excluded from cover anchors', () => {
  assert.equal(LD.bannerDetector.isExcludedActionText('Dismiss the suggestion'), true);
  assert.equal(LD.bannerDetector.isExcludedActionText('Add background image'), false);
});

test('cover anchors require positive semantic or known-control evidence', () => {
  assert.equal(LD.bannerDetector.isCoverEditButtonMeta({ keywordHint: false, knownCoverControl: false }), false);
  assert.equal(LD.bannerDetector.isCoverEditButtonMeta({ keywordHint: true, knownCoverControl: false }), true);
  assert.equal(LD.bannerDetector.isCoverEditButtonMeta({ keywordHint: false, knownCoverControl: true }), true);
});

function detectorFixture(label) {
  const rect = () => ({ left: 100, top: 80, right: 892, bottom: 278, width: 792, height: 198 });
  const button = {
    tagName: 'BUTTON',
    disabled: false,
    textContent: '',
    getAttribute: name => name === 'aria-label' ? label : null,
    getBoundingClientRect: () => ({ left: 840, top: 95, right: 878, bottom: 133, width: 38, height: 38 }),
    querySelector: () => null
  };
  const banner = {
    tagName: 'IMG',
    currentSrc: 'https://www.linkedin.com/media/cover.jpg',
    src: 'https://www.linkedin.com/media/cover.jpg',
    parentElement: null,
    getBoundingClientRect: rect,
    querySelector: selector => selector === 'button, [role="button"]' ? button : null,
    querySelectorAll: selector => selector === 'button, [role="button"]' ? [button] : [],
    closest: selector => selector === 'main' ? {} : null,
    contains: element => element === button
  };
  const main = {
    querySelectorAll: () => [banner],
    getBoundingClientRect: rect
  };
  return {
    querySelector: selector => selector === 'main' ? main : null,
    querySelectorAll: selector => selector === 'button, [role="button"]' ? [button] : [],
    body: main,
    documentElement: main
  };
}

test('detect rejects a geometry-only upper-right action but accepts native cover semantics', () => {
  const geometryOnly = LD.bannerDetector.detect(detectorFixture('Dismiss the suggestion'));
  assert.equal(geometryOnly.editable, false);

  const native = LD.bannerDetector.detect(detectorFixture('Add background image'));
  assert.equal(native.editable, true);
  assert.equal(native.editButton.getAttribute('aria-label'), 'Add background image');
});
