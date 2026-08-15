(function (LD) {
  'use strict';

  var uploadKeywords = [
    'change', 'upload', 'add photo', 'add image', 'cover image', 'background photo',
    'змін', 'завантаж', 'додати фото', 'додати зображ', 'обклад',
    'nahrát', 'změn', 'přidat', 'fot',
    'измен', 'загруз', 'добав'
  ];

  var confirmKeywords = [
    'save', 'apply', 'done', 'next',
    'зберегти', 'застосувати', 'готово', 'далі',
    'uložit', 'použít', 'hotovo', 'další',
    'сохранить', 'применить', 'готово', 'далее'
  ];

  var rejectKeywords = [
    'cancel', 'close', 'delete', 'remove',
    'скасувати', 'закрити', 'видал',
    'zrušit', 'zavřít', 'odstranit',
    'отмена', 'закрыть', 'удалить'
  ];

  var coverEditorKeywords = [
    'edit cover', 'edit background', 'change cover',
    'редагувати обклад', 'змінити обклад',
    'upravit titulní', 'změnit titulní',
    'редактировать облож', 'изменить облож'
  ];

  var coverSurfaceKeywords = [
    'cover photo', 'cover image', 'background image',
    'обкладинк', 'фонове зображення',
    'titulní fot', 'obrázek na pozadí',
    'обложк', 'фоновое изображение'
  ];

  var deleteKeywords = [
    'delete', 'remove',
    'видалити', 'прибрати',
    'odstranit',
    'удалить', 'убрать'
  ];

  function sleep(milliseconds) {
    return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
  }

  function assertSessionCurrent(session) {
    if (!session || typeof session.isCurrent !== 'function' || session.isCurrent()) return;
    var error = new Error('Native cover operation is no longer current');
    error.code = 'navigation-changed';
    throw error;
  }

  async function waitFor(factory, timeoutMs, intervalMs, session) {
    var deadline = Date.now() + (timeoutMs || 8000);
    var interval = intervalMs || 120;
    var lastError = null;
    while (Date.now() < deadline) {
      assertSessionCurrent(session);
      try {
        var result = factory();
        if (result) return result;
      } catch (error) {
        lastError = error;
      }
      await sleep(interval);
    }
    if (lastError) LD.log('waitFor last error', lastError);
    return null;
  }

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function buttonText(button) {
    return normalizeText([
      button.getAttribute && button.getAttribute('aria-label'),
      button.getAttribute && button.getAttribute('title'),
      button.textContent
    ].filter(Boolean).join(' '));
  }

  function containsAny(text, keywords) {
    return keywords.some(function (keyword) { return text.indexOf(keyword) >= 0; });
  }

  function visible(element) {
    return LD.bannerDetector.isVisible(element);
  }

  function visibleDialogs(session) {
    var selectors = [
      'dialog[open]',
      '[role="dialog"]',
      '.artdeco-modal',
      '[data-test-modal]'
    ];
    var result = [];
    var seen = new Set();
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (!seen.has(element) && visible(element) && !(session && session.initialDialogs && session.initialDialogs.has(element))) {
          seen.add(element);
          result.push(element);
        }
      });
    });
    return result;
  }

  function newestDialog(session) {
    var dialogs = visibleDialogs(session);
    return dialogs.length ? dialogs[dialogs.length - 1] : null;
  }

  function visibleMenus(session) {
    var selectors = [
      '[role="menu"]',
      '[role="listbox"]'
    ];
    var result = [];
    var seen = new Set();
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (element) {
        if (!seen.has(element) && visible(element) && !(session && session.initialMenus && session.initialMenus.has(element))) {
          seen.add(element);
          result.push(element);
        }
      });
    });
    return result;
  }

  function newestActionSurface(session) {
    return newestDialog(session) || (visibleMenus(session).slice(-1)[0] || null);
  }

  function allFileInputs() {
    return Array.prototype.slice.call(document.querySelectorAll('input[type="file"]'));
  }

  function inputHasCoverIdentity(input) {
    return /cover|background/i.test([
      input && input.name,
      input && input.id,
      input && input.getAttribute && input.getAttribute('data-testid'),
      input && input.getAttribute && input.getAttribute('aria-label')
    ].join(' '));
  }

  function isInsideSurface(input, surface) {
    if (!input || !surface) return false;
    if (input === surface) return true;
    if (surface.contains && surface.contains(input)) return true;
    if (input.closest) {
      var owner = input.closest('dialog[open], [role="dialog"], .artdeco-modal, [data-test-modal]');
      if (owner === surface) return true;
    }
    return false;
  }

  function isFileInputBoundToSession(input, session) {
    if (!session) return true;
    var surface = session.surface || null;
    var initialInputs = session.initialInputs || new Set();
    var authorization = session.detachedInputAuthorization || { phase: 'inactive' };
    var newlyCreated = !initialInputs.has(input);
    var createdByCurrentAction = authorization.phase === 'armed' && !authorization.baseline.has(input);
    var boundToSurface = isInsideSurface(input, surface);
    var owner = input && input.closest ? input.closest('dialog[open], [role="dialog"], .artdeco-modal, [data-test-modal]') : null;
    if (owner && surface && owner !== surface) return false;
    if (boundToSurface) return true;
    return newlyCreated && !owner && createdByCurrentAction;
  }

  function scoreFileInput(input, initialInputs, session) {
    if (!input || input.disabled) return -1000;
    if (!isFileInputBoundToSession(input, session)) return -1000;
    var score = 0;
    var accept = normalizeText(input.getAttribute('accept'));
    if (!initialInputs.has(input)) score += 70;
    if (!accept || accept.indexOf('image') >= 0 || accept.indexOf('.png') >= 0 || accept.indexOf('.jpg') >= 0 || accept.indexOf('.jpeg') >= 0) score += 24;
    if (input.closest && input.closest('dialog[open], [role="dialog"], .artdeco-modal, [data-test-modal]')) score += 65;
    if (input.multiple) score -= 8;
    if (inputHasCoverIdentity(input)) score += 16;
    if (input.name && /cover|background|photo|image/i.test(input.name)) score += 16;
    if (input.id && /cover|background|photo|image/i.test(input.id)) score += 16;
    return score;
  }

  function findBestFileInput(initialInputs, session) {
    var best = null;
    var bestScore = -Infinity;
    allFileInputs().forEach(function (input) {
      var score = scoreFileInput(input, initialInputs, session);
      if (score > bestScore) {
        best = input;
        bestScore = score;
      }
    });
    return bestScore >= 20 ? best : null;
  }

  function scoreActionButton(button, mode, dialog) {
    if (!button || !visible(button) || button.disabled || button.getAttribute('aria-disabled') === 'true') return -1000;
    var text = buttonText(button);
    if (containsAny(text, rejectKeywords)) return -1000;

    var score = 0;
    var keywords = mode === 'confirm' ? confirmKeywords : uploadKeywords;
    if (containsAny(text, keywords)) score += 70;
    if (button.tagName === 'BUTTON') score += 5;
    if (dialog && button.closest && button.closest('dialog[open], [role="dialog"], .artdeco-modal, [data-test-modal]') === dialog) score += 20;

    if (dialog) {
      var rect = button.getBoundingClientRect();
      var dialogRect = dialog.getBoundingClientRect();
      var xRatio = (rect.left + rect.width / 2 - dialogRect.left) / Math.max(1, dialogRect.width);
      var yRatio = (rect.top + rect.height / 2 - dialogRect.top) / Math.max(1, dialogRect.height);
      if (mode === 'confirm' && xRatio > 0.55 && yRatio > 0.55) score += 18;
    }

    return score;
  }

  function findDialogAction(mode, session) {
    var dialog = newestDialog(session);
    var scope = dialog || (session && session.surface) || newestActionSurface(session) || document;
    var buttons = scope.querySelectorAll('button, [role="button"], a');
    var best = null;
    var bestScore = -Infinity;
    buttons.forEach(function (button) {
      var score = scoreActionButton(button, mode, dialog);
      if (score > bestScore) {
        bestScore = score;
        best = button;
      }
    });
    return bestScore >= 60 ? best : null;
  }

  function enabledVisibleAction(element) {
    return Boolean(element && visible(element) && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
  }

  function findActionByKeywords(scope, keywords) {
    if (!scope || !scope.querySelectorAll) return null;
    var actions = scope.querySelectorAll('button, [role="button"], a');
    for (var index = 0; index < actions.length; index += 1) {
      if (enabledVisibleAction(actions[index]) && containsAny(buttonText(actions[index]), keywords)) return actions[index];
    }
    return null;
  }

  function findCoverEditorAction(scope) {
    return findActionByKeywords(scope, coverEditorKeywords);
  }

  function findDeleteAction(scope) {
    if (!scope || !containsAny(buttonText(scope), coverSurfaceKeywords)) return null;
    return findActionByKeywords(scope, deleteKeywords);
  }

  function assignFile(input, file) {
    if (typeof DataTransfer !== 'function') {
      throw new Error('This browser does not expose DataTransfer to the content script');
    }
    var transfer = new DataTransfer();
    transfer.items.add(file);
    var descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    if (descriptor && descriptor.set) descriptor.set.call(input, transfer.files);
    else input.files = transfer.files;

    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function clickElement(element) {
    if (!element) return false;
    try {
      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    } catch (_error) {
      // scrollIntoView options are not uniform across Safari versions.
    }
    element.click();
    return true;
  }

  function targetMatchesSession(session, detectedBanner) {
    if (!session || !session.target || !detectedBanner) return true;
    var target = session.target;
    var hasIdentity = Boolean(target.element || target.container || target.editButton);
    if (!hasIdentity) return true;
    if (target.element && detectedBanner.element === target.element) return true;
    if (target.container && detectedBanner.element && target.container.contains && target.container.contains(detectedBanner.element)) return true;
    if (target.editButton && detectedBanner.editButton === target.editButton) return true;
    return false;
  }

  function currentBannerUrl(session) {
    var detected = LD.bannerDetector.detect(document);
    return targetMatchesSession(session, detected) && detected && detected.imageUrl ? detected.imageUrl : null;
  }

  function deletionEvidence(previousBannerUrl, detectedBanner, session) {
    if (!previousBannerUrl || !detectedBanner || !targetMatchesSession(session, detectedBanner)) return null;
    if (!detectedBanner.imageUrl) return 'banner-image-removed';
    if (detectedBanner.imageUrl !== previousBannerUrl) return 'banner-url-changed';
    return null;
  }

  async function waitForStableDeletionEvidence(previousBannerUrl, timeoutMs, intervalMs, requiredMatches, session) {
    var deadline = Date.now() + timeoutMs;
    var interval = intervalMs || 120;
    var matchesNeeded = requiredMatches || 3;
    var lastEvidence = null;
    var consecutiveMatches = 0;

    while (Date.now() < deadline) {
      assertSessionCurrent(session);
      var evidence = deletionEvidence(previousBannerUrl, LD.bannerDetector.detect(document), session);
      if (evidence && evidence === lastEvidence) consecutiveMatches += 1;
      else {
        lastEvidence = evidence;
        consecutiveMatches = evidence ? 1 : 0;
      }
      if (consecutiveMatches >= matchesNeeded) return evidence;
      await sleep(interval);
    }
    return null;
  }

  function uploadEvidence(previousBannerUrl, detectedBanner, session) {
    if (!detectedBanner || !targetMatchesSession(session, detectedBanner) || !detectedBanner.imageUrl) return null;
    if (detectedBanner.imageUrl === previousBannerUrl) return null;
    return previousBannerUrl ? 'banner-changed-after-confirm' : 'banner-added-after-confirm';
  }

  async function waitForStableUploadEvidence(previousBannerUrl, timeoutMs, intervalMs, requiredMatches, session) {
    var deadline = Date.now() + timeoutMs;
    var interval = intervalMs || 120;
    var matchesNeeded = requiredMatches || 3;
    var lastEvidence = null;
    var consecutiveMatches = 0;

    while (Date.now() < deadline) {
      assertSessionCurrent(session);
      var evidence = uploadEvidence(previousBannerUrl, LD.bannerDetector.detect(document), session);
      if (evidence && evidence === lastEvidence) consecutiveMatches += 1;
      else {
        lastEvidence = evidence;
        consecutiveMatches = evidence ? 1 : 0;
      }
      if (consecutiveMatches >= matchesNeeded) return evidence;
      await sleep(interval);
    }
    return null;
  }

  async function confirmNativeDialogs(previousBannerUrl, session) {
    var clicked = 0;
    for (var round = 0; round < LD.constants.nativeConfirmRounds; round += 1) {
      assertSessionCurrent(session);
      var button = await waitFor(function () { return findDialogAction('confirm', session); }, 5000, 140, session);
      if (!button) break;
      var baselineUrl = currentBannerUrl(session) || previousBannerUrl;
      assertSessionCurrent(session);
      clickElement(button);
      clicked += 1;
      var evidence = await waitForStableUploadEvidence(baselineUrl, 1800, 120, 3, session);
      if (evidence) return { success: true, clicked: clicked, reason: evidence };
      if (visibleDialogs(session).length === 0) break;
    }
    return { success: false, clicked: clicked, reason: clicked ? 'postcondition-unconfirmed' : 'confirm-not-found' };
  }

  function downloadFile(file) {
    var url = URL.createObjectURL(file);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name || 'linkedin-cover.png';
    anchor.style.display = 'none';
    document.documentElement.appendChild(anchor);
    anchor.click();
    setTimeout(function () {
      anchor.remove();
      URL.revokeObjectURL(url);
    }, 2000);
  }

  function createNativeSession(target, isCurrent, postClickCurrent) {
    return {
      target: target || null,
      isCurrent: isCurrent || null,
      postClickCurrent: postClickCurrent || null,
      initialDialogs: new Set(visibleDialogs()),
      initialMenus: new Set(visibleMenus()),
      initialInputs: new Set(allFileInputs()),
      detachedInputAuthorization: { phase: 'inactive' },
      surface: null
    };
  }

  function armDetachedInputAuthorization(session) {
    session.detachedInputAuthorization = {
      phase: 'armed',
      baseline: new Set(allFileInputs())
    };
  }

  function consumeDetachedInputAuthorization(session) {
    session.detachedInputAuthorization = { phase: 'inactive' };
  }

  async function locateInputAfterEdit(session) {
    assertSessionCurrent(session);
    var input = await waitFor(function () { return findBestFileInput(session.initialInputs, session); }, 2500, 100, session);
    if (input) return input;

    for (var attempt = 0; attempt < 3; attempt += 1) {
      assertSessionCurrent(session);
      var action = findDialogAction('upload', session);
      if (!action) break;
      assertSessionCurrent(session);
      armDetachedInputAuthorization(session);
      clickElement(action);
      var nextDialog = await waitFor(function () { return newestDialog(session); }, 2500, 100, session);
      if (nextDialog) session.surface = nextDialog;
      input = await waitFor(function () { return findBestFileInput(session.initialInputs, session); }, 2500, 100, session);
      if (input) {
        consumeDetachedInputAuthorization(session);
        return input;
      }
    }
    return null;
  }

  async function openCoverEditor(originalTarget, session) {
    assertSessionCurrent(session);
    var detected = LD.bannerDetector.detect(document);
    if (originalTarget && detected && !targetMatchesSession({ target: originalTarget }, detected)) {
      throw new Error('LinkedIn cover target changed before native edit');
    }
    var target = originalTarget || detected;
    if (!target || !target.editButton) throw new Error('LinkedIn cover edit control was not found');
    session.target = target;

    assertSessionCurrent(session);
    clickElement(target.editButton);
    if (session.postClickCurrent) session.isCurrent = session.postClickCurrent;
    var surface = await waitFor(function () { return newestActionSurface(session); }, 2500, 100, session);
    session.surface = surface;
    if (surface && findDeleteAction(surface)) return surface;
    var editAction = findCoverEditorAction(surface);
    if (!editAction) throw new Error('LinkedIn cover editor action was not found');
    assertSessionCurrent(session);
    clickElement(editAction);

    var dialog = await waitFor(function () {
      var candidate = newestDialog(session);
      return candidate && findDeleteAction(candidate) ? candidate : null;
    }, 3000, 100, session);
    if (!dialog) throw new Error('LinkedIn cover Delete action was not found');
    session.surface = dialog;
    return dialog;
  }

  async function deleteCover(originalTarget, isCurrent, postClickCurrent) {
    try {
      var session = createNativeSession(originalTarget, isCurrent, postClickCurrent);
      var previousBannerUrl = originalTarget && originalTarget.imageUrl ? originalTarget.imageUrl : currentBannerUrl(session);
      var dialog = await openCoverEditor(originalTarget, session);
      var deleteAction = findDeleteAction(dialog);
      if (!deleteAction) throw new Error('LinkedIn cover Delete action was not found');
      assertSessionCurrent(session);
      clickElement(deleteAction);

      var evidence = await waitForStableDeletionEvidence(previousBannerUrl, 1800, 120, 3, session);

      if (evidence) {
        return { status: 'success', reason: evidence };
      }
      return { status: 'handed-off', reason: 'deletion-unconfirmed' };
    } catch (error) {
      LD.log('Native cover deletion failed', error);
      return { status: 'failed', reason: error && error.code === 'navigation-changed' ? 'navigation-changed' : 'native-delete-failed' };
    }
  }

  async function uploadCover(file, originalTarget, settings, isCurrent, postClickCurrent) {
    var injected = false;

    try {
      var detected = LD.bannerDetector.detect(document);
      if (originalTarget && detected && !targetMatchesSession({ target: originalTarget }, detected)) {
        throw new Error('LinkedIn cover target changed before native upload');
      }
      var target = originalTarget || detected;
      if (!target || !target.editButton) throw new Error('LinkedIn cover edit control was not found');
      var session = createNativeSession(target, isCurrent, postClickCurrent);
      var previousBannerUrl = target.imageUrl || currentBannerUrl(session);

      assertSessionCurrent(session);
      armDetachedInputAuthorization(session);
      clickElement(target.editButton);
      if (session.postClickCurrent) session.isCurrent = session.postClickCurrent;
      var surface = await waitFor(function () { return newestActionSurface(session); }, 2500, 100, session);
      session.surface = surface;
      var input = await locateInputAfterEdit(session);
      if (!input) throw new Error('LinkedIn image file input was not found');

      assertSessionCurrent(session);
      assignFile(input, file);
      injected = true;
      await sleep(650);
      assertSessionCurrent(session);

      if (!settings.autoConfirmUpload) {
        return {
          status: 'handed-off',
          reason: 'native-confirmation-pending'
        };
      }

      var confirmation = await confirmNativeDialogs(previousBannerUrl, session);
      if (confirmation.success) {
        return {
          status: 'success',
          reason: confirmation.reason
        };
      }

      return {
        status: 'handed-off',
        reason: confirmation.reason
      };
    } catch (error) {
      LD.log('Native upload failed', error);
      if (error && error.code === 'navigation-changed') {
        return { status: 'failed', reason: 'navigation-changed', downloaded: false };
      }
      if (!injected) downloadFile(file);
      return {
        status: injected ? 'handed-off' : 'failed',
        reason: injected ? 'native-confirmation-pending' : 'native-upload-failed',
        downloaded: !injected
      };
    }
  }

  LD.nativeUpload = {
    uploadCover: uploadCover,
    deleteCover: deleteCover,
    assignFile: assignFile,
    downloadFile: downloadFile,
    waitFor: waitFor,
    scoreFileInput: scoreFileInput,
    scoreActionButton: scoreActionButton,
    findDialogAction: findDialogAction,
    confirmNativeDialogs: confirmNativeDialogs,
    findCoverEditorAction: findCoverEditorAction,
    findDeleteAction: findDeleteAction
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
