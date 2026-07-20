/**
 * Visual "haptic" press feedback for every tappable element.
 * Uses transition-all (not transition-transform) so it composes safely
 * with elements that already animate color on their own, e.g. the
 * bottom nav's active-tab color change — two separate transition-*
 * utilities would fight over the transition-property declaration.
 */
export const TAP_ACTIVE =
  "transition-all duration-100 active:scale-[0.97] active:brightness-95";

/**
 * Expands a small icon-only button/link's tap target toward ~44px via
 * padding + a matching negative margin, so the enlarged hit area doesn't
 * shift surrounding layout/gaps and the visible glyph size is unaffected.
 * For glyph-only controls (✕, ←, ⚙) with no existing fixed size box.
 */
export const TAP_TARGET_44 =
  "inline-flex items-center justify-center p-2.5 -m-2.5";
