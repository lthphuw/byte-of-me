export {
  DEFAULT_ROUTINE_INCLUDE_ARCHIVED,
  type RoutineDraft,
} from './lib/routine-drafts';
// The start panel lists the live routines to seed a session from. It reaches
// this slice through the barrel rather than the hook file: a slice's internals
// are its own (AGENTS §3), and sharing the hook is also what keeps both
// readers on one `exerciseKeys.routineList(...)` cache entry.
export { useRoutines } from './model/use-routines';
export { RoutineManager } from './ui/routine-manager';
