const GRACE_MS = 400;

/**
 * Archiving is now instant, but a task's checkbox/card-bounce reward
 * animation needs at least one paint frame to actually be seen before
 * the card disappears from its list. This store keeps a just-completed
 * task briefly visible (grace window) even though isArchived() is
 * already true for it, so the animation has time to play.
 */
const pending = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();

const EMPTY_IDS: string[] = [];
let idsSnapshot: string[] = EMPTY_IDS;

function recomputeSnapshot() {
  idsSnapshot = pending.size > 0 ? Array.from(pending.keys()) : EMPTY_IDS;
}

function emit() {
  recomputeSnapshot();
  for (const listener of listeners) listener();
}

export function subscribeArchiveTransition(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getArchiveTransitionIds(): string[] {
  return idsSnapshot;
}

export function getArchiveTransitionIdsServerSnapshot(): string[] {
  return EMPTY_IDS;
}

export function markJustCompleted(id: string) {
  const existing = pending.get(id);
  if (existing) clearTimeout(existing);
  const timeoutId = setTimeout(() => {
    pending.delete(id);
    emit();
  }, GRACE_MS);
  pending.set(id, timeoutId);
  emit();
}

export function clearJustCompleted(id: string) {
  const existing = pending.get(id);
  if (!existing) return;
  clearTimeout(existing);
  pending.delete(id);
  emit();
}
