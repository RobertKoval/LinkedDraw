(function (LD) {
  'use strict';

  if (globalThis.__linkedDrawApp) return;
  if (!LD.webext) return;

  try {
    LD.debug = new URLSearchParams(location.search).get('linkedDrawDebug') === '1';
    globalThis.__linkedDrawApp = new LD.LinkedDrawApp();
  } catch (error) {
    console.error('[LinkedDraw] failed to initialize', error);
  }
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
