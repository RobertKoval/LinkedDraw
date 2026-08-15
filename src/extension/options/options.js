(function (LD) {
  'use strict';

  var form = document.getElementById('settings-form');
  var resetButton = document.getElementById('reset');
  var saveStatus = document.getElementById('save-status');
  var saveTimer = null;

  LD.i18n.localizeDocument(document);

  function field(name) {
    return form.elements.namedItem(name);
  }

  function writeForm(settings) {
    field('autoConfirmUpload').checked = settings.autoConfirmUpload;
    field('includeCurrentBackground').checked = settings.includeCurrentBackground;
    field('showSafeAreas').checked = settings.showSafeAreas;
    field('outputFormat').value = settings.outputFormat;
    field('jpegQuality').value = String(settings.jpegQuality);
    field('defaultColor').value = settings.defaultColor;
    field('defaultWidth').value = String(settings.defaultWidth);
    field('defaultFontSize').value = String(settings.defaultFontSize);
    updateOutputs();
  }

  function readForm() {
    return {
      autoConfirmUpload: field('autoConfirmUpload').checked,
      includeCurrentBackground: field('includeCurrentBackground').checked,
      showSafeAreas: field('showSafeAreas').checked,
      outputFormat: field('outputFormat').value,
      jpegQuality: Number(field('jpegQuality').value),
      defaultColor: field('defaultColor').value,
      defaultWidth: Number(field('defaultWidth').value),
      defaultFontSize: Number(field('defaultFontSize').value)
    };
  }

  function updateOutputs() {
    document.querySelector('[data-output="jpegQuality"]').textContent = Math.round(Number(field('jpegQuality').value) * 100) + '%';
    document.querySelector('[data-output="defaultWidth"]').textContent = field('defaultWidth').value + ' px';
    document.querySelector('[data-output="defaultFontSize"]').textContent = field('defaultFontSize').value + ' px';
  }

  async function save() {
    updateOutputs();
    await LD.settings.set(readForm());
    saveStatus.textContent = LD.i18n.t('saved');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { saveStatus.textContent = ''; }, 1600);
  }

  form.addEventListener('input', save);
  resetButton.addEventListener('click', async function () {
    var settings = await LD.settings.set(LD.settings.defaults);
    writeForm(settings);
    saveStatus.textContent = LD.i18n.t('saved');
  });

  LD.settings.get().then(writeForm);
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
