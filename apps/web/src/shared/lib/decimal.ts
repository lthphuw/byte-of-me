import type { Prisma } from '@byte-of-me/db';

/**
 * A Prisma `Decimal` does not survive the server-action boundary.
 *
 * `@db.Decimal` columns come back as `Decimal` instances (decimal.js), and a
 * server action's return value is serialized — so a `Decimal` left in a
 * response arrives at the client as a plain object whose digits live in
 * internal fields (`s`/`e`/`d`), while the type still claims a number. Every
 * arithmetic use of it then produces `NaN` silently. Convert at the edge, in
 * the action, exactly where `Date` is converted to an ISO string.
 *
 * The columns this exists for: `WorkoutSet.weightKg`, `WorkoutSet.rpe`,
 * `WorkoutSession.sessionRpe`, `RoutineExercise.targetRpe`. All four are
 * nullable, so the null passes straight through rather than becoming 0 — a
 * bodyweight set has no weight, and 0 kg is a different claim from "unknown".
 */
export function decimalToNumber(
  value: Prisma.Decimal | null | undefined
): number | null {
  return value == null ? null : value.toNumber();
}
