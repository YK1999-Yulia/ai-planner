/**
 * Visual "haptic" press feedback for every tappable element.
 * Uses transition-all (not transition-transform) so it composes safely
 * with elements that already animate color on their own, e.g. the
 * bottom nav's active-tab color change — two separate transition-*
 * utilities would fight over the transition-property declaration.
 */
export const TAP_ACTIVE =
  "transition-all duration-100 active:scale-[0.97] active:brightness-95";
