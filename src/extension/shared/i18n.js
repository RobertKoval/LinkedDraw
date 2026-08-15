(function (LD) {
  'use strict';

  var strings = {
    en: {
      draw: 'Draw',
      editorTitle: 'LinkedDraw',
      editorSubtitle: 'LinkedIn cover · 1584 × 396',
      pen: 'Pen',
      line: 'Line',
      arrow: 'Arrow',
      rectangle: 'Rectangle',
      text: 'Text',
      eraser: 'Eraser',
      color: 'Color',
      width: 'Width',
      fontSize: 'Text size',
      undo: 'Undo',
      redo: 'Redo',
      clear: 'Clear canvas',
      deleteCover: 'Delete cover',
      deleteCoverConfirm: 'Delete the current cover from LinkedIn?',
      deletingCover: 'Opening LinkedIn’s native delete flow…',
      deleteCoverSuccess: 'LinkedIn deleted the cover.',
      deleteCoverHandedOff: 'Finish deleting the cover in LinkedIn’s native dialog.',
      deleteCoverFailed: 'LinkedIn cover could not be deleted.',
      safeAreas: 'Safe areas',
      visibleCoverArea: 'visible cover',
      profilePhotoArea: 'profile photo',
      coverControlsArea: 'cover controls',
      cancel: 'Close without changes',
      save: 'Save to LinkedIn',
      saving: 'Preparing image…',
      loadingBackground: 'Loading current cover…',
      backgroundUnavailable: 'Current cover could not be loaded. Drawing on a neutral background.',
      confirmWithoutBackground: 'The current cover is unavailable. Saving now will replace it with the neutral background shown in the editor. Continue?',
      hint: 'Shortcuts: P/L/A/R/T/E · ⌘/Ctrl+Z · ⌘/Ctrl+Enter to save · Esc to close without changes',
      textHint: 'Type text. Ctrl/Cmd+Enter commits; Esc cancels.',
      emptyText: 'Text',
      uploadSuccess: 'LinkedIn accepted the new cover.',
      uploadHandedOff: 'Image inserted. Finish in LinkedIn’s native dialog.',
      uploadFailed: 'Automatic upload failed. The generated image was downloaded.',
      noEditableCover: 'Open your own LinkedIn profile to edit its cover.',
      editorAlreadyOpen: 'Editor is already open.',
      openEditor: 'Draw on cover',
      profileDetected: 'Editable profile cover detected.',
      profileNotDetected: 'No editable profile cover detected on this page.',
      options: 'Settings',
      autoConfirm: 'Automatically click LinkedIn Apply/Save',
      includeBackground: 'Include the current cover image',
      showSafeAreasOption: 'Show visible-area and LinkedIn overlay guides by default',
      outputFormat: 'Preferred output format',
      png: 'PNG (best for graphics)',
      jpeg: 'JPEG (smaller)',
      jpegQuality: 'JPEG quality',
      defaultColor: 'Default color',
      defaultWidth: 'Default stroke width',
      defaultFontSize: 'Default text size',
      saved: 'Saved',
      reset: 'Reset defaults',
      privacySummary: 'No analytics. No remote code. Images stay local until LinkedIn’s own upload UI receives the generated file.',
      popupTitle: 'LinkedDraw',
      popupDescription: 'Draw directly on your LinkedIn profile cover.',
      openLinkedIn: 'Open LinkedIn profile',
      unavailable: 'The content script is not available. Reload the LinkedIn tab after installing the extension.',
      clearConfirm: 'Clear every drawing object?',
      downloadingFallback: 'Downloading a fallback image…'
    },
    uk: {
      draw: 'Малювати',
      editorTitle: 'LinkedDraw',
      editorSubtitle: 'Обкладинка LinkedIn · 1584 × 396',
      pen: 'Олівець',
      line: 'Лінія',
      arrow: 'Стрілка',
      rectangle: 'Прямокутник',
      text: 'Текст',
      eraser: 'Гумка',
      color: 'Колір',
      width: 'Товщина',
      fontSize: 'Розмір тексту',
      undo: 'Скасувати',
      redo: 'Повторити',
      clear: 'Очистити канву',
      deleteCover: 'Видалити обкладинку',
      deleteCoverConfirm: 'Видалити поточну обкладинку з LinkedIn?',
      deletingCover: 'Відкриваю штатне видалення в LinkedIn…',
      deleteCoverSuccess: 'LinkedIn видалив обкладинку.',
      deleteCoverHandedOff: 'Заверши видалення у штатному вікні LinkedIn.',
      deleteCoverFailed: 'Не вдалося видалити обкладинку LinkedIn.',
      safeAreas: 'Безпечні зони',
      visibleCoverArea: 'видима обкладинка',
      profilePhotoArea: 'фото профілю',
      coverControlsArea: 'кнопки обкладинки',
      cancel: 'Закрити без змін',
      save: 'Зберегти в LinkedIn',
      saving: 'Готую зображення…',
      loadingBackground: 'Завантажую поточну обкладинку…',
      backgroundUnavailable: 'Поточну обкладинку не вдалося завантажити. Малювання буде на нейтральному фоні.',
      confirmWithoutBackground: 'Поточна обкладинка недоступна. Якщо зберегти зараз, її буде замінено нейтральним фоном, який видно в редакторі. Продовжити?',
      hint: 'Клавіші: P/L/A/R/T/E · ⌘/Ctrl+Z · ⌘/Ctrl+Enter зберегти · Esc закрити без змін',
      textHint: 'Введи текст. Ctrl/Cmd+Enter — додати; Esc — скасувати.',
      emptyText: 'Текст',
      uploadSuccess: 'LinkedIn прийняв нову обкладинку.',
      uploadHandedOff: 'Зображення вставлено. Заверши дію у штатному вікні LinkedIn.',
      uploadFailed: 'Автоматичне завантаження не вдалося. Згенероване зображення завантажено у файл.',
      noEditableCover: 'Відкрий власний профіль LinkedIn, щоб редагувати обкладинку.',
      editorAlreadyOpen: 'Редактор уже відкритий.',
      openEditor: 'Малювати на обкладинці',
      profileDetected: 'Знайдено обкладинку, яку можна редагувати.',
      profileNotDetected: 'На цій сторінці не знайдено обкладинку, яку можна редагувати.',
      options: 'Налаштування',
      autoConfirm: 'Автоматично натискати Apply/Save у LinkedIn',
      includeBackground: 'Додавати поточну обкладинку до результату',
      showSafeAreasOption: 'Типово показувати видиму область і перекриття LinkedIn',
      outputFormat: 'Бажаний формат результату',
      png: 'PNG (краще для графіки)',
      jpeg: 'JPEG (менший файл)',
      jpegQuality: 'Якість JPEG',
      defaultColor: 'Типовий колір',
      defaultWidth: 'Типова товщина лінії',
      defaultFontSize: 'Типовий розмір тексту',
      saved: 'Збережено',
      reset: 'Скинути налаштування',
      privacySummary: 'Без аналітики й віддаленого коду. Зображення лишається локальним, доки згенерований файл не передано штатному завантажувачу LinkedIn.',
      popupTitle: 'LinkedDraw',
      popupDescription: 'Малюй безпосередньо на обкладинці свого профілю LinkedIn.',
      openLinkedIn: 'Відкрити профіль LinkedIn',
      unavailable: 'Content script недоступний. Після встановлення розширення перезавантаж вкладку LinkedIn.',
      clearConfirm: 'Очистити всі намальовані об’єкти?',
      downloadingFallback: 'Завантажую резервний файл…'
    }
  };

  function language() {
    var value = String((globalThis.navigator && navigator.language) || 'en').toLowerCase();
    return value.startsWith('uk') ? 'uk' : 'en';
  }

  function t(key, replacements) {
    var lang = language();
    var value = strings[lang][key] || strings.en[key] || key;
    if (!replacements) return value;
    return value.replace(/\{(\w+)\}/g, function (_match, name) {
      return Object.prototype.hasOwnProperty.call(replacements, name) ? String(replacements[name]) : '';
    });
  }

  function localizeDocument(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-i18n]');
    nodes.forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    var titled = scope.querySelectorAll('[data-i18n-title]');
    titled.forEach(function (node) {
      node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
    });
  }

  LD.i18n = {
    language: language,
    t: t,
    localizeDocument: localizeDocument
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
