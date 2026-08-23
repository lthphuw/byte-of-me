'use client';

/**
 * Telling the reader rest is over without them looking at the phone.
 *
 * **`navigator.vibrate` is Android only.** iOS Safari does not implement the
 * Vibration API at all — not gated behind a permission, not silently ignored:
 * the method is absent, and `navigator.vibrate(...)` there is a TypeError that
 * would take down the timer callback that called it. So the haptic is a bonus
 * on the platform that has it, and the cue that everybody actually gets is the
 * other two: a short tone, and the timer flipping to a filled "rest is over"
 * state with an `aria-live` announcement behind it (§14 — no meaning carried by
 * one channel, and here the channel might not exist).
 *
 * The tone is synthesised rather than loaded. An audio file is a network
 * request, and this feature's whole premise is that the network is unreliable —
 * a beep that 404s in a basement is not a beep. Two short oscillator blips cost
 * nothing to ship and cannot fail to download.
 *
 * **iOS also requires a user gesture before audio will play at all**, and a
 * timer firing three minutes later is not one. `primeRestCue` exists for that:
 * it is called on the tap that STARTS the rest — a real gesture — and resumes
 * the context then, so the tone that plays later is allowed to.
 */

/** The context, created once and reused. Creating one per cue leaks: browsers
 *  cap the number of live `AudioContext`s per document and start throwing. */
let audioContext: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (typeof window.AudioContext === 'undefined') return null;

  try {
    audioContext ??= new window.AudioContext();
    return audioContext;
  } catch {
    // Some privacy modes refuse to construct one. Silence is an acceptable
    // outcome; a thrown error inside a click handler is not.
    return null;
  }
}

/**
 * Unlocks audio, on the gesture that starts a rest.
 *
 * Safe to call on every set: `resume()` on a running context is a no-op, and
 * the promise is deliberately swallowed — a rejected resume means the cue will
 * be silent, which is a degradation, not an error to report mid-set.
 */
export function primeRestCue(): void {
  const context = ensureContext();
  if (!context) return;

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined);
  }
}

/** One blip: a sine at `frequency`, fading out so it does not click. */
function blip(context: AudioContext, at: number, frequency: number): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  // Ramped rather than switched. A gain that jumps to zero produces a click
  // at the discontinuity, which on a phone speaker is louder than the tone.
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.25, at + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + 0.2);
}

/**
 * Rest is over: two rising blips, and a haptic where one exists.
 *
 * Every branch is feature-detected and every call is wrapped, because this
 * runs from a timer render path — an exception here would blank the screen a
 * lifter is mid-set on, to announce that a beep failed.
 */
export function playRestCue(): void {
  const context = ensureContext();

  if (context) {
    try {
      const now = context.currentTime;
      blip(context, now, 660);
      blip(context, now + 0.22, 880);
    } catch {
      // An oscillator can refuse on a context the OS has torn down.
    }
  }

  // `in` rather than `?.`: lib.dom types `vibrate` as always present on
  // `Navigator`, so optional chaining would not compile as a guard, and on iOS
  // the property genuinely is not there.
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([120, 60, 120]);
    } catch {
      // Some browsers throw when the document is not focused.
    }
  }
}
