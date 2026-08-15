(function (LD) {
  'use strict';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function create(initialState, limit) {
    var states = [clone(initialState)];
    var index = 0;
    var maxStates = Math.max(2, Number(limit) || 100);

    function current() {
      return clone(states[index]);
    }

    function push(nextState) {
      var next = clone(nextState);
      states = states.slice(0, index + 1);
      states.push(next);
      if (states.length > maxStates) states.shift();
      index = states.length - 1;
      return current();
    }

    function undo() {
      if (index > 0) index -= 1;
      return current();
    }

    function redo() {
      if (index < states.length - 1) index += 1;
      return current();
    }

    function reset(nextState) {
      states = [clone(nextState)];
      index = 0;
      return current();
    }

    return {
      current: current,
      push: push,
      undo: undo,
      redo: redo,
      reset: reset,
      canUndo: function canUndo() { return index > 0; },
      canRedo: function canRedo() { return index < states.length - 1; },
      size: function size() { return states.length; }
    };
  }

  LD.history = {
    create: create
  };
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
