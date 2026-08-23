export {
  DEFAULT_EXERCISE_FILTERS,
  type ExerciseFilters,
} from './lib/exercise-filters';
export { useExerciseList } from './model/use-exercise-list';
export { ExerciseCatalog } from './ui/exercise-catalog';
// The picker is the one thing other gym features reach for. It lives here
// rather than in a slice of its own so that it shares this slice's query hook
// — and therefore its `exerciseKeys.list(...)` cache entries — with the
// catalogue screen instead of growing a second reader of the same key.
export { ExercisePickerModal } from './ui/exercise-picker-modal';
