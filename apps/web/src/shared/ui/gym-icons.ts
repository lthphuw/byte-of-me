import type { Equipment, Metric } from '@byte-of-me/db/gym-vocabulary';
import {
  Backpack,
  Bell,
  Cable,
  Cog,
  Dumbbell,
  type LucideIcon,
  PersonStanding,
  Spline,
  Timer,
  Weight,
} from 'lucide-react';

/**
 * One picture per piece of equipment, and one per set metric.
 *
 * Literal objects keyed by the vocabulary's own types, so adding a code to
 * `@byte-of-me/db/gym-vocabulary` is a compile error here rather than a tile
 * that renders with no icon. Lucide, never an emoji (§14): these inherit
 * `currentColor`, which is what lets them invert with the tile they sit on —
 * an emoji arrives pre-coloured from a font the OS picked and would stay dark
 * on a `bg-primary` fill.
 *
 * Beside `use-gym-labels.ts` rather than inside a feature, for the same
 * reason: the catalogue, the picker, the routine editor and the session editor
 * all draw these, and `shared` is the only layer all four can reach.
 */
export const EQUIPMENT_ICON: Record<Equipment, LucideIcon> = {
  barbell: Dumbbell,
  dumbbell: Weight,
  machine: Cog,
  cable: Cable,
  bodyweight: PersonStanding,
  kettlebell: Bell,
  band: Spline,
};

/**
 * What a set of this exercise is made of, as a picture: a loaded bar, a body,
 * a body plus something strapped to it, a clock. The metric is the field that
 * decides which inputs the set editor renders, so it is worth being able to
 * see at a glance which one an exercise carries.
 */
export const METRIC_ICON: Record<Metric, LucideIcon> = {
  weight_reps: Dumbbell,
  bodyweight_reps: PersonStanding,
  weighted_bodyweight: Backpack,
  time: Timer,
};

/**
 * The icon for a code that came back from the database.
 *
 * `ExerciseRow.equipment` is typed `string`, not `Equipment` — the action
 * hands back what the column holds, and the column is a `text`. Indexing the
 * map with a cast would type the result as always-present and render
 * `undefined` as a component the moment a row carries a code the vocabulary
 * has since dropped; this returns the honest `| undefined` and lets the caller
 * fall back to the label alone. Same contract as `labelForCode`.
 */
export function iconForCode<T extends string>(
  icons: Record<T, LucideIcon>,
  code: string
): LucideIcon | undefined {
  return (icons as Record<string, LucideIcon>)[code];
}
