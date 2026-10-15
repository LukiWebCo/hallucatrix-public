// Dynamic layout values go through the CSSOM (element.style), which a CSP without 'unsafe-inline' still allows; only
// style attributes in markup and setAttribute('style') are blocked. Inline CSSOM keeps inline precedence, which the
// game layouts rely on (generated class rules lost to more specific selectors).
export function styles(el) {
  return el.style;
}
