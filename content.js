(() => {
  "use strict";
  if (window.__AIMR_BOOTED__) return;
  window.__AIMR_BOOTED__ = true;

  const HOST = location.hostname;
  const DEFAULTS = { enabled: true, disabledHosts: [] };
  const SKIP_SELECTOR = [
    "pre", "code", "textarea", "input", "script", "style", "noscript",
    "svg", "math", "[contenteditable='true']", "[data-aimr-rendered]",
    "[data-aimr-math]", ".katex", ".katex-display", ".MathJax",
    "mjx-container", "[aria-hidden='true']"
  ].join(",");

  let settings = { ...DEFAULTS };
  let scanTimer = null;
  let scanning = false;
  let pendingRescan = false;
  let totalRendered = 0;
  let lastScanAt = 0;

  const isEnabled = () => settings.enabled !== false && !settings.disabledHosts.includes(HOST);

  function loadSettings() {
    return new Promise(resolve => {
      chrome.storage.local.get(DEFAULTS, data => {
        settings = { ...DEFAULTS, ...data };
        if (!Array.isArray(settings.disabledHosts)) settings.disabledHosts = [];
        resolve(settings);
      });
    });
  }

  function isSkipped(node) {
    const parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return !parent || Boolean(parent.closest(SKIP_SELECTOR));
  }

  function collectTextNodes(block) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!isSkipped(node) && node.nodeValue) nodes.push(node);
    }
    return nodes;
  }

  function locateOffset(nodes, offset) {
    let consumed = 0;
    for (const node of nodes) {
      const length = node.nodeValue.length;
      if (offset <= consumed + length) {
        return { node, offset: Math.max(0, offset - consumed) };
      }
      consumed += length;
    }
    const last = nodes[nodes.length - 1];
    return last ? { node: last, offset: last.nodeValue.length } : null;
  }

  function renderBlock(block, stats) {
    if (!block.isConnected || isSkipped(block)) return;
    const nodes = collectTextNodes(block);
    if (!nodes.length) return;

    const source = nodes.map(node => node.nodeValue).join("");
    if (!source || source.length > 20000) return;
    const parsed = AIMRParser.parse(source);
    if (!parsed.segments.length) return;

    // Apply from right to left so earlier text offsets remain stable.
    const segments = [...parsed.segments].sort((a, b) => b.start - a.start);
    let renderedHere = 0;

    for (const segment of segments) {
      const start = locateOffset(nodes, segment.start);
      const end = locateOffset(nodes, segment.end);
      if (!start || !end || !start.node.isConnected || !end.node.isConnected) continue;

      const tex = segment.bare ? segment.tex : segment.tex;
      try {
        const html = katex.renderToString(tex, {
          displayMode: segment.display,
          throwOnError: true,
          strict: "ignore",
          trust: false,
          output: "htmlAndMathml",
          macros: {}
        });
        const template = document.createElement("template");
        template.innerHTML = html;
        const wrapper = document.createElement("span");
        wrapper.setAttribute("data-aimr-math", segment.display ? "display" : "inline");
        wrapper.setAttribute("data-aimr-rendered", "true");
        if (segment.display) wrapper.className = "aimr-display-math";
        wrapper.appendChild(template.content);

        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        range.deleteContents();
        range.insertNode(wrapper);
        renderedHere++;
      } catch (_error) {
        stats.failed++;
      }
    }

    if (renderedHere) {
      stats.rendered += renderedHere;
      stats.blocks++;
    }
  }

  function getCandidateBlocks() {
    const selector = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6";
    const blocks = new Set(document.querySelectorAll(selector));

    // Some chat renderers use nested divs instead of semantic paragraphs.
    for (const div of document.querySelectorAll("main div, article div, [role='main'] div")) {
      if (div.querySelector("div, p, li, blockquote, table, ul, ol, pre")) continue;
      if (div.textContent && div.textContent.length > 0) blocks.add(div);
    }
    return [...blocks].filter(block => !isSkipped(block));
  }

  function scanNow() {
    if (!isEnabled() || !window.katex?.renderToString || !window.AIMRParser || scanning) {
      if (scanning) pendingRescan = true;
      return { rendered: 0, blocks: 0, failed: 0 };
    }

    scanning = true;
    const stats = { rendered: 0, blocks: 0, failed: 0 };
    try {
      for (const block of getCandidateBlocks()) renderBlock(block, stats);
    } finally {
      scanning = false;
      totalRendered += stats.rendered;
      lastScanAt = Date.now();
      chrome.storage.local.set({
        aimrLastScan: lastScanAt,
        aimrLastRendered: stats.rendered,
        aimrTotalRendered: totalRendered,
        aimrLastFailed: stats.failed
      });
      if (pendingRescan) {
        pendingRescan = false;
        scheduleScan(120);
      }
    }
    return stats;
  }

  function scheduleScan(delay = 450) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanNow, delay);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "AIMR_RESCAN") {
      sendResponse({ ok: true, ...scanNow() });
      return true;
    }
    if (message?.type === "AIMR_GET_STATUS") {
      sendResponse({ enabled: isEnabled(), host: HOST, totalRendered, lastScanAt });
      return true;
    }
    if (message?.type === "AIMR_SETTINGS_CHANGED") {
      loadSettings().then(() => scheduleScan(50));
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.enabled || changes.disabledHosts)) {
      loadSettings().then(() => {
        if (isEnabled()) scheduleScan(50);
      });
    }
  });

  const observer = new MutationObserver(records => {
    if (!isEnabled()) return;
    const relevant = records.some(record => {
      const target = record.target.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
      return target && !target.closest?.("[data-aimr-rendered]");
    });
    if (relevant) scheduleScan();
  });

  loadSettings().then(() => {
    if (!isEnabled()) return;
    scheduleScan(250);
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  });
})();
