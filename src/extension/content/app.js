(function (LD) {
  'use strict';

  function fileToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('Unable to read image data')); };
      reader.readAsDataURL(blob);
    });
  }

  function isLinkedInHost() {
    return location.hostname === 'www.linkedin.com' || location.hostname.endsWith('.linkedin.com');
  }

  function isDevelopmentHost() {
    return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  }

  function isEligiblePage() {
    if (isDevelopmentHost()) return true;
    return isLinkedInHost() && /^\/in\/[^/?#]+/i.test(location.pathname);
  }

  function styleFor(view, element) {
    if (view && typeof view.getComputedStyle === 'function') return view.getComputedStyle(element) || {};
    if (typeof globalThis.getComputedStyle === 'function') return globalThis.getComputedStyle(element) || {};
    return {};
  }

  function hasScrollableOverflow(style) {
    return ['overflow', 'overflowX', 'overflowY'].some(function (property) {
      return /(?:auto|scroll|overlay)/i.test(String(style[property] || ''));
    });
  }

  function getScrollableAncestors(element, view) {
    var targets = [];
    for (var current = element && element.parentElement; current; current = current.parentElement) {
      if (hasScrollableOverflow(styleFor(view, current))) targets.push(current);
    }
    if (view && targets.indexOf(view) < 0) targets.push(view);
    return targets;
  }

  function isViewportRectVisible(rect, view) {
    if (!rect || Number(rect.width) <= 0 || Number(rect.height) <= 0) return false;
    var viewportWidth = Number(view && view.innerWidth) || Number(globalThis.innerWidth) || 0;
    var viewportHeight = Number(view && view.innerHeight) || Number(globalThis.innerHeight) || 0;
    return Number(rect.right) > 0 && Number(rect.bottom) > 0 && Number(rect.left) < viewportWidth && Number(rect.top) < viewportHeight;
  }

  function isElementFullyExposed(element, ownerDocument, view) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    if (!ownerDocument || typeof ownerDocument.elementFromPoint !== 'function') return true;
    var rect = element.getBoundingClientRect();
    if (!isViewportRectVisible(rect, view)) return false;

    var insetX = Math.min(4, rect.width / 3);
    var insetY = Math.min(4, rect.height / 3);
    var centerX = rect.left + rect.width / 2;
    var samplePoints = [
      [centerX, rect.top + insetY],
      [centerX, rect.top + rect.height / 2],
      [centerX, rect.bottom - insetY]
    ];
    var viewportWidth = Number(view && view.innerWidth) || Number(globalThis.innerWidth) || 0;
    var viewportHeight = Number(view && view.innerHeight) || Number(globalThis.innerHeight) || 0;

    return samplePoints.every(function (point) {
      if (point[0] < insetX || point[1] < 0 || point[0] >= viewportWidth || point[1] >= viewportHeight) return false;
      var hit = ownerDocument.elementFromPoint(point[0], point[1]);
      if (!hit) return false;
      return hit === element ||
        Boolean(element.contains && element.contains(hit)) ||
        Boolean(hit.contains && hit.contains(element));
    });
  }

  LD.positioning = {
    getScrollableAncestors: getScrollableAncestors,
    isViewportRectVisible: isViewportRectVisible,
    isElementFullyExposed: isElementFullyExposed
  };

  function LinkedDrawApp() {
    this.target = null;
    this.editor = null;
    this.openingEditor = false;
    this.navigationEpoch = 0;
    this.lastUrl = location.href;
    this.scanTimer = null;
    this.positionFrame = null;
    this.scrollTargets = [];
    this.destroyed = false;

    this.createRoot();
    this.bind();
    this.scheduleScan(0);
  }

  LinkedDrawApp.prototype.createRoot = function createRoot() {
    var existing = document.getElementById(LD.constants.rootHostId);
    if (existing) existing.remove();

    var host = document.createElement('div');
    host.id = LD.constants.rootHostId;
    host.setAttribute('data-linked-draw-version', LD.version);
    document.documentElement.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });
    var style = document.createElement('style');
    style.textContent = LD.styles;
    shadow.appendChild(style);

    var button = document.createElement('button');
    button.className = 'ld-floating-button';
    button.type = 'button';
    button.hidden = true;
    var buttonIcon = document.createElement('span');
    buttonIcon.className = 'ld-floating-icon';
    buttonIcon.setAttribute('aria-hidden', 'true');
    buttonIcon.textContent = '✎';
    var buttonLabel = document.createElement('span');
    buttonLabel.textContent = LD.i18n.t('draw');
    button.append(buttonIcon, buttonLabel);
    button.setAttribute('aria-label', LD.i18n.t('openEditor'));
    shadow.appendChild(button);

    var editorMount = document.createElement('div');
    editorMount.className = 'ld-editor-mount';
    shadow.appendChild(editorMount);

    var toastStack = document.createElement('div');
    toastStack.className = 'ld-toast-stack';
    toastStack.setAttribute('aria-live', 'polite');
    shadow.appendChild(toastStack);

    this.host = host;
    this.shadow = shadow;
    this.button = button;
    this.editorMount = editorMount;
    this.toastStack = toastStack;
  };

  LinkedDrawApp.prototype.bind = function bind() {
    var self = this;
    this.button.addEventListener('click', function () { self.openEditor(); });

    this.boundScroll = function () { self.schedulePosition(); };
    this.boundResize = function () { self.scheduleScan(80); };
    window.addEventListener('resize', this.boundResize, { passive: true });

    this.observer = new MutationObserver(function () { self.scheduleScan(LD.constants.detectionDebounceMs); });
    this.observer.observe(document.documentElement, { childList: true, subtree: true });

    this.interval = setInterval(function () {
      self.syncNavigation();
      self.scan();
    }, LD.constants.scanIntervalMs);

    if (LD.webext && LD.webext.api.runtime && LD.webext.api.runtime.onMessage) {
      LD.webext.api.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
        if (!message || !message.type) return false;
        if (message.type === LD.constants.messageTypes.getStatus) {
          sendResponse(self.status());
          return false;
        }
        if (message.type === LD.constants.messageTypes.openEditor) {
          self.openEditor().then(function (opened) {
            sendResponse({ ok: opened, status: self.status() });
          }).catch(function (error) {
            sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
          });
          return true;
        }
        return false;
      });
    }
  };

  LinkedDrawApp.prototype.scheduleScan = function scheduleScan(delay) {
    var self = this;
    clearTimeout(this.scanTimer);
    this.scanTimer = setTimeout(function () { self.scan(); }, Math.max(0, delay || 0));
  };

  LinkedDrawApp.prototype.syncNavigation = function syncNavigation() {
    if (this.lastUrl === location.href) return false;
    this.lastUrl = location.href;
    this.navigationEpoch += 1;
    if (this.editor) this.editor.destroy();
    this.editor = null;
    this.target = null;
    this.clearScrollTargets();
    this.button.hidden = true;
    return true;
  };

  LinkedDrawApp.prototype.scan = function scan() {
    this.syncNavigation();
    if (this.destroyed || !isEligiblePage()) {
      this.target = null;
      this.clearScrollTargets();
      this.button.hidden = true;
      return;
    }

    if (this.hasUsableTarget(this.target)) {
      this.refreshScrollTargets();
      this.button.hidden = Boolean(this.editor);
      this.schedulePosition();
      return;
    }

    var detected = LD.bannerDetector.detect(document);
    if (!detected || !detected.editable || !detected.editButton) {
      this.target = detected;
      this.clearScrollTargets();
      this.button.hidden = true;
      return;
    }

    this.target = detected;
    this.refreshScrollTargets();
    this.button.hidden = Boolean(this.editor);
    this.schedulePosition();
  };

  LinkedDrawApp.prototype.hasUsableTarget = function hasUsableTarget(target) {
    if (!target || !target.editable || !target.element || !target.element.isConnected || !target.editButton || !target.editButton.isConnected) return false;
    return LD.bannerDetector.isLikelyCoverEditButton(target.editButton, target.element);
  };

  LinkedDrawApp.prototype.clearScrollTargets = function clearScrollTargets() {
    var targets = this.scrollTargets || [];
    for (var index = 0; index < targets.length; index += 1) {
      if (targets[index] && typeof targets[index].removeEventListener === 'function') {
        targets[index].removeEventListener('scroll', this.boundScroll);
      }
    }
    this.scrollTargets = [];
  };

  LinkedDrawApp.prototype.refreshScrollTargets = function refreshScrollTargets() {
    var anchor = this.target && this.target.editButton;
    var nextTargets = anchor && anchor.isConnected ? LD.positioning.getScrollableAncestors(anchor, window) : [];
    var currentTargets = this.scrollTargets || [];
    var unchanged = currentTargets.length === nextTargets.length && currentTargets.every(function (target, index) {
      return target === nextTargets[index];
    });
    if (unchanged) return;

    this.clearScrollTargets();
    for (var index = 0; index < nextTargets.length; index += 1) {
      var target = nextTargets[index];
      if (target && typeof target.addEventListener === 'function') {
        target.addEventListener('scroll', this.boundScroll, { passive: true });
      }
    }
    this.scrollTargets = nextTargets;
  };

  LinkedDrawApp.prototype.schedulePosition = function schedulePosition() {
    if (this.positionFrame) return;
    var self = this;
    this.positionFrame = requestAnimationFrame(function () {
      self.positionFrame = null;
      self.positionButton();
    });
  };

  LinkedDrawApp.prototype.positionButton = function positionButton() {
    if (this.editor) {
      this.button.hidden = true;
      return;
    }
    if (!this.target || !this.target.element || !this.target.element.isConnected || !LD.bannerDetector.isVisible(this.target.element)) {
      this.button.hidden = true;
      return;
    }
    var rect = this.target.element.getBoundingClientRect();
    var nativeButton = this.target.editButton;
    if (!nativeButton || !nativeButton.isConnected || !LD.bannerDetector.isVisible(nativeButton) || !LD.positioning.isViewportRectVisible(rect, window) || rect.width < 100) {
      this.button.hidden = true;
      return;
    }

    var nativeRect = nativeButton.getBoundingClientRect();
    var buttonRect = this.button.getBoundingClientRect ? this.button.getBoundingClientRect() : null;
    var estimatedWidth = buttonRect && buttonRect.width > 0 ? buttonRect.width : 118;
    if (!LD.positioning.isViewportRectVisible(nativeRect, window) || !LD.positioning.isElementFullyExposed(nativeButton, document, window)) {
      this.button.hidden = true;
      return;
    }

    var left = nativeRect.left - estimatedWidth - 10;
    var top = nativeRect.top;
    left = Math.max(8, Math.min(window.innerWidth - estimatedWidth - 8, left));
    top = Math.max(8, Math.min(window.innerHeight - 46, top));

    this.button.hidden = false;
    this.button.style.left = Math.round(left) + 'px';
    this.button.style.top = Math.round(top) + 'px';
  };

  LinkedDrawApp.prototype.status = function status() {
    return {
      ok: true,
      eligiblePage: isEligiblePage(),
      detected: Boolean(this.target),
      editable: Boolean(this.target && this.target.editable),
      editorOpen: Boolean(this.editor),
      version: LD.version
    };
  };

  LinkedDrawApp.prototype.isOpenTargetCurrent = function isOpenTargetCurrent(epoch, pageUrl, target) {
    return !this.destroyed && epoch === this.navigationEpoch && location.href === pageUrl && target === this.target &&
      Boolean(target && target.element && target.element.isConnected && target.editButton && target.editButton.isConnected);
  };

  LinkedDrawApp.prototype.isOpenOperationPageCurrent = function isOpenOperationPageCurrent(epoch, pageUrl) {
    return !this.destroyed && epoch === this.navigationEpoch && location.href === pageUrl;
  };

  LinkedDrawApp.prototype.loadCurrentBackground = async function loadCurrentBackground(target, settings) {
    if (!settings.includeCurrentBackground) return { phase: 'disabled', dataUrl: null, error: null };
    if (!target || !target.imageUrl) return { phase: 'unavailable', dataUrl: null, error: 'current-cover-image-unavailable' };
    var url = target.imageUrl;
    var allowDevelopmentSvg = isDevelopmentHost();

    try {
      if (url.indexOf('data:') === 0) {
        var dataResult = LD.imagePolicy.validateDataUrl(url, LD.constants.maxFetchedImageBytes, { allowDevelopmentSvg: allowDevelopmentSvg });
        if (!dataResult.ok) throw new Error(dataResult.error);
        return { phase: 'loading', dataUrl: dataResult.dataUrl, error: null };
      }
      if (url.indexOf('blob:') === 0 || new URL(url, location.href).origin === location.origin) {
        var controller = typeof AbortController === 'function' ? new AbortController() : null;
        var timeout = controller ? setTimeout(function () { controller.abort(); }, LD.constants.imageFetchTimeoutMs) : null;
        try {
          var localResponse = await fetch(url, { credentials: 'omit', signal: controller ? controller.signal : undefined });
          if (!localResponse.ok) throw new Error('Current cover returned HTTP ' + localResponse.status);
          if (url.indexOf('blob:') !== 0) {
            var finalUrl = localResponse.url || url;
            if (!LD.urlPolicy.isAllowedMediaUrl(finalUrl, { allowDevelopment: isDevelopmentHost() })) {
              throw new Error('Blocked redirected image URL');
            }
          }
          var localImage = await LD.imagePolicy.readResponse(localResponse, LD.constants.maxFetchedImageBytes, { allowDevelopmentSvg: allowDevelopmentSvg });
          var localBlob = new Blob([localImage.bytes], { type: localImage.mimeType });
          return { phase: 'loading', dataUrl: await fileToDataUrl(localBlob), error: null };
        } catch (error) {
          if (error && error.name === 'AbortError') throw new Error('Current cover request timed out');
          throw error;
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      }

      var response = await LD.webext.sendMessage({ type: LD.constants.messageTypes.fetchImage, url: url });
      if (!response || !response.ok || !response.dataUrl) throw new Error((response && response.error) || 'Background fetch failed');
      return { phase: 'loading', dataUrl: response.dataUrl, error: null };
    } catch (error) {
      LD.log('Current background unavailable', error);
      return { phase: 'unavailable', dataUrl: null, error: error && error.message ? error.message : String(error) };
    }
  };

  LinkedDrawApp.prototype.openEditor = async function openEditor() {
    if (this.editor || this.openingEditor) {
      this.showToast(LD.i18n.t('editorAlreadyOpen'), 'warning');
      return false;
    }

    this.openingEditor = true;
    try {
      this.scan();
      if (!this.target || !this.target.editable) {
        this.showToast(LD.i18n.t('noEditableCover'), 'warning');
        return false;
      }

      var openingEpoch = this.navigationEpoch;
      var openingUrl = location.href;
      var settings = await LD.settings.get();
      if (!this.isOpenTargetCurrent(openingEpoch, openingUrl, this.target)) return false;
      var targetAtOpen = this.target;
      var background = await this.loadCurrentBackground(targetAtOpen, settings);
      if (!this.isOpenTargetCurrent(openingEpoch, openingUrl, targetAtOpen)) return false;
      var self = this;

      this.button.hidden = true;
      this.editor = new LD.CoverEditor({
        mount: this.editorMount,
        settings: settings,
        backgroundDataUrl: background.dataUrl,
        backgroundError: background.error,
        backgroundPhase: background.phase,
        returnFocus: this.button,
        onCancel: function () {
          self.editor = null;
          self.scan();
        },
        onDelete: async function () {
          if (!self.isOpenTargetCurrent(openingEpoch, openingUrl, targetAtOpen)) return { status: 'failed', reason: 'navigation-changed' };
          var result = await LD.nativeUpload.deleteCover(targetAtOpen, function () {
            return self.isOpenTargetCurrent(openingEpoch, openingUrl, targetAtOpen);
          }, function () {
            return self.isOpenOperationPageCurrent(openingEpoch, openingUrl);
          });
          if (!self.isOpenOperationPageCurrent(openingEpoch, openingUrl)) return { status: 'failed', reason: 'navigation-changed' };
          if (result.status === 'success') self.showToast(LD.i18n.t('deleteCoverSuccess'), 'success');
          else if (result.status === 'handed-off') self.showToast(LD.i18n.t('deleteCoverHandedOff'), 'warning');
          else self.showToast(LD.i18n.t('deleteCoverFailed'), 'error');

          if (result.status === 'success' || result.status === 'handed-off') {
            self.editor = null;
            setTimeout(function () { self.scan(); }, 900);
          }
          return result;
        },
        onSave: async function (file) {
          if (!self.isOpenTargetCurrent(openingEpoch, openingUrl, targetAtOpen)) return { status: 'failed', reason: 'navigation-changed' };
          var result = await LD.nativeUpload.uploadCover(file, targetAtOpen, settings, function () {
            return self.isOpenTargetCurrent(openingEpoch, openingUrl, targetAtOpen);
          }, function () {
            return self.isOpenOperationPageCurrent(openingEpoch, openingUrl);
          });
          if (!self.isOpenOperationPageCurrent(openingEpoch, openingUrl)) return { status: 'failed', reason: 'navigation-changed' };
          if (result.status === 'success') self.showToast(LD.i18n.t('uploadSuccess'), 'success');
          else if (result.status === 'handed-off') self.showToast(LD.i18n.t('uploadHandedOff'), 'warning');
          else self.showToast(LD.i18n.t('uploadFailed'), 'error');

          if (result.status === 'success' || result.status === 'handed-off') {
            self.editor = null;
            setTimeout(function () { self.scan(); }, 900);
          }
          return result;
        }
      });

      return true;
    } finally {
      this.openingEditor = false;
    }
  };

  LinkedDrawApp.prototype.showToast = function showToast(message, kind) {
    var toast = document.createElement('div');
    toast.className = 'ld-toast';
    toast.setAttribute('data-kind', kind || 'info');
    toast.textContent = message;
    this.toastStack.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 180);
    }, 5200);
  };

  LinkedDrawApp.prototype.destroy = function destroy() {
    this.destroyed = true;
    clearInterval(this.interval);
    clearTimeout(this.scanTimer);
    if (this.observer) this.observer.disconnect();
    this.clearScrollTargets();
    window.removeEventListener('resize', this.boundResize);
    if (this.editor) this.editor.destroy();
    if (this.host) this.host.remove();
  };

  LD.LinkedDrawApp = LinkedDrawApp;
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
