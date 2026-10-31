(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AIMRParser = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";
  const ENVIRONMENTS = "aligned|alignedat|gathered|gather|cases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|smallmatrix|array|split|multline|equation";
  const ENV_RE = new RegExp("\\\\begin\\{(" + ENVIRONMENTS + ")\\}([\\s\\S]*?)\\\\end\\{\\1\\}", "g");
  function isEscaped(source, index) {
    let count = 0;
    for (let i = index - 1; i >= 0 && source[i] === "\\\\"; i--) count++;
    return count % 2 === 1;
  }
  function isMathLike(tex) {
    const value = tex.trim();
    return /\\\\[a-zA-Z]+|[_^{}=<>≤≥≠≈±×÷∑∫∞+*/(),&]|[α-ωΑ-Ω]/u.test(value);
  }
  function findClosing(source, token, from, inlineDollar = false) {
    let index = source.indexOf(token, from);
    while (index !== -1) {
      if (!isEscaped(source, index)) {
        if (!inlineDollar || (source[index + 1] !== "$" && source[index - 1] !== "$")) {
          if (inlineDollar && source.slice(from, index).includes("\n")) return -1;
          return index;
        }
      }
      index = source.indexOf(token, index + token.length);
    }
    return -1;
  }
  function parse(source) {
    const segments = [];
    const occupied = [];
    let i = 0;
    while (i < source.length) {
      let open = null, close = null, display = false, inlineDollar = false;
      if (source.startsWith("\\\\[", i) && !isEscaped(source, i)) { open = "\\\\["; close = "\\\\]"; display = true; }
      else if (source.startsWith("\\\\(", i) && !isEscaped(source, i)) { open = "\\\\("; close = "\\\\)"; }
      else if (source.startsWith("$$", i) && !isEscaped(source, i)) { open = "$$"; close = "$$"; display = true; }
      else if (source[i] === "$" && !isEscaped(source, i) && source[i + 1] !== "$") { open = "$"; close = "$"; inlineDollar = true; }
      if (!open) { i++; continue; }
      const contentStart = i + open.length;
      const closeAt = findClosing(source, close, contentStart, inlineDollar);
      if (closeAt < 0) { i = contentStart; continue; }
      const tex = source.slice(contentStart, closeAt);
      const end = closeAt + close.length;
      if (isMathLike(tex)) {
        segments.push({ start: i, end, tex, display, open, close, bare: false });
        occupied.push([i, end]);
      }
      i = end;
    }
    ENV_RE.lastIndex = 0;
    let match;
    while ((match = ENV_RE.exec(source)) !== null) {
      const start = match.index, end = start + match[0].length;
      if (occupied.some(([a, b]) => start < b && end > a)) continue;
      segments.push({ start, end, tex: match[0], display: true, open: "", close: "", bare: true });
    }
    if (segments.length === 0) {
      const leading = source.length - source.trimStart().length;
      const trailing = source.trimEnd().length;
      let candidate = source.slice(leading, trailing);
      if (candidate.startsWith("[") && candidate.endsWith("]")) candidate = candidate.slice(1, -1).trim();
      const strong = /\\\\(?:liminf|limsup|frac|dfrac|tfrac|mathbb|mathbf|mathrm|mathcal|operatorname|sum|prod|int|infty|partial|sqrt|to|cdot|times|leq|geq|neq|approx|alpha|beta|gamma|lambda|mu|sigma)\b/;
      const withoutCommands = candidate.replace(/\\\\[a-zA-Z]+/g, "").replace(/[A-Za-z]{2,}/g, "");
      const hasStructure = /[=<>_^{}()[\]]/.test(candidate);
      if (candidate.length > 3 && candidate.length < 4000 && strong.test(candidate) && hasStructure && !/[A-Za-z]{2,}/.test(withoutCommands)) {
        segments.push({ start: leading, end: trailing, tex: candidate, display: true, open: "", close: "", bare: true });
      }
    }
    segments.sort((a, b) => a.start - b.start);
    return { source, segments };
  }
  return { parse, isMathLike, isEscaped };
});
