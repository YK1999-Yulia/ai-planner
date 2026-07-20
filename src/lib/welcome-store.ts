import { hasSeenWelcome } from "./onboarding-storage";
import { getTasksSnapshot } from "./tasks-store";

/**
 * Module-level (not component state) so BottomNav — a separate component
 * mounted once in the root layout, outside Capture's own tree — can hide
 * itself in sync with Capture's welcome screen without prop drilling.
 */
let initialized = false;
let showWelcome = false;
const listeners = new Set<() => void>();

function computeInitial(): boolean {
  const forced = new URLSearchParams(window.location.search).get("welcome") === "1";
  const isNewUser = !hasSeenWelcome() && getTasksSnapshot().length === 0;
  return forced || isNewUser;
}

function ensureInitialized() {
  if (initialized || typeof window === "undefined") return;
  showWelcome = computeInitial();
  initialized = true;
}

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeWelcome(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getShowWelcome(): boolean {
  ensureInitialized();
  return showWelcome;
}

export function getShowWelcomeServerSnapshot(): boolean {
  return false;
}

export function dismissWelcome() {
  ensureInitialized();
  showWelcome = false;
  emit();
}
