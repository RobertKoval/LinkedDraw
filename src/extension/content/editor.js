(function (LD) {
  'use strict';

  function originalEventTarget(event) {
    var path = event && typeof event.composedPath === 'function' ? event.composedPath() : null;
    return path && path.length ? path[0] : event && event.target;
  }

  function isEditableTarget(target) {
    return Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
  }

  function focusWrapTarget(focusables, activeElement, shiftKey) {
    if (!focusables.length) return null;
    var activeIndex = focusables.indexOf(activeElement);
    if (activeIndex < 0) return shiftKey ? focusables[focusables.length - 1] : focusables[0];
    if (shiftKey && activeIndex === 0) return focusables[focusables.length - 1];
    if (!shiftKey && activeIndex === focusables.length - 1) return focusables[0];
    return null;
  }

  function createScene(backgroundKind, objects) {
    return {
      background: { kind: backgroundKind === 'neutral' ? 'neutral' : 'current' },
      objects: Array.isArray(objects) ? objects.slice() : []
    };
  }

  function applyScene(editor, scene) {
    var normalized = createScene(scene && scene.background && scene.background.kind, scene && scene.objects);
    editor.backgroundKind = normalized.background.kind;
    editor.objects = normalized.objects;
  }

  function backgroundForScene(backgroundKind, backgroundImage) {
    return backgroundKind === 'neutral' ? null : backgroundImage;
  }

  function startOperation(editor, phase) {
    var operation = {
      id: (editor.operationSerial || 0) + 1,
      phase: phase,
      cancelled: false
    };
    editor.operationSerial = operation.id;
    if (editor.activeOperation) editor.activeOperation.cancelled = true;
    editor.activeOperation = operation;
    return operation;
  }

  function operationIsCurrent(editor, operation) {
    return Boolean(operation && !operation.cancelled && !editor.destroyed && editor.activeOperation === operation);
  }

  function cancelOperation(editor) {
    if (editor.activeOperation) editor.activeOperation.cancelled = true;
    editor.activeOperation = null;
  }

  function createElement(tagName, options) {
    var element = document.createElement(tagName);
    var config = options || {};
    if (config.className) element.className = config.className;
    if (config.text !== undefined) element.textContent = String(config.text);
    Object.keys(config.attributes || {}).forEach(function (name) {
      element.setAttribute(name, String(config.attributes[name]));
    });
    (config.children || []).forEach(function (child) { element.appendChild(child); });
    return element;
  }

  function iconLabel(icon, label) {
    return [
      createElement('span', { className: 'ld-icon', text: icon, attributes: { 'aria-hidden': 'true' } }),
      createElement('span', { className: 'ld-label', text: label })
    ];
  }

  function toolButton(tool, icon, label) {
    return createElement('button', {
      className: 'ld-tool',
      attributes: { type: 'button', 'data-tool': tool, 'aria-pressed': 'false', title: label },
      children: iconLabel(icon, label)
    });
  }

  function actionButton(action, icon, label, extraClass) {
    return createElement('button', {
      className: 'ld-action' + (extraClass ? ' ' + extraClass : ''),
      attributes: { type: 'button', 'data-action': action, title: label },
      children: iconLabel(icon, label)
    });
  }

  function separator() {
    return createElement('span', { className: 'ld-separator', attributes: { 'aria-hidden': 'true' } });
  }

  function rangeControl(className, title, control, value, min, max, step) {
    var input = createElement('input', {
      attributes: { 'data-control': control, type: 'range', min: min, max: max, step: step, value: value }
    });
    input.value = String(value);
    return createElement('label', {
      className: className,
      attributes: { title: title },
      children: [
        createElement('span', { text: title }),
        input,
        createElement('output', { text: value, attributes: { 'data-output': control } })
      ]
    });
  }

  function CoverEditor(options) {
    this.mount = options.mount;
    this.settings = options.settings;
    this.backgroundDataUrl = options.backgroundDataUrl || null;
    this.backgroundError = options.backgroundError || null;
    this.backgroundPhase = options.backgroundPhase || (this.backgroundDataUrl ? 'loading' : 'unavailable');
    this.onSave = options.onSave;
    this.onCancel = options.onCancel;
    this.onDelete = options.onDelete;
    this.returnFocus = options.returnFocus || null;

    this.tool = this.settings.defaultTool;
    this.color = this.settings.defaultColor;
    this.width = this.settings.defaultWidth;
    this.fontSize = this.settings.defaultFontSize;
    this.showSafeAreas = this.settings.showSafeAreas;
    this.backgroundKind = this.backgroundPhase === 'disabled' ? 'neutral' : 'current';
    this.objects = [];
    this.history = LD.history.create(createScene(this.backgroundKind, this.objects), 120);
    this.transient = null;
    this.activePointerId = null;
    this.backgroundImage = null;
    this.busy = false;
    this.destroyed = false;
    this.textPoint = null;
    this.textCancelRequested = false;
    this.renderPending = false;

    this.build();
    this.bind();
    this.updateControls();
    this.scheduleRender();
    this.loadBackground();
    var initialControl = this.modal.querySelector('[data-tool="' + this.tool + '"]');
    if (initialControl && typeof initialControl.focus === 'function') initialControl.focus();
  }

  CoverEditor.prototype.build = function build() {
    var t = LD.i18n.t;
    var modal = createElement('div', {
      className: 'ld-modal',
      attributes: { role: 'dialog', 'aria-modal': 'true', 'aria-label': t('editorTitle') }
    });

    var colorInput = createElement('input', {
      attributes: { 'data-control': 'color', type: 'color', value: this.color }
    });
    colorInput.value = this.color;
    var colorControl = createElement('label', {
      className: 'ld-control',
      attributes: { title: t('color') },
      children: [createElement('span', { text: t('color') }), colorInput]
    });
    var fontControl = rangeControl('ld-control ld-font-control', t('fontSize'), 'font-size', this.fontSize, 16, 120, 2);
    fontControl.hidden = true;

    var toolbar = createElement('div', {
      className: 'ld-toolbar',
      attributes: { role: 'toolbar', 'aria-label': t('editorTitle') },
      children: [
        toolButton('pen', '✎', t('pen')),
        toolButton('line', '╱', t('line')),
        toolButton('arrow', '➜', t('arrow')),
        toolButton('rect', '▭', t('rectangle')),
        toolButton('text', 'T', t('text')),
        toolButton('eraser', '⌫', t('eraser')),
        separator(),
        colorControl,
        rangeControl('ld-control', t('width'), 'width', this.width, 1, 48, 1),
        fontControl,
        separator(),
        actionButton('undo', '↶', t('undo')),
        actionButton('redo', '↷', t('redo')),
        actionButton('clear', '×', t('clear')),
        actionButton('delete-cover', '🗑', t('deleteCover'), 'ld-danger'),
        actionButton('safe-areas', '⌗', t('safeAreas'))
      ]
    });

    var canvas = createElement('canvas', {
      className: 'ld-canvas',
      attributes: { width: LD.constants.outputWidth, height: LD.constants.outputHeight }
    });
    var textEditor = createElement('textarea', {
      className: 'ld-text-editor',
      attributes: { 'aria-label': t('text'), placeholder: t('emptyText') }
    });
    textEditor.hidden = true;
    var canvasWrap = createElement('div', { className: 'ld-canvas-wrap', children: [canvas, textEditor] });
    var statusNode = createElement('div', { className: 'ld-status', attributes: { 'aria-live': 'polite' } });
    var cancelButton = createElement('button', {
      className: 'ld-secondary', text: t('cancel'), attributes: { type: 'button', 'data-action': 'cancel' }
    });
    var saveButton = createElement('button', {
      className: 'ld-primary', text: t('save'), attributes: { type: 'button', 'data-action': 'save' }
    });

    modal.appendChild(createElement('div', {
      className: 'ld-shell',
      children: [
        createElement('header', {
          className: 'ld-header',
          children: [
            createElement('div', { children: [
              createElement('h2', { className: 'ld-title', text: t('editorTitle') }),
              createElement('div', { className: 'ld-subtitle', text: t('editorSubtitle') })
            ] }),
            statusNode
          ]
        }),
        toolbar,
        createElement('main', { className: 'ld-stage', children: [canvasWrap] }),
        createElement('footer', {
          className: 'ld-footer',
          children: [
            createElement('div', { className: 'ld-hint', text: t('hint') }),
            createElement('div', { className: 'ld-footer-actions', children: [cancelButton, saveButton] })
          ]
        })
      ]
    }));

    this.mount.appendChild(modal);
    this.modal = modal;
    this.canvas = canvas;
    this.canvasWrap = canvasWrap;
    this.statusNode = statusNode;
    this.textEditor = textEditor;
    this.saveButton = saveButton;
    this.cancelButton = cancelButton;
  };

  CoverEditor.prototype.bind = function bind() {
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundPointerDown = this.handlePointerDown.bind(this);
    this.boundPointerMove = this.handlePointerMove.bind(this);
    this.boundPointerUp = this.handlePointerUp.bind(this);
    this.boundPointerCancel = this.handlePointerCancel.bind(this);
    this.boundTextKeyDown = this.handleTextKeyDown.bind(this);
    this.boundTextBlur = this.handleTextBlur.bind(this);

    document.addEventListener('keydown', this.boundKeyDown, true);
    this.canvas.addEventListener('pointerdown', this.boundPointerDown);
    this.canvas.addEventListener('pointermove', this.boundPointerMove);
    this.canvas.addEventListener('pointerup', this.boundPointerUp);
    this.canvas.addEventListener('pointercancel', this.boundPointerCancel);
    this.textEditor.addEventListener('keydown', this.boundTextKeyDown);
    this.textEditor.addEventListener('blur', this.boundTextBlur);

    var self = this;
    this.modal.querySelectorAll('[data-tool]').forEach(function (button) {
      button.addEventListener('click', function () { self.setTool(button.getAttribute('data-tool')); });
    });

    this.modal.querySelectorAll('[data-action]').forEach(function (button) {
      button.addEventListener('click', function () { self.handleAction(button.getAttribute('data-action')); });
    });

    this.modal.querySelector('[data-control="color"]').addEventListener('input', function (event) {
      self.color = event.target.value;
    });
    this.modal.querySelector('[data-control="width"]').addEventListener('input', function (event) {
      self.width = Number(event.target.value);
      self.modal.querySelector('[data-output="width"]').value = String(self.width);
      self.modal.querySelector('[data-output="width"]').textContent = String(self.width);
    });
    this.modal.querySelector('[data-control="font-size"]').addEventListener('input', function (event) {
      self.fontSize = Number(event.target.value);
      self.modal.querySelector('[data-output="font-size"]').value = String(self.fontSize);
      self.modal.querySelector('[data-output="font-size"]').textContent = String(self.fontSize);
    });
  };

  CoverEditor.prototype.loadBackground = async function loadBackground() {
    if (this.backgroundPhase === 'disabled' || this.backgroundKind === 'neutral') {
      this.updateControls();
      this.scheduleRender();
      return;
    }
    if (!this.backgroundDataUrl) {
      this.backgroundPhase = 'unavailable';
      this.backgroundError = this.backgroundError || 'current-background-unavailable';
      this.setStatus(LD.i18n.t('backgroundUnavailable'), 'warning');
      this.updateControls();
      this.scheduleRender();
      return;
    }

    this.backgroundPhase = 'loading';
    this.updateControls();
    this.setStatus(LD.i18n.t('loadingBackground'));
    try {
      var image = await LD.renderer.loadImage(this.backgroundDataUrl);
      if (this.destroyed) return;
      this.backgroundImage = image;
      this.backgroundPhase = 'ready';
      this.backgroundError = null;
      this.setStatus('');
    } catch (error) {
      if (this.destroyed) return;
      this.backgroundImage = null;
      this.backgroundPhase = 'unavailable';
      this.backgroundError = error && error.message ? error.message : String(error);
      this.setStatus(LD.i18n.t('backgroundUnavailable'), 'warning');
      LD.log('Background decode failed', error);
    }
    this.updateControls();
    this.scheduleRender();
  };

  CoverEditor.prototype.setStatus = function setStatus(message, kind) {
    if (!this.statusNode) return;
    this.statusNode.textContent = message || '';
    if (kind) this.statusNode.setAttribute('data-kind', kind);
    else this.statusNode.removeAttribute('data-kind');
  };

  CoverEditor.prototype.setTool = function setTool(tool) {
    if (this.busy) return;
    this.commitText(false);
    this.tool = tool;
    this.updateControls();
  };

  CoverEditor.prototype.updateControls = function updateControls() {
    var self = this;
    this.modal.querySelectorAll('[data-tool]').forEach(function (button) {
      button.setAttribute('aria-pressed', button.getAttribute('data-tool') === self.tool ? 'true' : 'false');
    });
    this.modal.querySelector('[data-action="undo"]').disabled = !this.history.canUndo() || this.busy;
    this.modal.querySelector('[data-action="redo"]').disabled = !this.history.canRedo() || this.busy;
    this.modal.querySelector('[data-action="clear"]').disabled = (this.backgroundKind === 'neutral' && this.objects.length === 0) || this.busy;
    this.modal.querySelector('[data-action="safe-areas"]').setAttribute('aria-pressed', this.showSafeAreas ? 'true' : 'false');
    this.modal.querySelector('.ld-font-control').hidden = this.tool !== 'text';
    this.saveButton.disabled = this.busy || (this.backgroundKind === 'current' && this.backgroundPhase === 'loading');
    if (this.cancelButton) this.cancelButton.disabled = Boolean(this.busy && this.activeOperation && this.activeOperation.phase === 'native');
  };

  CoverEditor.prototype.scheduleRender = function scheduleRender() {
    if (this.renderPending || this.destroyed) return;
    this.renderPending = true;
    var self = this;
    requestAnimationFrame(function () {
      self.renderPending = false;
      if (!self.destroyed) LD.renderer.render(self.canvas, backgroundForScene(self.backgroundKind, self.backgroundImage), self.objects, self.transient, self.showSafeAreas);
    });
  };

  CoverEditor.prototype.handlePointerDown = function handlePointerDown(event) {
    if (this.busy || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    var point = LD.geometry.pointFromPointer(event, this.canvas);

    if (this.tool === 'text') {
      this.openTextEditor(point);
      return;
    }

    this.activePointerId = event.pointerId;
    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* optional */ }

    if (this.tool === 'pen' || this.tool === 'eraser') {
      this.transient = {
        type: this.tool === 'eraser' ? 'erase' : 'pen',
        points: [point],
        color: this.color,
        width: this.tool === 'eraser' ? Math.max(8, this.width * 2.2) : this.width
      };
    } else {
      this.transient = {
        type: this.tool,
        from: point,
        to: point,
        color: this.color,
        width: this.width
      };
    }
    this.scheduleRender();
  };

  CoverEditor.prototype.handlePointerMove = function handlePointerMove(event) {
    if (this.busy || this.activePointerId !== event.pointerId || !this.transient) return;
    event.preventDefault();
    event.stopPropagation();
    var point = LD.geometry.pointFromPointer(event, this.canvas);
    if (this.transient.type === 'pen' || this.transient.type === 'erase') {
      var points = this.transient.points;
      if (LD.geometry.distance(points[points.length - 1], point) >= 1.5) points.push(point);
    } else {
      this.transient.to = point;
    }
    this.scheduleRender();
  };

  CoverEditor.prototype.handlePointerUp = function handlePointerUp(event) {
    if (this.activePointerId !== event.pointerId || !this.transient) return;
    event.preventDefault();
    event.stopPropagation();
    try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* optional */ }
    this.activePointerId = null;

    var object = this.transient;
    this.transient = null;
    var valid = true;
    if (object.type === 'line' || object.type === 'arrow' || object.type === 'rect') {
      valid = LD.geometry.distance(object.from, object.to) >= 2;
    }
    if (valid) this.commitObject(object);
    else this.scheduleRender();
  };

  CoverEditor.prototype.handlePointerCancel = function handlePointerCancel(event) {
    if (this.activePointerId !== event.pointerId || !this.transient) return;
    event.preventDefault();
    event.stopPropagation();
    try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* optional */ }
    this.activePointerId = null;
    this.transient = null;
    this.scheduleRender();
  };

  CoverEditor.prototype.commitObject = function commitObject(object) {
    this.objects = this.objects.concat([object]);
    this.history.push(createScene(this.backgroundKind, this.objects));
    this.updateControls();
    this.scheduleRender();
  };

  CoverEditor.prototype.openTextEditor = function openTextEditor(point) {
    this.commitText(false);
    this.textPoint = point;
    this.textCancelRequested = false;
    var rect = this.canvas.getBoundingClientRect();
    var wrapRect = this.canvasWrap.getBoundingClientRect();
    var left = (point.x / this.canvas.width) * rect.width + (rect.left - wrapRect.left);
    var top = (point.y / this.canvas.height) * rect.height + (rect.top - wrapRect.top);
    var visibleFontSize = Math.max(12, this.fontSize * (rect.width / this.canvas.width));

    this.textEditor.hidden = false;
    this.textEditor.value = '';
    this.textEditor.style.left = Math.min(left, wrapRect.width - 140) + 'px';
    this.textEditor.style.top = Math.min(top, wrapRect.height - 56) + 'px';
    this.textEditor.style.color = this.color;
    this.textEditor.style.fontSize = visibleFontSize + 'px';
    this.textEditor.focus();
    this.setStatus(LD.i18n.t('textHint'));
  };

  CoverEditor.prototype.handleTextKeyDown = function handleTextKeyDown(event) {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      this.textCancelRequested = true;
      this.commitText(true);
      return;
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.commitText(false);
    }
  };

  CoverEditor.prototype.handleTextBlur = function handleTextBlur() {
    var self = this;
    setTimeout(function () {
      if (!self.destroyed && !self.textEditor.hidden) self.commitText(self.textCancelRequested);
    }, 0);
  };

  CoverEditor.prototype.commitText = function commitText(cancel) {
    if (!this.textEditor || this.textEditor.hidden) return;
    var text = this.textEditor.value.trim();
    var point = this.textPoint;
    this.textEditor.hidden = true;
    this.textEditor.value = '';
    this.textPoint = null;
    this.textCancelRequested = false;
    this.setStatus('');
    if (!cancel && text && point) {
      this.commitObject({
        type: 'text',
        at: point,
        text: text,
        color: this.color,
        fontSize: this.fontSize
      });
    }
  };

  CoverEditor.prototype.handleAction = function handleAction(action) {
    if (this.busy && action !== 'cancel') return;
    if (action === 'undo') {
      this.commitText(false);
      applyScene(this, this.history.undo());
    } else if (action === 'redo') {
      this.commitText(false);
      applyScene(this, this.history.redo());
    } else if (action === 'clear') {
      this.commitText(false);
      applyScene(this, createScene('neutral', []));
      this.history.push(createScene(this.backgroundKind, this.objects));
    } else if (action === 'safe-areas') {
      this.showSafeAreas = !this.showSafeAreas;
    } else if (action === 'delete-cover') {
      this.deleteCover();
      return;
    } else if (action === 'cancel') {
      this.cancel();
      return;
    } else if (action === 'save') {
      this.save();
      return;
    }
    this.updateControls();
    this.scheduleRender();
  };

  CoverEditor.prototype.handleKeyDown = function handleKeyDown(event) {
    if (this.destroyed || this.modal.classList.contains('ld-suspended')) return;
    var target = originalEventTarget(event);
    if (event.key === 'Tab') {
      var focusables = Array.from(this.modal.querySelectorAll('button, input, textarea, select, [tabindex]')).filter(function (control) {
        return !control.disabled && !control.hidden && !control.closest('[hidden]') && control.getAttribute('tabindex') !== '-1';
      });
      var wrapTarget = focusWrapTarget(focusables, target, event.shiftKey);
      if (wrapTarget) {
        event.preventDefault();
        event.stopPropagation();
        wrapTarget.focus();
      }
      return;
    }
    if (target === this.textEditor || isEditableTarget(target)) return;

    var modifier = event.ctrlKey || event.metaKey;
    if (modifier && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.stopPropagation();
      this.handleAction(event.shiftKey ? 'redo' : 'undo');
      return;
    }
    if (modifier && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      event.stopPropagation();
      this.handleAction('redo');
      return;
    }
    if (modifier && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.save();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return;
    }

    var toolByKey = { p: 'pen', l: 'line', a: 'arrow', r: 'rect', t: 'text', e: 'eraser' };
    var tool = toolByKey[event.key.toLowerCase()];
    if (tool) {
      event.preventDefault();
      event.stopPropagation();
      this.setTool(tool);
    }
  };

  CoverEditor.prototype.setBusy = function setBusy(value) {
    this.busy = value;
    this.modal.querySelectorAll('button, input, select').forEach(function (control) {
      if (control.getAttribute('data-action') === 'cancel') return;
      control.disabled = value;
    });
    this.updateControls();
  };

  CoverEditor.prototype.save = async function save() {
    if (this.busy || this.destroyed) return;
    this.commitText(false);

    if (this.backgroundKind === 'current' && this.backgroundPhase === 'loading') {
      this.setStatus(LD.i18n.t('loadingBackground'), 'warning');
      return;
    }

    if (this.backgroundKind === 'current' && this.backgroundPhase === 'unavailable' && this.settings.includeCurrentBackground && !this.backgroundOverrideConfirmed) {
      var confirmed = typeof globalThis.confirm === 'function' && globalThis.confirm(LD.i18n.t('confirmWithoutBackground'));
      if (!confirmed) {
        this.setStatus(LD.i18n.t('backgroundUnavailable'), 'warning');
        return;
      }
      this.backgroundOverrideConfirmed = true;
    }

    var operation = startOperation(this, 'encoding');
    this.setBusy(true);
    this.setStatus(LD.i18n.t('saving'));

    try {
      var encoded = await LD.renderer.encodeWithinLimit(backgroundForScene(this.backgroundKind, this.backgroundImage), this.objects, this.settings);
      if (!operationIsCurrent(this, operation)) return;
      var stamp = new Date().toISOString().replace(/[:.]/g, '-');
      var file = new File([encoded.blob], 'linkedin-cover-' + stamp + '.' + encoded.extension, { type: encoded.mimeType });
      operation.phase = 'native';
      this.updateControls();
      this.modal.classList.add('ld-suspended');
      var result = await this.onSave(file);
      if (!operationIsCurrent(this, operation)) return;

      if (result && (result.status === 'success' || result.status === 'handed-off')) {
        this.destroy();
        return;
      }

      this.modal.classList.remove('ld-suspended');
      this.setBusy(false);
      this.setStatus(LD.i18n.t('uploadFailed'), 'error');
    } catch (error) {
      if (!operationIsCurrent(this, operation)) return;
      LD.log('Upload callback failed', error);
      this.modal.classList.remove('ld-suspended');
      this.setBusy(false);
      this.setStatus(LD.i18n.t('uploadFailed'), 'error');
    }
  };

  CoverEditor.prototype.deleteCover = async function deleteCover() {
    if (this.busy || this.destroyed || typeof this.onDelete !== 'function') return;
    var confirmed = typeof globalThis.confirm === 'function' && globalThis.confirm(LD.i18n.t('deleteCoverConfirm'));
    if (!confirmed) return;

    var operation = startOperation(this, 'native');
    this.setBusy(true);
    this.setStatus(LD.i18n.t('deletingCover'));
    this.modal.classList.add('ld-suspended');
    try {
      var result = await this.onDelete();
      if (!operationIsCurrent(this, operation)) return;
      if (result && (result.status === 'success' || result.status === 'handed-off')) {
        this.destroy();
        return;
      }
      this.modal.classList.remove('ld-suspended');
      this.setBusy(false);
      this.setStatus(LD.i18n.t('deleteCoverFailed'), 'error');
    } catch (error) {
      if (!operationIsCurrent(this, operation)) return;
      LD.log('Delete cover callback failed', error);
      this.modal.classList.remove('ld-suspended');
      this.setBusy(false);
      this.setStatus(LD.i18n.t('deleteCoverFailed'), 'error');
    }
  };

  CoverEditor.prototype.cancel = function cancel() {
    if (this.destroyed) return;
    if (this.activeOperation && this.activeOperation.phase === 'native') return;
    cancelOperation(this);
    if (typeof this.onCancel === 'function') this.onCancel();
    this.destroy(true);
  };

  CoverEditor.prototype.destroy = function destroy(restoreFocus) {
    if (this.destroyed) return;
    cancelOperation(this);
    this.destroyed = true;
    document.removeEventListener('keydown', this.boundKeyDown, true);
    this.canvas.removeEventListener('pointerdown', this.boundPointerDown);
    this.canvas.removeEventListener('pointermove', this.boundPointerMove);
    this.canvas.removeEventListener('pointerup', this.boundPointerUp);
    this.canvas.removeEventListener('pointercancel', this.boundPointerCancel);
    this.textEditor.removeEventListener('keydown', this.boundTextKeyDown);
    this.textEditor.removeEventListener('blur', this.boundTextBlur);
    this.modal.remove();
    if (restoreFocus && this.returnFocus && this.returnFocus.isConnected !== false && typeof this.returnFocus.focus === 'function') {
      this.returnFocus.focus();
    }
  };

  LD.CoverEditor = CoverEditor;
  LD.editorInternals = Object.freeze({
    originalEventTarget: originalEventTarget,
    isEditableTarget: isEditableTarget,
    focusWrapTarget: focusWrapTarget,
    createScene: createScene,
    applyScene: applyScene,
    backgroundForScene: backgroundForScene
  });
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
