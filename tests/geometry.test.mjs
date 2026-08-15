import test from 'node:test';
import assert from 'node:assert/strict';
import { loadNamespace } from './load-namespace.mjs';

const LD = await loadNamespace(['content/geometry.js']);

test('coverPlacement keeps a matching 4:1 image unchanged', () => {
  const placement = LD.geometry.coverPlacement(1584, 396, 1584, 396);
  assert.equal(placement.x, 0);
  assert.equal(placement.y, 0);
  assert.equal(placement.width, 1584);
  assert.equal(placement.height, 396);
});

test('coverPlacement center-crops a portrait image', () => {
  const placement = LD.geometry.coverPlacement(400, 800, 1584, 396);
  assert.equal(placement.width, 1584);
  assert.equal(placement.height, 3168);
  assert.equal(placement.x, 0);
  assert.equal(placement.y, -1386);
});

test('pointFromPointer maps CSS coordinates into the 1584x396 bitmap and clamps', () => {
  const canvas = {
    width: 1584,
    height: 396,
    getBoundingClientRect: () => ({ left: 100, top: 20, width: 792, height: 198 })
  };
  const middle = LD.geometry.pointFromPointer({ clientX: 496, clientY: 119 }, canvas);
  assert.equal(middle.x, 792);
  assert.equal(middle.y, 198);
  const clamped = LD.geometry.pointFromPointer({ clientX: -10, clientY: 900 }, canvas);
  assert.equal(clamped.x, 0);
  assert.equal(clamped.y, 396);
});

test('arrowHead returns two finite endpoints', () => {
  const points = LD.geometry.arrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }, 20);
  assert.equal(points.length, 2);
  assert(points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
  assert(points.every(point => point.x < 100));
});
