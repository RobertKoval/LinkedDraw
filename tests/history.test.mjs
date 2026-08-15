import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/history.js']);

test('history supports undo, redo, and branch replacement', () => {
  const history = LD.history.create([], 10);
  history.push([{ type: 'pen', points: [{ x: 1, y: 2 }] }]);
  history.push([{ type: 'line' }]);
  assert.deepEqual(history.undo(), [{ type: 'pen', points: [{ x: 1, y: 2 }] }]);
  assert(history.canRedo());
  history.push([{ type: 'rect' }]);
  assert.equal(history.canRedo(), false);
  assert.deepEqual(history.current(), [{ type: 'rect' }]);
});

test('history returns clones instead of mutable internal references', () => {
  const history = LD.history.create([{ value: 1 }]);
  const current = history.current();
  current[0].value = 99;
  assert.deepEqual(history.current(), [{ value: 1 }]);
});
