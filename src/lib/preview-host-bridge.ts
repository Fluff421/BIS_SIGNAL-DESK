/** Preview host bridge helpers. */
export function isEmbeddedPreview(): boolean {
  if (typeof window === "undefined") return false;
  return window.parent !== window;
}
