/**
 * Where a chrome toggle's menu opens. The surface decides (header, 56px rail, drawer):
 * a downward menu is wrong from the bottom of a left panel, where collision detection
 * would shift it somewhere nobody chose. The defaults suit a header.
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
