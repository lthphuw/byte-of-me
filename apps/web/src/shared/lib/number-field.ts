/**
 * The two directions of an optional numeric text field.
 *
 * Every optional number the gym surface collects — target sets, a rep range, a
 * rest interval, a set's weight, its reps, its RPE — is stored nullable and
 * edited in an `<input>`, and those two states do not line up on their own: an
 * empty input reads as `''`, and `Number('')` is `0`.
 *
 * That gap matters here rather than being a nicety. "No RPE recorded" and
 * "recorded an RPE of 0" are different claims, and only the second belongs in
 * a training load; a target of zero sets is not a target, it is an absent one.
 * `useSleepEntry` makes the same distinction for latency and minutes awake and
 * records why in the same words — this is the shared version, because four
 * more screens now need it.
 */

/** An input's value as the number to send, or null when it is blank or not a
 *  number at all. Never `NaN`: a `NaN` crosses the action boundary as `null`
 *  after JSON serialization anyway, so returning it would only postpone the
 *  same answer past the point where the form could report it. */
export function numberFieldToValue(field: string): number | null {
  const trimmed = field.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

/** The same, rounded to a whole number — for the fields whose column is an
 *  `Int` (reps, sets, seconds). Rounding here rather than letting Postgres do
 *  it is what keeps the value that was typed and the value that was stored the
 *  same number. */
export function integerFieldToValue(field: string): number | null {
  const value = numberFieldToValue(field);

  return value === null ? null : Math.round(value);
}

/** A stored value as the string an input shows. Null becomes an empty field,
 *  not a zero — the inverse of `numberFieldToValue`, so a value that makes a
 *  round trip through the form comes back unchanged. */
export function valueToNumberField(value: number | null): string {
  return value === null ? '' : String(value);
}
