(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var ukrainian = params.get('lang') === 'uk';
  var dialog = document.getElementById('cover-dialog');
  var editButton = document.getElementById('edit-cover');
  var closeButton = document.getElementById('close-dialog');
  var cancelButton = document.getElementById('cancel-dialog');
  var saveButton = document.getElementById('save-cover');
  var fileInput = document.getElementById('cover-file');
  var preview = document.getElementById('preview');
  var cover = document.getElementById('cover-image');
  var eventLog = document.getElementById('event-log');
  var pendingUrl = null;

  if (ukrainian) {
    editButton.setAttribute('aria-label', 'Редагувати обкладинку');
    editButton.title = 'Редагувати обкладинку';
    document.getElementById('dialog-title').textContent = 'Змінити обкладинку';
    document.querySelector('.upload-button').childNodes[0].textContent = 'Змінити фото ';
    cancelButton.textContent = 'Скасувати';
    saveButton.textContent = 'Зберегти';
    closeButton.setAttribute('aria-label', 'Закрити');
  }

  function log(message) {
    eventLog.textContent = message;
    eventLog.classList.add('visible');
    clearTimeout(log.timer);
    log.timer = setTimeout(function () { eventLog.classList.remove('visible'); }, 2400);
    console.log('[Mock LinkedIn]', message);
  }

  function openDialog() {
    preview.src = cover.src;
    saveButton.disabled = true;
    fileInput.value = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    log('Native cover dialog opened');
  }

  function closeDialog() {
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    if (pendingUrl && preview.src !== cover.src) {
      URL.revokeObjectURL(pendingUrl);
      pendingUrl = null;
    }
  }

  editButton.addEventListener('click', openDialog);
  closeButton.addEventListener('click', closeDialog);
  cancelButton.addEventListener('click', closeDialog);

  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    pendingUrl = URL.createObjectURL(file);
    preview.src = pendingUrl;
    saveButton.disabled = false;
    log('Generated File received: ' + file.name + ' (' + file.size + ' bytes)');
  });

  saveButton.addEventListener('click', function () {
    if (!pendingUrl) return;
    cover.src = new URL('/assets/banner.svg?native-save=1', location.href).href;
    preview.src = cover.src;
    saveButton.disabled = true;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    log('Cover saved through native mock flow');
  });
})();
