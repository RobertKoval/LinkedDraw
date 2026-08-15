import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

function drawingContext() {
  return {
    clearRect() {},
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillText() {},
    strokeRect() {}
  };
}

test('repeated editor renders reuse the offscreen drawing layer', async () => {
  let offscreenCanvases = 0;
  const document = {
    createElement(tagName) {
      assert.equal(tagName, 'canvas');
      offscreenCanvases += 1;
      const context = drawingContext();
      return { width: 0, height: 0, getContext: () => context };
    }
  };
  const LD = await loadNamespace(['content/render.js'], { document });
  LD.geometry = {};

  const gradient = { addColorStop() {} };
  const outputContext = {
    save() {},
    restore() {},
    clearRect() {},
    createLinearGradient: () => gradient,
    fillRect() {},
    drawImage() {}
  };
  const canvas = { width: 1584, height: 396, getContext: () => outputContext };

  LD.renderer.render(canvas, null, [], null, false);
  LD.renderer.render(canvas, null, [], null, false);

  assert.equal(offscreenCanvases, 1);
});
