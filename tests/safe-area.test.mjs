import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/render.js']);

test('safe-area layout keeps the bottom and right cover edges visible', () => {
  const layout = LD.renderer.safeAreaLayout(1584, 396);
  assert(layout.visible.x <= 8);
  assert(layout.visible.y <= 8);
  assert(layout.visible.x + layout.visible.width >= 1576);
  assert(layout.visible.y + layout.visible.height >= 388);
});

test('safe-area layout matches the observed avatar and confines controls to the upper right', () => {
  const layout = LD.renderer.safeAreaLayout(1584, 396);
  assert(layout.avatar.centerX >= 200 && layout.avatar.centerX <= 216);
  assert(layout.avatar.centerY >= 356 && layout.avatar.centerY <= 372);
  assert(layout.avatar.radius >= 148 && layout.avatar.radius <= 160);
  assert(layout.avatar.centerY - layout.avatar.radius <= 218);

  assert(layout.controls.x >= 1250);
  assert(layout.controls.y <= 20);
  assert(layout.controls.x + layout.controls.width >= 1570);
  assert(layout.controls.y + layout.controls.height <= 150);
});

test('safe-area labels stay inside their guide regions instead of clipping the top edge', () => {
  const layout = LD.renderer.safeAreaLayout(1584, 396);
  const labels = LD.renderer.safeAreaLabelLayout(layout);
  assert(labels.visible.y >= layout.visible.y + 20);
  assert(labels.visible.x >= layout.visible.x + 8);
  assert(labels.controls.y >= layout.controls.y + 20);
});
