(function (LD) {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function distance(a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function pointFromPointer(event, canvas) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * (canvas.width / Math.max(1, rect.width)), 0, canvas.width),
      y: clamp((event.clientY - rect.top) * (canvas.height / Math.max(1, rect.height)), 0, canvas.height)
    };
  }

  function rectFromPoints(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y)
    };
  }

  function coverPlacement(sourceWidth, sourceHeight, destinationWidth, destinationHeight) {
    if (!sourceWidth || !sourceHeight || !destinationWidth || !destinationHeight) {
      return { x: 0, y: 0, width: destinationWidth || 0, height: destinationHeight || 0 };
    }
    var scale = Math.max(destinationWidth / sourceWidth, destinationHeight / sourceHeight);
    var width = sourceWidth * scale;
    var height = sourceHeight * scale;
    return {
      x: (destinationWidth - width) / 2,
      y: (destinationHeight - height) / 2,
      width: width,
      height: height
    };
  }

  function arrowHead(from, to, length) {
    var angle = Math.atan2(to.y - from.y, to.x - from.x);
    var spread = Math.PI / 7;
    return [
      {
        x: to.x - length * Math.cos(angle - spread),
        y: to.y - length * Math.sin(angle - spread)
      },
      {
        x: to.x - length * Math.cos(angle + spread),
        y: to.y - length * Math.sin(angle + spread)
      }
    ];
  }

  function normalizeRect(rect) {
    return {
      left: Number(rect.left) || 0,
      top: Number(rect.top) || 0,
      right: Number(rect.right) || ((Number(rect.left) || 0) + (Number(rect.width) || 0)),
      bottom: Number(rect.bottom) || ((Number(rect.top) || 0) + (Number(rect.height) || 0)),
      width: Number(rect.width) || Math.max(0, (Number(rect.right) || 0) - (Number(rect.left) || 0)),
      height: Number(rect.height) || Math.max(0, (Number(rect.bottom) || 0) - (Number(rect.top) || 0))
    };
  }

  LD.geometry = {
    clamp: clamp,
    distance: distance,
    pointFromPointer: pointFromPointer,
    rectFromPoints: rectFromPoints,
    coverPlacement: coverPlacement,
    arrowHead: arrowHead,
    normalizeRect: normalizeRect
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
