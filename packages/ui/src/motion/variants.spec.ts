import { describe, expect, it } from 'bun:test';

import { motionStagger } from './tokens';
import { staggerStep } from './variants';

// A long list must not keep its tail waiting: whatever the length, the last item
// starts inside the stagger budget (.claude/rules/motion.md).
describe('staggerStep', () => {
  it('keeps the last item inside the budget for any list length', () => {
    for (const count of [1, 2, 3, 6, 8, 12, 40, 200]) {
      const lastStart = staggerStep(count) * Math.max(count - 1, 0);

      expect(lastStart).toBeLessThanOrEqual(motionStagger.budget + 1e-9);
    }
  });

  it('uses the full step while the list is short enough to afford it', () => {
    expect(staggerStep(4)).toBe(motionStagger.step);
  });

  it('shrinks the step once the budget would be exceeded', () => {
    expect(staggerStep(40)).toBeLessThan(motionStagger.step);
  });
});
