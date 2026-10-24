import type { Annotation } from './types';
export function anchorSelection(root: HTMLElement, selection: Selection) {
  if (!selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer) || range.collapsed)
    return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length,
    quote = range.toString();
  return { start, end: start + quote.length, quote };
}
export function segments(content: string, annotations: Annotation[]) {
  const valid = annotations.filter((a) => content.slice(a.start, a.end) === a.quote);
  const boundaries = [
    ...new Set([0, content.length, ...valid.flatMap((a) => [a.start, a.end])]),
  ].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, i) => ({
    start,
    text: content.slice(start, boundaries[i + 1]),
    annotations: valid.filter((a) => a.start <= start && a.end >= boundaries[i + 1]),
  }));
}
