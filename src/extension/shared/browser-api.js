(function (LD) {
  'use strict';

  var promiseNamespace = typeof globalThis.browser !== 'undefined' && globalThis.browser && globalThis.browser.runtime;
  var api = promiseNamespace ? globalThis.browser : globalThis.chrome;

  if (!api) {
    LD.webext = null;
    return;
  }

  function chromeCallbackCall(owner, methodName, args) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function finish(error, value) {
        if (settled) return;
        settled = true;
        if (error) reject(error);
        else resolve(value);
      }

      function callback(value) {
        var lastError = api.runtime && api.runtime.lastError;
        finish(lastError ? new Error(lastError.message || String(lastError)) : null, value);
      }

      try {
        var method = owner[methodName];
        var returned = method.apply(owner, args.concat(callback));
        if (returned && typeof returned.then === 'function') {
          returned.then(function (value) {
            finish(null, value);
          }, function (error) {
            finish(error instanceof Error ? error : new Error(String(error)));
          });
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  function call(owner, methodName, args) {
    if (!owner || typeof owner[methodName] !== 'function') {
      return Promise.reject(new Error('WebExtension API unavailable: ' + methodName));
    }

    if (promiseNamespace) {
      try {
        return Promise.resolve(owner[methodName].apply(owner, args));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    return chromeCallbackCall(owner, methodName, args);
  }

  LD.webext = {
    api: api,
    usesPromiseNamespace: Boolean(promiseNamespace),

    storageGet: function storageGet(defaults) {
      return call(api.storage.local, 'get', [defaults]);
    },

    storageSet: function storageSet(values) {
      return call(api.storage.local, 'set', [values]);
    },

    sendMessage: function sendMessage(message) {
      return call(api.runtime, 'sendMessage', [message]);
    },

    queryTabs: function queryTabs(query) {
      return call(api.tabs, 'query', [query]);
    },

    sendTabMessage: function sendTabMessage(tabId, message) {
      return call(api.tabs, 'sendMessage', [tabId, message]);
    },

    createTab: function createTab(createProperties) {
      return call(api.tabs, 'create', [createProperties]);
    },

    openOptionsPage: function openOptionsPage() {
      return call(api.runtime, 'openOptionsPage', []);
    },

    getManifest: function getManifest() {
      return api.runtime.getManifest();
    },

    getURL: function getURL(path) {
      return api.runtime.getURL(path);
    }
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
