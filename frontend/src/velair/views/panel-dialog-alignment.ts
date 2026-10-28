/** Keep native dialogs aligned to the Velair panel, including HA sidebar changes. */
export function observePanelDialogAlignment(dialog: HTMLDialogElement, element: HTMLElement, prefix: string): () => void {
  const root = element.getRootNode();
  const container = root instanceof ShadowRoot ? root.host : element;
  const align = () => {
    if (!dialog.open) return;
    const viewport = document.documentElement.clientWidth || window.innerWidth;
    const bounds = container.getBoundingClientRect();
    const gutter = viewport <= 560 ? 8 : 16;
    dialog.style.setProperty(`--${prefix}-container-width`, `${Math.max(1, (bounds.width || viewport) - 2 * gutter)}px`);
    const width = dialog.getBoundingClientRect().width;
    const desired = viewport <= 560 || !bounds.width ? viewport / 2 : bounds.left + bounds.width / 2;
    const center = Math.max(gutter + width / 2, Math.min(desired, viewport - gutter - width / 2));
    dialog.style.setProperty(`--${prefix}-center`, `${center}px`);
  };
  align();
  window.addEventListener("resize", align);
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(align);
  observer?.observe(container);
  const outer = container.getRootNode();
  if (outer instanceof ShadowRoot && outer.host !== container) observer?.observe(outer.host);
  return () => { window.removeEventListener("resize", align); observer?.disconnect(); };
}
