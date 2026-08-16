/**
 * Where a chrome toggle's menu opens.
 *
 * The theme and language toggles are the same component on four surfaces that
 * sit in completely different places on the screen — a header along the top, a
 * 56px rail down the left, a 260px sidebar footer, and a drawer over a phone.
 * A menu that drops downwards is correct under a header and wrong everywhere
 * else: from a control near the bottom of a left-hand panel it opens into the
 * edge of the window and has to be rescued by collision detection, which
 * shifts it somewhere nobody chose.
 *
 * So placement is the SURFACE's decision, passed in, rather than a constant
 * baked into the control. The defaults below keep the header behaving exactly
 * as it did, so only the surfaces that need something else have to say so.
 */
export interface MenuPlacement {
  /** Which edge of the trigger the menu grows from. */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** How it lines up along that edge. */
  align?: 'start' | 'center' | 'end';
}

/** Below a trigger, right edges flush — what a top header wants. */
export const DEFAULT_MENU_PLACEMENT = {
  side: 'bottom',
  align: 'end',
} as const satisfies Required<MenuPlacement>;
