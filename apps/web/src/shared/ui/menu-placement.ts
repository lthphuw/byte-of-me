/**
 * Where a chrome toggle's menu opens.
 *
 * The theme and language toggles sit in different places: a header along the
 * top, a 56px rail down the left, a drawer over a phone. A menu that drops
 * downwards is right under a header and wrong from a control at the bottom of a
 * left-hand panel, where collision detection would shift it somewhere nobody
 * chose. So placement is the surface's decision, passed in; the defaults suit a
 * header.
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
} as const satisfies Pick<Required<MenuPlacement>, 'side' | 'align'>;
