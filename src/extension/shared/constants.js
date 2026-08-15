(function (LD) {
  'use strict';

  LD.constants = Object.freeze({
    outputWidth: 1584,
    outputHeight: 396,
    outputAspectRatio: 4,
    maxUploadBytes: 8 * 1024 * 1024,
    conservativeUploadBytes: Math.floor(7.75 * 1024 * 1024),
    maxFetchedImageBytes: 12 * 1024 * 1024,
    imageFetchTimeoutMs: 10000,
    rootHostId: 'linked-draw-extension-host',
    profilePathPattern: /^\/in\/[^/?#]+\/?$/i,
    scanIntervalMs: 1200,
    detectionDebounceMs: 180,
    uploadTimeoutMs: 12000,
    nativeConfirmRounds: 3,
    supportedMediaHosts: Object.freeze([
      'linkedin.com',
      'licdn.com'
    ]),
    messageTypes: Object.freeze({
      fetchImage: 'LD_FETCH_IMAGE',
      openEditor: 'LD_OPEN_EDITOR',
      getStatus: 'LD_GET_STATUS',
      ping: 'LD_PING'
    })
  });

  LD.version = '0.1.0';
  LD.debug = false;
  LD.log = function log() {
    if (!LD.debug || !globalThis.console) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[LinkedDraw]');
    console.debug.apply(console, args);
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
