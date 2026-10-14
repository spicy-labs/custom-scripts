/* =====================================================================
   CHILI GraFx Studio — apply an SVG to the selected frame(s)
   Paste into the DevTools console on an open Studio document.
   - Select one or more shape frames (or image frames, for the clip path)
   - Pick an SVG in the popup and click Apply
   - Save the document in Studio afterwards
   Uses sdk.document.getCurrentState() -> edit -> sdk.document.load(),
   same as the Custom Shape Editor extension (this resets undo history).
===================================================================== */
(async () => {
  const PathEngine = (function () {
      const CMD_ARG_COUNT = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  
      function isCommandChar(ch) { return /^[MmLlHhVvCcSsQqTtAaZz]$/.test(ch); }
  
      function tokenize(d) {
          const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[^MmLlHhVvCcSsQqTtAaZz]+/g) || [];
          const segments = [];
          let i = 0;
          while (i < tokens.length) {
              const t = tokens[i];
              if (!isCommandChar(t)) { i++; continue; }
              const cmd = t;
              i++;
              let paramStr = '';
              if (i < tokens.length && !isCommandChar(tokens[i])) { paramStr = tokens[i]; i++; }
              const upper = cmd.toUpperCase();
              const n = CMD_ARG_COUNT[upper];
              if (n === 0) { segments.push({ cmd, args: [] }); continue; }
              const nums = upper === 'A' ? parseArcParams(paramStr) : parseNumbers(paramStr);
              for (let k = 0; k + n <= nums.length; k += n) {
                  const effectiveCmd = k === 0 ? cmd : (upper === 'M' ? (cmd === 'M' ? 'L' : 'l') : cmd);
                  segments.push({ cmd: effectiveCmd, args: nums.slice(k, k + n) });
              }
          }
          return segments;
      }
  
      function parseNumbers(str) {
          const re = /[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?/g;
          return (str.match(re) || []).map(Number);
      }
  
      function parseArcParams(str) {
          const nums = [];
          const numRe = /^[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?/;
          let i = 0;
          function skipSep() { while (i < str.length && /[\s,]/.test(str[i])) i++; }
          while (i < str.length) {
              skipSep();
              if (i >= str.length) break;
              const posInGroup = nums.length % 7;
              if (posInGroup === 3 || posInGroup === 4) {
                  const c = str[i];
                  if (c === '0' || c === '1') { nums.push(Number(c)); i++; continue; }
              }
              const m = str.slice(i).match(numRe);
              if (!m) break;
              nums.push(Number(m[0]));
              i += m[0].length;
          }
          return nums;
      }
  
      function absolutize(segments) {
          let cx = 0, cy = 0, startX = 0, startY = 0;
          let prevType = null, prevCtrlX = 0, prevCtrlY = 0;
          const out = [];
          for (const seg of segments) {
              const upper = seg.cmd.toUpperCase();
              const rel = seg.cmd !== upper;
              const a = seg.args;
              switch (upper) {
                  case 'M': { let [x, y] = a; if (rel) { x += cx; y += cy; } cx = x; cy = y; startX = x; startY = y; out.push({ type: 'M', x, y }); prevType = 'M'; break; }
                  case 'L': { let [x, y] = a; if (rel) { x += cx; y += cy; } cx = x; cy = y; out.push({ type: 'L', x, y }); prevType = 'L'; break; }
                  case 'H': { let [x] = a; if (rel) x += cx; cx = x; out.push({ type: 'L', x, y: cy }); prevType = 'L'; break; }
                  case 'V': { let [y] = a; if (rel) y += cy; cy = y; out.push({ type: 'L', x: cx, y }); prevType = 'L'; break; }
                  case 'C': { let [x1, y1, x2, y2, x, y] = a; if (rel) { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; } out.push({ type: 'C', x1, y1, x2, y2, x, y }); prevCtrlX = x2; prevCtrlY = y2; cx = x; cy = y; prevType = 'C'; break; }
                  case 'S': { let [x2, y2, x, y] = a; if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; } let x1, y1; if (prevType === 'C' || prevType === 'S') { x1 = 2 * cx - prevCtrlX; y1 = 2 * cy - prevCtrlY; } else { x1 = cx; y1 = cy; } out.push({ type: 'C', x1, y1, x2, y2, x, y }); prevCtrlX = x2; prevCtrlY = y2; cx = x; cy = y; prevType = 'S'; break; }
                  case 'Q': { let [x1, y1, x, y] = a; if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; } out.push({ type: 'Q', x1, y1, x, y }); prevCtrlX = x1; prevCtrlY = y1; cx = x; cy = y; prevType = 'Q'; break; }
                  case 'T': { let [x, y] = a; if (rel) { x += cx; y += cy; } let x1, y1; if (prevType === 'Q' || prevType === 'T') { x1 = 2 * cx - prevCtrlX; y1 = 2 * cy - prevCtrlY; } else { x1 = cx; y1 = cy; } out.push({ type: 'Q', x1, y1, x, y }); prevCtrlX = x1; prevCtrlY = y1; cx = x; cy = y; prevType = 'T'; break; }
                  case 'A': { let [rx, ry, xrot, largeArc, sweep, x, y] = a; if (rel) { x += cx; y += cy; } out.push({ type: 'A', rx, ry, xrot, largeArc, sweep, x0: cx, y0: cy, x, y }); cx = x; cy = y; prevType = 'A'; break; }
                  case 'Z': { cx = startX; cy = startY; out.push({ type: 'Z' }); prevType = 'Z'; break; }
              }
          }
          return out;
      }
  
      function arcToBeziers(x0, y0, rx, ry, xAxisRotationDeg, largeArcFlag, sweepFlag, x, y) {
          if (rx === 0 || ry === 0) return [{ x1: x0, y1: y0, x2: x, y2: y, x, y }];
          rx = Math.abs(rx); ry = Math.abs(ry);
          const phi = (xAxisRotationDeg % 360) * Math.PI / 180;
          const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
          const dx2 = (x0 - x) / 2, dy2 = (y0 - y) / 2;
          const x1p = cosPhi * dx2 + sinPhi * dy2;
          const y1p = -sinPhi * dx2 + cosPhi * dy2;
          let rxSq = rx * rx, rySq = ry * ry;
          const x1pSq = x1p * x1p, y1pSq = y1p * y1p;
          const lambda = x1pSq / rxSq + y1pSq / rySq;
          if (lambda > 1) { const s = Math.sqrt(lambda); rx *= s; ry *= s; rxSq = rx * rx; rySq = ry * ry; }
          const sign = largeArcFlag !== sweepFlag ? 1 : -1;
          let num = rxSq * rySq - rxSq * y1pSq - rySq * x1pSq;
          num = Math.max(num, 0);
          const co = sign * Math.sqrt(num / (rxSq * y1pSq + rySq * x1pSq || 1e-12));
          const cxp = co * (rx * y1p / ry);
          const cyp = co * -(ry * x1p / rx);
          const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
          const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;
          function angle(ux, uy, vx, vy) {
              const dot = ux * vx + uy * vy;
              const len = Math.sqrt((ux * ux + uy * uy) * (vx * vx + vy * vy));
              let a = Math.acos(Math.min(1, Math.max(-1, dot / len)));
              if (ux * vy - uy * vx < 0) a = -a;
              return a;
          }
          const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
          let dTheta = angle((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
          if (!sweepFlag && dTheta > 0) dTheta -= 2 * Math.PI;
          if (sweepFlag && dTheta < 0) dTheta += 2 * Math.PI;
          const numSegs = Math.ceil(Math.abs(dTheta) / (Math.PI / 2 + 1e-6));
          const delta = dTheta / numSegs;
          const alpha = (4 / 3) * Math.tan(delta / 4);
          const beziers = [];
          let theta = theta1;
          function ellipsePoint(th) { const ex = rx * Math.cos(th), ey = ry * Math.sin(th); return { x: cx + cosPhi * ex - sinPhi * ey, y: cy + sinPhi * ex + cosPhi * ey }; }
          function ellipseDeriv(th) { const ex = -rx * Math.sin(th), ey = ry * Math.cos(th); return { x: cosPhi * ex - sinPhi * ey, y: sinPhi * ex + cosPhi * ey }; }
          for (let i = 0; i < numSegs; i++) {
              const theta2 = theta + delta;
              const P1 = ellipsePoint(theta), P2 = ellipsePoint(theta2);
              const D1 = ellipseDeriv(theta), D2 = ellipseDeriv(theta2);
              beziers.push({ x1: P1.x + alpha * D1.x, y1: P1.y + alpha * D1.y, x2: P2.x - alpha * D2.x, y2: P2.y - alpha * D2.y, x: P2.x, y: P2.y });
              theta = theta2;
          }
          if (beziers.length) { beziers[beziers.length - 1].x = x; beziers[beziers.length - 1].y = y; }
          return beziers;
      }
  
      function cubicBBox(x0, y0, x1, y1, x2, y2, x3, y3) {
          let minX = Math.min(x0, x3), maxX = Math.max(x0, x3);
          let minY = Math.min(y0, y3), maxY = Math.max(y0, y3);
          function extrema(p0, p1, p2, p3) {
              const roots = [];
              const a = -p0 + 3 * p1 - 3 * p2 + p3;
              const b = 2 * (p0 - 2 * p1 + p2);
              const c = p1 - p0;
              if (Math.abs(a) < 1e-12) { if (Math.abs(b) > 1e-12) roots.push(-c / b); }
              else { const disc = b * b - 4 * a * c; if (disc >= 0) { const sq = Math.sqrt(disc); roots.push((-b + sq) / (2 * a)); roots.push((-b - sq) / (2 * a)); } }
              return roots.filter((t) => t > 0 && t < 1);
          }
          function at(t, p0, p1, p2, p3) { const mt = 1 - t; return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3; }
          for (const t of extrema(x0, x1, x2, x3)) { const x = at(t, x0, x1, x2, x3); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
          for (const t of extrema(y0, y1, y2, y3)) { const y = at(t, y0, y1, y2, y3); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
          return { minX, minY, maxX, maxY };
      }
  
      function computeBBox(absSegments) {
          let cx = 0, cy = 0;
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          function upd(x, y) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
          for (const s of absSegments) {
              if (s.type === 'M' || s.type === 'L') { upd(s.x, s.y); cx = s.x; cy = s.y; }
              else if (s.type === 'C') { const b = cubicBBox(cx, cy, s.x1, s.y1, s.x2, s.y2, s.x, s.y); upd(b.minX, b.minY); upd(b.maxX, b.maxY); cx = s.x; cy = s.y; }
              else if (s.type === 'Q') { const c1x = cx + (2 / 3) * (s.x1 - cx), c1y = cy + (2 / 3) * (s.y1 - cy); const c2x = s.x + (2 / 3) * (s.x1 - s.x), c2y = s.y + (2 / 3) * (s.y1 - s.y); const b = cubicBBox(cx, cy, c1x, c1y, c2x, c2y, s.x, s.y); upd(b.minX, b.minY); upd(b.maxX, b.maxY); cx = s.x; cy = s.y; }
              else if (s.type === 'A') { const beziers = arcToBeziers(cx, cy, s.rx, s.ry, s.xrot, s.largeArc, s.sweep, s.x, s.y); let px = cx, py = cy; for (const b of beziers) { const bb = cubicBBox(px, py, b.x1, b.y1, b.x2, b.y2, b.x, b.y); upd(bb.minX, bb.minY); upd(bb.maxX, bb.maxY); px = b.x; py = b.y; } cx = s.x; cy = s.y; }
          }
          return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
      }
  
      function applyScaleTranslate(absSegments, sx, sy, tx, ty) {
          function tp(x, y) { return [x * sx + tx, y * sy + ty]; }
          const out = [];
          for (const s of absSegments) {
              if (s.type === 'M') { const [x, y] = tp(s.x, s.y); out.push({ type: 'M', x, y }); }
              else if (s.type === 'L') { const [x, y] = tp(s.x, s.y); out.push({ type: 'L', x, y }); }
              else if (s.type === 'C') { const [x1, y1] = tp(s.x1, s.y1); const [x2, y2] = tp(s.x2, s.y2); const [x, y] = tp(s.x, s.y); out.push({ type: 'C', x1, y1, x2, y2, x, y }); }
              else if (s.type === 'Q') { const [x1, y1] = tp(s.x1, s.y1); const [x, y] = tp(s.x, s.y); out.push({ type: 'Q', x1, y1, x, y }); }
              else if (s.type === 'A') { const [x, y] = tp(s.x, s.y); out.push({ type: 'A', rx: s.rx * Math.abs(sx), ry: s.ry * Math.abs(sy), xrot: s.xrot, largeArc: s.largeArc, sweep: s.sweep, x, y }); }
              else if (s.type === 'Z') { out.push({ type: 'Z' }); }
          }
          return out;
      }
  
      function fmt(n) { if (Math.abs(n) < 1e-9) n = 0; return Math.round(n * 1e6) / 1e6; }
  
      function serialize(absSegments) {
          const parts = [];
          for (const s of absSegments) {
              if (s.type === 'M') parts.push(`M ${fmt(s.x)} ${fmt(s.y)}`);
              else if (s.type === 'L') parts.push(`L ${fmt(s.x)} ${fmt(s.y)}`);
              else if (s.type === 'C') parts.push(`C ${fmt(s.x1)} ${fmt(s.y1)} ${fmt(s.x2)} ${fmt(s.y2)} ${fmt(s.x)} ${fmt(s.y)}`);
              else if (s.type === 'Q') parts.push(`Q ${fmt(s.x1)} ${fmt(s.y1)} ${fmt(s.x)} ${fmt(s.y)}`);
              else if (s.type === 'A') parts.push(`A ${fmt(s.rx)} ${fmt(s.ry)} ${fmt(s.xrot)} ${s.largeArc} ${s.sweep} ${fmt(s.x)} ${fmt(s.y)}`);
              else if (s.type === 'Z') parts.push('Z');
          }
          return parts.join(' ');
      }
  
      function combinePaths(dStrings) { return dStrings.filter(Boolean).join(' '); }
  
      function normalize(d, opts) {
          opts = opts || {};
          const segments = tokenize(d);
          const abs = absolutize(segments);
          const bbox = computeBBox(abs);
          if (!isFinite(bbox.width) || !isFinite(bbox.height) || bbox.width === 0 || bbox.height === 0) {
              throw new Error('Path has a degenerate (zero-area) bounding box');
          }
          let sx, sy, tx, ty;
          if (opts.preserveAspect) {
              const scale = 1 / Math.max(bbox.width, bbox.height);
              sx = sy = scale;
              tx = -bbox.minX * sx + (1 - bbox.width * scale) / 2;
              ty = -bbox.minY * sy + (1 - bbox.height * scale) / 2;
          } else {
              sx = 1 / bbox.width; sy = 1 / bbox.height;
              tx = -bbox.minX * sx; ty = -bbox.minY * sy;
          }
          const transformed = applyScaleTranslate(abs, sx, sy, tx, ty);
          return { d: serialize(transformed), sourceBBox: bbox };
      }
  
      return { tokenize, absolutize, arcToBeziers, computeBBox, applyScaleTranslate, serialize, combinePaths, normalize };
  })();

  function svgElementToD(el) {
      const tag = el.tagName.toLowerCase();
      const num = (name, def) => { const v = parseFloat(el.getAttribute(name)); return isNaN(v) ? (def || 0) : v; };
      if (tag === 'path') return el.getAttribute('d') || '';
      if (tag === 'rect') {
          const x = num('x'), y = num('y'), w = num('width'), h = num('height');
          let rx = el.hasAttribute('rx') ? num('rx') : (el.hasAttribute('ry') ? num('ry') : 0);
          let ry = el.hasAttribute('ry') ? num('ry') : rx;
          if (!rx && !ry) return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
          rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2);
          return `M ${x + rx} ${y} H ${x + w - rx} A ${rx} ${ry} 0 0 1 ${x + w} ${y + ry} V ${y + h - ry} A ${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h} H ${x + rx} A ${rx} ${ry} 0 0 1 ${x} ${y + h - ry} V ${y + ry} A ${rx} ${ry} 0 0 1 ${x + rx} ${y} Z`;
      }
      if (tag === 'circle') { const cx = num('cx'), cy = num('cy'), r = num('r'); return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`; }
      if (tag === 'ellipse') { const cx = num('cx'), cy = num('cy'), rx = num('rx'), ry = num('ry'); return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`; }
      if (tag === 'polygon' || tag === 'polyline') {
          const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
          let d = '';
          for (let i = 0; i < pts.length - 1; i += 2) d += (i === 0 ? 'M ' : 'L ') + pts[i] + ' ' + pts[i + 1] + ' ';
          if (tag === 'polygon') d += 'Z';
          return d.trim();
      }
      if (tag === 'line') { const x1 = num('x1'), y1 = num('y1'), x2 = num('x2'), y2 = num('y2'); return `M ${x1} ${y1} L ${x2} ${y2}`; }
      return '';
  }
  
  function hasAncestorTransform(el, root) {
      let node = el;
      while (node && node !== root) {
          if (node.getAttribute && node.getAttribute('transform')) return true;
          node = node.parentNode;
      }
      return false;
  }
  
  function extractCombinedD(svgOrPathText) {
      const trimmed = svgOrPathText.trim();
      if (!trimmed) throw new Error('Paste some SVG markup or a path "d" value first.');
      if (trimmed[0] !== '<') return { d: trimmed, warnTransform: false };
  
      const doc = new DOMParser().parseFromString(trimmed, 'image/svg+xml');
      const errNode = doc.querySelector('parsererror');
      if (errNode) throw new Error('Could not parse that as SVG/XML.');
  
      const root = doc.documentElement;
      const shapeEls = Array.from(doc.querySelectorAll('path, rect, circle, ellipse, polygon, polyline, line'));
      if (!shapeEls.length) throw new Error('No <path>/<rect>/<circle>/<ellipse>/<polygon>/<polyline>/<line> elements found.');
  
      const warnTransform = shapeEls.some((el) => hasAncestorTransform(el, root));
      const ds = shapeEls.map(svgElementToD).filter(Boolean);
      if (!ds.length) throw new Error('Found shape elements but could not extract usable path data from them.');
      return { d: PathEngine.combinePaths(ds), warnTransform };
  }

  /* ================= Studio SDK helpers ================= */
  function findSdk(win) {
    try {
      const s = win.SDK || win.sdk || win.studioSdk || win.StudioSDK;
      if (s && s.document && typeof s.document.getCurrentState === 'function') return s;
    } catch (e) { /* cross-origin frame */ }
    try {
      for (let i = 0; i < win.frames.length; i++) { const s = findSdk(win.frames[i]); if (s) return s; }
    } catch (e) { /* ignore */ }
    return null;
  }

  const sdk = findSdk(window);
  if (!sdk) {
    console.error('[SVG → Frames] GraFx Studio SDK not found. Wait for the document to load, or pick the Studio iframe in the DevTools "top" context dropdown and run again.');
    return;
  }

  function unwrap(res) {
    if (res && res.success === false) throw new Error(res.error || res.status || 'SDK call failed');
    let v = res && (res.parsedData != null ? res.parsedData : res.data);
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { /* leave as string */ } }
    return v;
  }

  async function getSelectedFrames() {
    if (!sdk.frame || typeof sdk.frame.getSelected !== 'function') return [];
    const v = unwrap(await sdk.frame.getSelected());
    const arr = Array.isArray(v) ? v : (v ? [v] : []);
    return arr
      .map((f) => f && { id: String(f.id || f.frameId), name: f.name || f.frameName || '' })
      .filter((f) => f && f.id && f.id !== 'undefined');
  }

  async function getStateJson() {
    const res = await sdk.document.getCurrentState();
    if (res && res.success === false) throw new Error('getCurrentState failed: ' + (res.error || res.status));
    if (typeof res === 'string') return res;
    if (res && typeof res.data === 'string') return res.data;
    if (res && res.parsedData) return JSON.stringify(res.parsedData);
    return JSON.stringify(res);
  }

  /* ================= Popup UI ================= */
  const HOST_ID = 'chili-svg-to-frames';
  const old = document.getElementById(HOST_ID);
  if (old) old.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = 'position:fixed;top:72px;right:24px;z-index:2147483647;';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });

  root.innerHTML = `
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    .card { width: 300px; background: #fff; color: #1d1d1f; border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,.25), 0 0 0 1px rgba(0,0,0,.08); font-size: 13px; overflow: hidden; }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px;
            background: #1d1d1f; color: #fff; cursor: move; user-select: none; }
    .head b { font-size: 13px; }
    .x { background: none; border: 0; color: #fff; font-size: 18px; line-height: 1; cursor: pointer; padding: 0 2px; }
    .body { padding: 12px; display: grid; gap: 10px; }
    .sel { padding: 8px; border-radius: 6px; background: #f2f2f4; font-size: 12px; line-height: 1.4; max-height: 72px; overflow: auto; }
    .sel.none { background: #fff4e5; color: #8a4b00; }
    .drop { border: 1.5px dashed #b8b8c0; border-radius: 8px; padding: 10px; display: flex; gap: 10px; align-items: center; cursor: pointer; }
    .drop.over { border-color: #FF6600; background: #fff6ef; }
    .drop svg { width: 56px; height: 56px; flex: none; background:
      repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 0 0 / 10px 10px; border-radius: 4px; }
    .drop .t { font-size: 12px; color: #555; word-break: break-all; }
    .row { display: flex; gap: 14px; font-size: 12px; }
    .row label { display: flex; gap: 5px; align-items: center; cursor: pointer; }
    .apply { background: #FF6600; color: #fff; border: 0; border-radius: 6px; padding: 9px; font-weight: 600; cursor: pointer; font-size: 13px; }
    .apply:disabled { opacity: .45; cursor: default; }
    .msg { font-size: 12px; line-height: 1.4; }
    .msg.ok { color: #1a7f37; } .msg.err { color: #c62828; } .msg.warn { color: #8a4b00; }
    input[type=file] { display: none; }
  </style>
  <div class="card">
    <div class="head"><b>SVG → Selected frames</b><button class="x" title="Close">×</button></div>
    <div class="body">
      <div class="sel none">Checking selection…</div>
      <div class="drop" title="Click to choose, or drop an .svg here">
        <svg viewBox="0 0 1 1"><path fill="#FF6600"></path></svg>
        <div class="t">Click to choose an SVG file<br>(or drag one here)</div>
      </div>
      <input type="file" accept=".svg,image/svg+xml">
      <div class="row">
        <label><input type="radio" name="aspect" value="preserve" checked> Keep proportions</label>
        <label><input type="radio" name="aspect" value="stretch"> Stretch to frame</label>
      </div>
      <button class="apply" disabled>Apply to selected frames</button>
      <div class="msg"></div>
    </div>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const selEl = $('.sel'), dropEl = $('.drop'), fileEl = $('input[type=file]');
  const prevPath = $('.drop path'), dropText = $('.drop .t');
  const applyBtn = $('.apply'), msgEl = $('.msg');

  let svgText = null, fileName = '', selected = [], lastKey = null, busy = false, pollTimer = null;

  function msg(text, kind) { msgEl.className = 'msg ' + (kind || ''); msgEl.textContent = text || ''; }
  function updateApply() { applyBtn.disabled = busy || !svgText || !selected.length; }
  function aspect() { return root.querySelector('input[name=aspect]:checked').value === 'preserve'; }

  function renderPreview() {
    if (!svgText) { prevPath.setAttribute('d', ''); return; }
    try {
      const { d } = extractCombinedD(svgText);
      prevPath.setAttribute('d', PathEngine.normalize(d, { preserveAspect: aspect() }).d);
    } catch (e) { prevPath.setAttribute('d', ''); }
  }

  async function refreshSelection() {
    try {
      const list = await getSelectedFrames();
      const key = list.map((f) => f.id).join(',');
      if (key === lastKey) return;
      lastKey = key;
      selected = list;
      if (!list.length) {
        selEl.className = 'sel none';
        selEl.textContent = 'No frames selected — select one or more shape / image frames in Studio.';
      } else {
        selEl.className = 'sel';
        selEl.textContent = `${list.length} frame${list.length > 1 ? 's' : ''} selected: ` +
          list.map((f) => f.name || f.id).join(', ');
      }
      updateApply();
    } catch (e) { /* keep last known selection */ }
  }

  function loadFile(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        extractCombinedD(r.result); // validate early
        svgText = r.result; fileName = file.name;
        dropText.textContent = fileName;
        msg('');
      } catch (e) {
        svgText = null; dropText.innerHTML = 'Click to choose an SVG file<br>(or drag one here)';
        msg(e.message, 'err');
      }
      renderPreview(); updateApply();
    };
    r.readAsText(file);
  }

  function close() { clearInterval(pollTimer); host.remove(); }

  $('.x').addEventListener('click', close);
  dropEl.addEventListener('click', () => fileEl.click());
  fileEl.addEventListener('change', () => { loadFile(fileEl.files[0]); fileEl.value = ''; });
  dropEl.addEventListener('dragover', (e) => { e.preventDefault(); dropEl.classList.add('over'); });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('over'));
  dropEl.addEventListener('drop', (e) => { e.preventDefault(); dropEl.classList.remove('over'); loadFile(e.dataTransfer.files[0]); });
  root.querySelectorAll('input[name=aspect]').forEach((r) => r.addEventListener('change', renderPreview));

  // Drag the popup by its header
  (function makeDraggable() {
    const head = $('.head');
    let sx, sy, ox, oy;
    head.addEventListener('mousedown', (e) => {
      if (e.target.closest('.x')) return;
      const rect = host.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = rect.left; oy = rect.top;
      const move = (ev) => {
        host.style.left = (ox + ev.clientX - sx) + 'px';
        host.style.top = (oy + ev.clientY - sy) + 'px';
        host.style.right = 'auto';
      };
      const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  })();

  applyBtn.addEventListener('click', async () => {
    msg('');
    busy = true; updateApply(); applyBtn.textContent = 'Applying…';
    try {
      await refreshSelection();
      const ids = new Set(selected.map((f) => f.id));
      if (!ids.size) throw new Error('No frames selected in Studio.');

      const extracted = extractCombinedD(svgText);
      const { d } = PathEngine.normalize(extracted.d, { preserveAspect: aspect() });

      // Read the live document, swap the shape on each selected frame, load it back.
      const doc = JSON.parse(await getStateJson());
      const applied = [], skipped = [];
      (doc.pages || []).forEach((page) => (page.frames || []).forEach((f) => {
        if (!ids.has(String(f.id))) return;
        const label = f.name || f.id;
        if (f.type === 'shape' && f.src) { f.src = { type: 'custom', path: d }; applied.push(label); }
        else if (f.type === 'image' && f.container && f.container.source) { f.container.source = { type: 'custom', path: d }; applied.push(label); }
        else skipped.push(`${label} (${f.type})`);
      }));
      if (!applied.length) throw new Error('None of the selected frames can take a custom shape (shape and image frames only). Skipped: ' + skipped.join(', '));

      const res = await sdk.document.load(JSON.stringify(doc));
      if (res && res.success === false) throw new Error('document.load failed: ' + (res.error || res.status));

      // Best effort: restore the selection so you can apply again straight away.
      try {
        const keep = selected.map((f) => f.id);
        if (keep.length > 1 && typeof sdk.frame.selectMultipleFrames === 'function') await sdk.frame.selectMultipleFrames(keep);
        else if (typeof sdk.frame.selectFrame === 'function') await sdk.frame.selectFrame(keep[0]);
      } catch (e) { /* optional */ }

      let text = `Applied to ${applied.length} frame${applied.length > 1 ? 's' : ''}: ${applied.join(', ')}.`;
      if (skipped.length) text += ` Skipped: ${skipped.join(', ')}.`;
      if (extracted.warnTransform) text += ' Note: the SVG had transform attributes that were ignored — check the result.';
      text += ' Remember to save the document.';
      msg(text, skipped.length || extracted.warnTransform ? 'warn' : 'ok');
      lastKey = null; await refreshSelection();
    } catch (e) {
      msg(e.message || String(e), 'err');
    } finally {
      busy = false; applyBtn.textContent = 'Apply to selected frames'; updateApply();
    }
  });

  await refreshSelection();
  pollTimer = setInterval(refreshSelection, 1200);
  console.log('[SVG → Frames] Popup open. Select frames in Studio, pick an SVG, click Apply.');
})();
