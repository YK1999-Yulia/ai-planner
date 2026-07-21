/**
 * Module-level (not component state) so the "saved" toast survives the
 * client-side navigation from Capture to Inbox — set right before
 * router.push, read once the Inbox page mounts.
 */
let justSavedCount: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeJustSaved(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getJustSaved(): number | null {
  return justSavedCount;
}

export function getJustSavedServerSnapshot(): number | null {
  return null;
}

export function markJustSaved(count: number) {
  justSavedCount = count;
  emit();
}

export function clearJustSaved() {
  justSavedCount = null;
  emit();
}
