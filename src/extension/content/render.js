(function (LD) {
  'use strict';

  var drawingLayers = new WeakMap();

  function createCanvas(width, height) {
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function loadImage(source) {
    if (!source) return Promise.resolve(null);
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { reject(new Error('Unable to decode cover image')); };
      image.src = source;
    });
  }

  function drawNeutralBackground(ctx, width, height) {
    var gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#aebfc2');
    gradient.addColorStop(0.58, '#c1d2d5');
    gradient.addColorStop(0.72, '#d5e1e3');
    gradient.addColorStop(1, '#b9cdcf');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawBackground(ctx, image, width, height) {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    if (!image) {
      drawNeutralBackground(ctx, width, height);
      ctx.restore();
      return;
    }
    var placement = LD.geometry.coverPlacement(image.naturalWidth || image.width, image.naturalHeight || image.height, width, height);
    ctx.drawImage(image, placement.x, placement.y, placement.width, placement.height);
    ctx.restore();
  }

  function beginStroke(ctx, object) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(1, Number(object.width) || 1);
    ctx.strokeStyle = object.color || '#ff3b30';
    ctx.fillStyle = object.color || '#ff3b30';
  }

  function drawPolyline(ctx, points) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y);
    }
    if (points.length === 1) {
      ctx.lineTo(points[0].x + 0.01, points[0].y + 0.01);
    }
    ctx.stroke();
  }

  function drawObject(ctx, object) {
    if (!object || !object.type) return;
    ctx.save();
    beginStroke(ctx, object);

    if (object.type === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      drawPolyline(ctx, object.points);
      ctx.restore();
      return;
    }

    if (object.type === 'pen') {
      drawPolyline(ctx, object.points);
      ctx.restore();
      return;
    }

    if (object.type === 'line' || object.type === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(object.from.x, object.from.y);
      ctx.lineTo(object.to.x, object.to.y);
      ctx.stroke();
      if (object.type === 'arrow') {
        var head = LD.geometry.arrowHead(object.from, object.to, Math.max(14, (Number(object.width) || 1) * 3.2));
        ctx.beginPath();
        ctx.moveTo(object.to.x, object.to.y);
        ctx.lineTo(head[0].x, head[0].y);
        ctx.moveTo(object.to.x, object.to.y);
        ctx.lineTo(head[1].x, head[1].y);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (object.type === 'rect') {
      var rect = LD.geometry.rectFromPoints(object.from, object.to);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
      return;
    }

    if (object.type === 'text') {
      var fontSize = Math.max(12, Number(object.fontSize) || 42);
      var lineHeight = Math.round(fontSize * 1.18);
      var lines = String(object.text || '').split(/\r?\n/);
      ctx.font = '600 ' + fontSize + 'px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillStyle = object.color || '#ff3b30';
      lines.forEach(function (line, index) {
        ctx.fillText(line, object.at.x, object.at.y + index * lineHeight);
      });
      ctx.restore();
      return;
    }

    ctx.restore();
  }

  function renderObjects(ctx, objects) {
    (objects || []).forEach(function (object) {
      drawObject(ctx, object);
    });
  }

  function safeAreaLayout(width, height) {
    var inset = Math.max(4, Math.round(height * 0.015));
    var controlsX = Math.round(width * 0.82);
    return {
      visible: {
        x: inset,
        y: inset,
        width: Math.max(1, width - inset * 2),
        height: Math.max(1, height - inset * 2)
      },
      avatar: {
        centerX: Math.round(width * 0.132),
        centerY: Math.round(height * 0.92),
        radius: Math.round(height * 0.39)
      },
      controls: {
        x: controlsX,
        y: Math.round(height * 0.04),
        width: Math.max(1, width - controlsX - inset),
        height: Math.round(height * 0.30)
      }
    };
  }

  function guideLabel(key, fallback) {
    return LD.i18n && typeof LD.i18n.t === 'function' ? LD.i18n.t(key) : fallback;
  }

  function safeAreaLabelLayout(layout) {
    return {
      visible: { x: layout.visible.x + 10, y: layout.visible.y + 24 },
      avatar: {
        x: Math.max(layout.visible.x + 10, layout.avatar.centerX - layout.avatar.radius + 10),
        y: Math.max(28, layout.avatar.centerY - layout.avatar.radius + 24)
      },
      controls: { x: layout.controls.x + 10, y: layout.controls.y + 24 }
    };
  }

  function drawSafeAreas(ctx, width, height) {
    var layout = safeAreaLayout(width, height);
    var labels = safeAreaLabelLayout(layout);
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';

    ctx.strokeRect(layout.visible.x, layout.visible.y, layout.visible.width, layout.visible.height);

    ctx.beginPath();
    ctx.arc(layout.avatar.centerX, layout.avatar.centerY, layout.avatar.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillRect(layout.controls.x, layout.controls.y, layout.controls.width, layout.controls.height);
    ctx.strokeRect(layout.controls.x, layout.controls.y, layout.controls.width, layout.controls.height);

    ctx.setLineDash([]);
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fillText(guideLabel('visibleCoverArea', 'visible cover'), labels.visible.x, labels.visible.y);
    ctx.fillText(guideLabel('profilePhotoArea', 'profile photo'), labels.avatar.x, labels.avatar.y);
    ctx.fillText(guideLabel('coverControlsArea', 'cover controls'), labels.controls.x, labels.controls.y);
    ctx.restore();
  }

  function render(canvas, backgroundImage, objects, transientObject, showSafeAreas) {
    var width = canvas.width;
    var height = canvas.height;
    var ctx = canvas.getContext('2d');
    drawBackground(ctx, backgroundImage, width, height);

    var drawingCanvas = drawingLayers.get(canvas);
    if (!drawingCanvas) {
      drawingCanvas = createCanvas(width, height);
      drawingLayers.set(canvas, drawingCanvas);
    }
    if (drawingCanvas.width !== width) drawingCanvas.width = width;
    if (drawingCanvas.height !== height) drawingCanvas.height = height;
    var drawingContext = drawingCanvas.getContext('2d');
    drawingContext.clearRect(0, 0, width, height);
    renderObjects(drawingContext, objects);
    if (transientObject) drawObject(drawingContext, transientObject);
    ctx.drawImage(drawingCanvas, 0, 0);

    if (showSafeAreas) drawSafeAreas(ctx, width, height);
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('Browser could not encode the cover image'));
      }, type, quality);
    });
  }

  async function encodeWithinLimit(backgroundImage, objects, settings) {
    var canvas = createCanvas(LD.constants.outputWidth, LD.constants.outputHeight);
    render(canvas, backgroundImage, objects, null, false);

    var preferredType = settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    var preferredQuality = settings.jpegQuality || 0.92;
    var blob = await canvasToBlob(canvas, preferredType, preferredQuality);
    var extension = preferredType === 'image/jpeg' ? 'jpg' : 'png';

    if (blob.size <= LD.constants.conservativeUploadBytes) {
      return { blob: blob, extension: extension, mimeType: preferredType };
    }

    var qualities = [0.92, 0.86, 0.78, 0.68, 0.58];
    for (var index = 0; index < qualities.length; index += 1) {
      blob = await canvasToBlob(canvas, 'image/jpeg', qualities[index]);
      if (blob.size <= LD.constants.conservativeUploadBytes) {
        return { blob: blob, extension: 'jpg', mimeType: 'image/jpeg' };
      }
    }

    throw new Error('Encoded image remains larger than LinkedIn\'s 8 MB limit');
  }

  LD.renderer = {
    createCanvas: createCanvas,
    loadImage: loadImage,
    drawBackground: drawBackground,
    drawObject: drawObject,
    safeAreaLayout: safeAreaLayout,
    safeAreaLabelLayout: safeAreaLabelLayout,
    render: render,
    encodeWithinLimit: encodeWithinLimit
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
