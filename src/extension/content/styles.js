(function (LD) {
  'use strict';

  LD.styles = String.raw`
    :host {
      all: initial;
      color-scheme: dark;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.35;
      pointer-events: none;
      position: fixed;
      inset: 0;
      z-index: 2147483646;
    }

    *, *::before, *::after { box-sizing: border-box; }
    button, input, select, textarea { font: inherit; }

    .ld-floating-button {
      pointer-events: auto;
      position: fixed;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 38px;
      padding: 0 13px;
      border: 1px solid rgba(255,255,255,0.72);
      border-radius: 999px;
      background: rgba(17, 24, 39, 0.88);
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,0,0,0.26);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      font-weight: 700;
      letter-spacing: 0.01em;
      transition: transform .14s ease, background .14s ease, opacity .14s ease;
    }

    .ld-floating-button:hover { background: rgba(10, 102, 194, 0.96); transform: translateY(-1px); }
    .ld-floating-button:active { transform: translateY(0); }
    .ld-floating-button:focus-visible { outline: 3px solid rgba(88,166,255,.72); outline-offset: 2px; }
    .ld-floating-button[hidden] { display: none !important; }
    .ld-floating-icon { font-size: 17px; line-height: 1; }

    .ld-toast-stack {
      pointer-events: none;
      position: fixed;
      top: 18px;
      right: 18px;
      width: min(420px, calc(100vw - 36px));
      display: grid;
      gap: 10px;
    }

    .ld-toast {
      pointer-events: auto;
      padding: 13px 15px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 12px;
      color: #fff;
      background: rgba(18,25,36,.96);
      box-shadow: 0 12px 34px rgba(0,0,0,.3);
      animation: ld-toast-in .18s ease-out;
    }

    .ld-toast[data-kind="success"] { border-color: rgba(46,204,113,.55); }
    .ld-toast[data-kind="warning"] { border-color: rgba(241,196,15,.58); }
    .ld-toast[data-kind="error"] { border-color: rgba(231,76,60,.62); }

    @keyframes ld-toast-in {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .ld-modal {
      pointer-events: auto;
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 20px;
      background: rgba(5, 8, 14, .78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }

    .ld-modal.ld-suspended { visibility: hidden; pointer-events: none; }

    .ld-shell {
      width: min(1180px, 96vw);
      max-height: 94vh;
      overflow: auto;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 18px;
      background: #111722;
      color: #eef3f8;
      box-shadow: 0 30px 90px rgba(0,0,0,.52);
    }

    .ld-header, .ld-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 15px 18px;
    }

    .ld-header { border-bottom: 1px solid rgba(255,255,255,.09); }
    .ld-footer { border-top: 1px solid rgba(255,255,255,.09); }
    .ld-title { margin: 0; font-size: 17px; font-weight: 800; }
    .ld-subtitle { margin-top: 2px; color: #9fb0c5; font-size: 12px; }
    .ld-status { min-height: 20px; color: #9fb0c5; font-size: 12px; text-align: right; }
    .ld-status[data-kind="error"] { color: #ff8b80; }
    .ld-status[data-kind="success"] { color: #6fe0a1; }
    .ld-status[data-kind="warning"] { color: #ffd666; }

    .ld-toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      padding: 11px 14px;
      border-bottom: 1px solid rgba(255,255,255,.09);
      background: #151d2a;
    }

    .ld-separator { width: 1px; height: 30px; background: rgba(255,255,255,.12); margin: 0 2px; }

    .ld-tool, .ld-action, .ld-primary, .ld-secondary {
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 9px;
      background: #222d3d;
      color: #eaf0f7;
      cursor: pointer;
      transition: background .12s ease, border-color .12s ease, transform .12s ease;
    }

    .ld-tool, .ld-action {
      min-width: 38px;
      height: 36px;
      padding: 0 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .ld-tool:hover, .ld-action:hover, .ld-secondary:hover { background: #2b394d; }
    .ld-danger { color: #ffb4ad; border-color: rgba(255,107,96,.42); }
    .ld-danger:hover { color: #fff; background: #a12f2a; border-color: #db5a52; }
    .ld-tool[aria-pressed="true"], .ld-action[aria-pressed="true"] { background: #0a66c2; border-color: #4fa3ef; }
    .ld-tool:disabled, .ld-action:disabled, .ld-primary:disabled, .ld-secondary:disabled { opacity: .42; cursor: not-allowed; }
    .ld-tool:focus-visible, .ld-action:focus-visible, .ld-primary:focus-visible, .ld-secondary:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 3px solid rgba(88,166,255,.6); outline-offset: 2px; }
    .ld-icon { font-size: 17px; line-height: 1; }
    .ld-label { font-size: 12px; font-weight: 700; }

    .ld-control {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 36px;
      padding: 0 9px;
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 9px;
      background: #1c2635;
      color: #c8d5e5;
      font-size: 12px;
    }

    .ld-control input[type="color"] {
      width: 26px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 7px;
      background: transparent;
      cursor: pointer;
    }

    .ld-control input[type="range"] { width: 92px; accent-color: #0a66c2; }
    .ld-control output { min-width: 28px; color: #fff; text-align: right; font-variant-numeric: tabular-nums; }
    .ld-font-control[hidden] { display: none; }

    .ld-stage {
      padding: 18px;
      background:
        linear-gradient(45deg, #202a38 25%, transparent 25%) 0 0/20px 20px,
        linear-gradient(45deg, transparent 75%, #202a38 75%) 0 0/20px 20px,
        linear-gradient(45deg, transparent 75%, #202a38 75%) 10px -10px/20px 20px,
        linear-gradient(45deg, #202a38 25%, #18212e 25%) 10px -10px/20px 20px;
    }

    .ld-canvas-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 1;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.2);
      border-radius: 12px;
      background: #aebfc2;
      box-shadow: 0 14px 35px rgba(0,0,0,.28);
      touch-action: none;
      user-select: none;
    }

    .ld-canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      touch-action: none;
    }

    .ld-text-editor {
      position: absolute;
      min-width: 120px;
      min-height: 48px;
      max-width: 70%;
      resize: both;
      padding: 7px 9px;
      border: 2px solid #fff;
      border-radius: 7px;
      color: #fff;
      background: rgba(0,0,0,.55);
      box-shadow: 0 8px 28px rgba(0,0,0,.4);
      line-height: 1.18;
      z-index: 2;
    }

    .ld-text-editor[hidden] { display: none; }

    .ld-hint { color: #91a3b8; font-size: 12px; max-width: 690px; }
    .ld-footer-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

    .ld-primary, .ld-secondary {
      min-height: 40px;
      padding: 0 16px;
      font-weight: 800;
    }

    .ld-primary { background: #0a66c2; border-color: #2b83d3; }
    .ld-primary:hover { background: #085aab; }
    .ld-secondary { background: transparent; }

    @media (max-width: 760px) {
      .ld-modal { padding: 8px; }
      .ld-shell { width: 100%; max-height: 98vh; border-radius: 13px; }
      .ld-header, .ld-footer { align-items: flex-start; flex-direction: column; }
      .ld-footer-actions { width: 100%; }
      .ld-footer-actions button { flex: 1; }
      .ld-stage { padding: 9px; }
      .ld-label { display: none; }
      .ld-control input[type="range"] { width: 70px; }
      .ld-separator { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation: none !important; transition: none !important; }
    }
  `;
})(globalThis.LinkedDraw = globalThis.LinkedDraw || {});
