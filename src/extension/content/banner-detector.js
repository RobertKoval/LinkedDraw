(function (LD) {
  'use strict';

  var bannerKeywords = ['background', 'cover', 'banner', 'обклад', 'фон', 'pozad', 'tło', 'capa', 'couverture'];
  var editKeywords = [
    'edit', 'change', 'add', 'camera', 'cover', 'background', 'photo', 'image',
    'редаг', 'змін', 'дод', 'камера', 'обклад', 'фон', 'фото', 'зображ',
    'upravit', 'změn', 'přidat', 'nahrát', 'fot',
    'измен', 'редакт', 'добав', 'загруз'
  ];
  var excludedActionKeywords = [
    'dismiss', 'view', 'close', 'next', 'skip', 'suggestion', 'recommendation', 'notification',
    'відхил', 'закр', 'далі', 'пропуст', 'рекоменд', 'сповіщ',
    'отклон', 'закры', 'далее', 'пропуст', 'рекоменд', 'уведом'
  ];

  function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function accessibleText(element) {
    if (!element) return '';
    return normalizeText([
      element.getAttribute && element.getAttribute('aria-label'),
      element.getAttribute && element.getAttribute('title'),
      element.getAttribute && element.getAttribute('data-control-name'),
      element.textContent
    ].filter(Boolean).join(' '));
  }

  function containsKeyword(text, keywords) {
    return keywords.some(function (keyword) { return text.indexOf(keyword) >= 0; });
  }

  function isExcludedActionText(text) {
    return containsKeyword(normalizeText(text), excludedActionKeywords);
  }

  function hasKnownCoverControlAttribute(button) {
    if (!button || !button.getAttribute) return false;
    var attributes = ['data-control-name', 'data-view-name', 'componentkey', 'data-testid', 'data-test-id'];
    var value = attributes.map(function (attribute) { return button.getAttribute(attribute) || ''; }).join(' ');
    return /cover.*(?:edit|button|image|photo)|(?:edit|button|image|photo).*cover|profile[-_ ]?background|background.*(?:edit|image|photo)/i.test(value);
  }

  function isCoverEditButtonMeta(meta) {
    return Boolean(meta && (meta.keywordHint || meta.knownCoverControl));
  }

  function isLikelyCoverEditButton(button, banner) {
    if (!button || !banner || !isVisible(button) || !isVisible(banner)) return false;
    var text = accessibleText(button);
    if (isExcludedActionText(text)) return false;
    var keywordHint = containsKeyword(text, editKeywords);
    var knownCoverControl = hasKnownCoverControlAttribute(button);
    if (!isCoverEditButtonMeta({ keywordHint: keywordHint, knownCoverControl: knownCoverControl })) return false;
    var score = scoreEditButtonMeta({
      buttonRect: button.getBoundingClientRect(),
      bannerRect: banner.getBoundingClientRect(),
      keywordHint: keywordHint,
      hasSvg: Boolean(button.querySelector && button.querySelector('svg')),
      isButton: button.tagName === 'BUTTON',
      insideSameContainer: Boolean(banner.contains && banner.contains(button)),
      disabled: Boolean(button.disabled || button.getAttribute('aria-disabled') === 'true')
    });
    return score >= 34;
  }

  function isVisible(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    var rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;
    var style = globalThis.getComputedStyle ? getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0)) return false;
    return true;
  }

  function extractCssUrl(value) {
    var match = /url\((['"]?)(.*?)\1\)/.exec(String(value || ''));
    return match && match[2] ? match[2] : null;
  }

  function extractImageUrl(element) {
    if (!element) return null;
    if (element.tagName === 'IMG') {
      return element.currentSrc || element.src || element.getAttribute('src');
    }
    var style = globalThis.getComputedStyle ? getComputedStyle(element) : null;
    return extractCssUrl((style && style.backgroundImage) || (element.style && element.style.backgroundImage));
  }

  function scoreBannerCandidateMeta(meta) {
    var rect = LD.geometry.normalizeRect(meta.rect || {});
    if (rect.width < 420 || rect.height < 90) return -1000;
    var aspect = rect.width / Math.max(1, rect.height);
    var score = 0;

    if (rect.width >= 700) score += 24;
    else if (rect.width >= 520) score += 14;

    if (aspect >= 3.25 && aspect <= 4.9) score += 38;
    else if (aspect >= 2.6 && aspect <= 6.2) score += 19;
    else score -= 20;

    if (rect.height >= 140 && rect.height <= 340) score += 16;
    if (rect.top >= -80 && rect.top <= 520) score += 18;
    if (rect.top > 900) score -= 40;
    if (meta.knownSelector) score += 55;
    if (meta.isImage) score += 10;
    if (meta.hasImageUrl) score += 12;
    if (meta.imageHostHint) score += 10;
    if (meta.keywordHint) score += 12;
    if (meta.insideMain) score += 6;
    if (meta.hasNearbyEditControl) score += 24;

    return score;
  }

  function scoreEditButtonMeta(meta) {
    var button = LD.geometry.normalizeRect(meta.buttonRect || {});
    var banner = LD.geometry.normalizeRect(meta.bannerRect || {});
    if (button.width < 14 || button.height < 14 || button.width > 180 || button.height > 100) return -1000;

    var centerX = button.left + button.width / 2;
    var centerY = button.top + button.height / 2;
    var xRatio = (centerX - banner.left) / Math.max(1, banner.width);
    var yRatio = (centerY - banner.top) / Math.max(1, banner.height);
    var score = 0;

    if (xRatio >= 0.72 && xRatio <= 1.06) score += 34;
    else if (xRatio >= 0.55 && xRatio <= 1.12) score += 14;
    else score -= 18;

    if (yRatio >= -0.15 && yRatio <= 0.62) score += 24;
    else if (yRatio <= 1.05) score += 7;
    else score -= 18;

    if (meta.keywordHint) score += 42;
    if (meta.hasSvg) score += 5;
    if (meta.isButton) score += 5;
    if (meta.insideSameContainer) score += 8;
    if (meta.disabled) score -= 30;
    return score;
  }

  function collectCandidates(root) {
    var candidates = [];
    var seen = new Set();

    function add(element, knownSelector) {
      if (!element || seen.has(element)) return;
      seen.add(element);
      candidates.push({ element: element, knownSelector: Boolean(knownSelector) });
    }

    var knownSelectors = [
      '[data-view-name*="profile-background" i]',
      '[data-view-name*="cover" i]',
      '.profile-background-image',
      '.profile-background-image__image',
      'img[alt*="background" i]',
      'img[alt*="cover" i]',
      'section img[alt*="photo" i]'
    ];

    knownSelectors.forEach(function (selector) {
      try {
        root.querySelectorAll(selector).forEach(function (element) { add(element, true); });
      } catch {
        // Old Safari can reject some case-insensitive selectors. Heuristics remain.
      }
    });

    var main = root.querySelector('main') || root.body || root.documentElement || root;
    var visualNodes = main.querySelectorAll ? main.querySelectorAll('img, [style*="background"], section, div') : [];
    for (var index = 0; index < visualNodes.length && index < 700; index += 1) {
      var element = visualNodes[index];
      if (element.closest && element.closest('#' + LD.constants.rootHostId)) continue;
      var rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
      if (!rect || rect.top > 720 || rect.bottom < -120 || rect.width < 420 || rect.height < 90 || rect.height > 420) continue;
      var aspect = rect.width / Math.max(1, rect.height);
      if (aspect < 2.45 || aspect > 7.5) continue;
      if (element.tagName === 'IMG' || extractImageUrl(element) || element.querySelector('button, [role="button"]')) add(element, false);
    }

    return candidates;
  }

  function collectNearbyButtons(element, root) {
    var buttons = [];
    var seen = new Set();

    function add(candidate, sameContainer) {
      if (!candidate || seen.has(candidate) || !isVisible(candidate)) return;
      seen.add(candidate);
      buttons.push({ element: candidate, sameContainer: sameContainer });
    }

    var ancestor = element;
    for (var depth = 0; ancestor && depth < 5; depth += 1, ancestor = ancestor.parentElement) {
      if (ancestor.querySelectorAll) {
        ancestor.querySelectorAll('button, [role="button"]').forEach(function (button) { add(button, true); });
      }
      var ancestorRect = ancestor.getBoundingClientRect ? ancestor.getBoundingClientRect() : null;
      if (ancestorRect && ancestorRect.height > 760) break;
    }

    var bannerRect = element.getBoundingClientRect();
    var allButtons = root.querySelectorAll ? root.querySelectorAll('button, [role="button"]') : [];
    for (var index = 0; index < allButtons.length && index < 500; index += 1) {
      var button = allButtons[index];
      var rect = button.getBoundingClientRect ? button.getBoundingClientRect() : null;
      if (!rect) continue;
      var near = rect.left <= bannerRect.right + 90 && rect.right >= bannerRect.left - 90 && rect.top <= bannerRect.bottom + 80 && rect.bottom >= bannerRect.top - 80;
      if (near) add(button, false);
    }

    return buttons;
  }

  function findEditButton(element, root) {
    var bannerRect = element.getBoundingClientRect();
    var candidates = collectNearbyButtons(element, root);
    var best = null;
    var bestScore = -Infinity;

    candidates.forEach(function (candidate) {
      var button = candidate.element;
      var text = accessibleText(button);
      if (!isLikelyCoverEditButton(button, element)) return;
      var keywordHint = containsKeyword(text, editKeywords);
      var score = scoreEditButtonMeta({
        buttonRect: button.getBoundingClientRect(),
        bannerRect: bannerRect,
        keywordHint: keywordHint,
        hasSvg: Boolean(button.querySelector && button.querySelector('svg')),
        isButton: button.tagName === 'BUTTON',
        insideSameContainer: candidate.sameContainer,
        disabled: Boolean(button.disabled || button.getAttribute('aria-disabled') === 'true')
      });
      if (score > bestScore) {
        bestScore = score;
        best = button;
      }
    });

    return bestScore >= 34 ? { element: best, score: bestScore } : null;
  }

  function detect(root) {
    root = root || document;
    if (!root.querySelectorAll) return null;
    var candidates = collectCandidates(root);
    var best = null;
    var bestScore = -Infinity;

    candidates.forEach(function (candidate) {
      var element = candidate.element;
      if (!isVisible(element)) return;
      var rect = element.getBoundingClientRect();
      var imageUrl = extractImageUrl(element);
      var edit = findEditButton(element, root);
      var text = accessibleText(element);
      var score = scoreBannerCandidateMeta({
        rect: rect,
        knownSelector: candidate.knownSelector,
        isImage: element.tagName === 'IMG',
        hasImageUrl: Boolean(imageUrl),
        imageHostHint: /licdn|linkedin/i.test(String(imageUrl || '')),
        keywordHint: containsKeyword(text, bannerKeywords),
        insideMain: Boolean(element.closest && element.closest('main')),
        hasNearbyEditControl: Boolean(edit)
      });

      if (score > bestScore) {
        bestScore = score;
        best = {
          element: element,
          container: chooseContainer(element),
          rect: rect,
          imageUrl: imageUrl,
          editButton: edit ? edit.element : null,
          editable: Boolean(edit),
          score: score,
          editScore: edit ? edit.score : null
        };
      }
    });

    return bestScore >= 50 ? best : null;
  }

  function chooseContainer(element) {
    var current = element;
    for (var depth = 0; current && depth < 4; depth += 1, current = current.parentElement) {
      var rect = current.getBoundingClientRect ? current.getBoundingClientRect() : null;
      if (!rect) continue;
      var aspect = rect.width / Math.max(1, rect.height);
      if (rect.width >= 420 && rect.height >= 90 && rect.height <= 480 && aspect >= 2.2) return current;
    }
    return element;
  }

  LD.bannerDetector = {
    detect: detect,
    accessibleText: accessibleText,
    isExcludedActionText: isExcludedActionText,
    isCoverEditButtonMeta: isCoverEditButtonMeta,
    hasKnownCoverControlAttribute: hasKnownCoverControlAttribute,
    isLikelyCoverEditButton: isLikelyCoverEditButton,
    extractImageUrl: extractImageUrl,
    scoreBannerCandidateMeta: scoreBannerCandidateMeta,
    scoreEditButtonMeta: scoreEditButtonMeta,
    isVisible: isVisible
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
