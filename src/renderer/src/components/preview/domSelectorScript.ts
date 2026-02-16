/**
 * Scripts injected into the webview guest page for DOM element selection.
 * Communication back to the host uses console.log with sentinel prefixes.
 */

export const DOM_SELECTOR_SCRIPT = `(function() {
  if (window.__TS_DOM_SELECTOR_ACTIVE__) return;
  window.__TS_DOM_SELECTOR_ACTIVE__ = true;

  var MAX_HTML_LENGTH = 8192;
  var currentEl = null;

  // --- Overlay ---
  var overlay = document.createElement('div');
  overlay.id = '__ts_dom_overlay__';
  Object.assign(overlay.style, {
    position: 'fixed',
    pointerEvents: 'none',
    border: '2px solid #007acc',
    background: 'rgba(0, 122, 204, 0.08)',
    borderRadius: '2px',
    zIndex: '2147483646',
    transition: 'all 0.05s ease-out',
    display: 'none'
  });
  document.documentElement.appendChild(overlay);

  // --- Tooltip ---
  var tooltip = document.createElement('div');
  tooltip.id = '__ts_dom_tooltip__';
  Object.assign(tooltip.style, {
    position: 'fixed',
    pointerEvents: 'none',
    background: '#1e1e1e',
    color: '#d4d4d4',
    fontSize: '11px',
    fontFamily: 'monospace',
    padding: '3px 8px',
    borderRadius: '3px',
    zIndex: '2147483647',
    whiteSpace: 'nowrap',
    display: 'none',
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  });
  document.documentElement.appendChild(tooltip);

  // --- Cursor ---
  var styleEl = document.createElement('style');
  styleEl.id = '__ts_dom_style__';
  styleEl.textContent = '* { cursor: crosshair !important; }';
  document.documentElement.appendChild(styleEl);

  function buildLabel(el) {
    var tag = el.tagName.toLowerCase();
    var id = el.id ? '#' + el.id : '';
    var cls = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
      : '';
    var rect = el.getBoundingClientRect();
    var dims = Math.round(rect.width) + 'x' + Math.round(rect.height);
    return tag + id + cls + '  ' + dims;
  }

  function positionOverlay(el) {
    var rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      display: 'block'
    });
  }

  function positionTooltip(el) {
    var rect = el.getBoundingClientRect();
    tooltip.textContent = buildLabel(el);

    var tooltipTop = rect.top - 24;
    if (tooltipTop < 4) tooltipTop = rect.bottom + 4;

    Object.assign(tooltip.style, {
      top: tooltipTop + 'px',
      left: Math.max(4, rect.left) + 'px',
      display: 'block'
    });
  }

  function onMouseMove(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || el === overlay || el === tooltip) return;
    if (el === currentEl) return;
    currentEl = el;
    positionOverlay(el);
    positionTooltip(el);
  }

  function cleanup() {
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    window.__TS_DOM_SELECTOR_ACTIVE__ = false;
    currentEl = null;
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (!currentEl) return;

    var html = currentEl.outerHTML;
    if (html.length > MAX_HTML_LENGTH) {
      html = html.substring(0, MAX_HTML_LENGTH) + '\\n<!-- truncated -->';
    }

    console.log('__TS_DOM_SELECT__:' + html);
    cleanup();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('__TS_DOM_CANCEL__');
      cleanup();
    }
  }

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);
})();`

export const DOM_SELECTOR_DEACTIVATE_SCRIPT = `(function() {
  if (!window.__TS_DOM_SELECTOR_ACTIVE__) return;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
})();`
