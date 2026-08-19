'use client';

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import {
  type ArrayPath,
  type Control,
  type FieldArrayPathValue,
  type FieldValues,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@byte-of-me/ui';
import { Languages, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TextField } from './text-field';

import { useRevealOnInvalidSubmit } from '@/shared/hooks/use-reveal-on-invalid-submit';

/**
 * One element of the field array at `TName`.
 *
 * react-hook-form 7.83 added a `<FieldArray>` component and exports it by name
 * from the package root, which shadows the same-named type the root also
 * re-exports via `export * from './types'` — an explicit named export wins over
 * a star export, so importing `type FieldArray` now resolves to the component
 * and fails with TS2749. Reconstructed here from `FieldArrayPathValue`, which is
 * still exported cleanly, using the library's own definition of the type.
 */
type FieldArrayItem<
  T extends FieldValues,
  TName extends ArrayPath<T>,
> = FieldArrayPathValue<T, TName> extends
  | ReadonlyArray<infer U>
  | null
  | undefined
  ? U
  : never;

export interface TranslationTabsProps<
  T extends FieldValues = FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>,
> {
  control: Control<T>;
  /** Path to the translations array (e.g. "translations"). */
  name: TName;
  /**
   * Default object appended by the "Add Language" button.
   * Must use `language: ''` so validation feedback can surface.
   */
  newTranslation: () => FieldArrayItem<T, TName>;
  /** Per-language fields rendered below the language input. */
  renderFields: (index: number) => ReactNode;
  className?: string;
  /**
   * Active tab, as the stringified index of the translation. Optional, and
   * normally omitted: uncontrolled, the component reveals the erroring tab
   * itself after a failed submit (see `useRevealOnInvalidSubmit` below).
   * Passing a value takes that over completely — the escape hatch for a
   * caller that needs the tab tied to some other state, and the reason the
   * self-reveal checks for it rather than fighting it.
   */
  value?: string;
  onValueChange?: (value: string) => void;
}

/**
 * Index of the first entry of a react-hook-form field array that carries a
 * validation error, or `null`. Field-array errors arrive as a sparse array.
 */
export function firstErroredIndex(errors: unknown): number | null {
  if (!Array.isArray(errors)) return null;
  const index = errors.findIndex((entry) => entry != null);
  return index === -1 ? null : index;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLanguageLabel(translations: unknown, index: number): string {
  if (!Array.isArray(translations)) return '??';

  const entry: unknown = translations[index];
  if (!isRecord(entry)) return '??';

  const language = entry.language;
  return typeof language === 'string' && language
    ? language.toUpperCase()
    : '??';
}

/**
 * Language-tab UX for a `useFieldArray` of translations: one tab per
 * language, an "Add Language" button and a per-tab "Remove Language"
 * button (only when more than one translation exists).
 */
export function TranslationTabs<
  T extends FieldValues,
  TName extends ArrayPath<T>,
>(props: TranslationTabsProps<T, TName>): ReactElement;
export function TranslationTabs({
  control,
  name,
  newTranslation,
  renderFields,
  className,
  value,
  onValueChange,
}: TranslationTabsProps): ReactElement {
  const t = useTranslations('dashboard.shared');
  const { fields, append, remove } = useFieldArray({ control, name });
  // Uncontrolled-or-controlled: `value` wins when the caller supplies one.
  const [internalTab, setInternalTab] = useState<string>();
  const tab = value ?? internalTab;

  const setTab = useCallback(
    (next: string) => {
      setInternalTab(next);
      onValueChange?.(next);
    },
    [onValueChange]
  );
  // Scoped to this array on purpose. An unscoped `useWatch({ control })` makes
  // react-hook-form deep-clone the whole form on every keystroke anywhere, for
  // every mounted instance — which is quadratic once a form nests several of
  // these around rich text editors. `as unknown` because the non-generic
  // implementation signature can only type this as FieldValues.
  const translations = useWatch({ control, name }) as unknown;

  // Tabs are keyed by index, not by the field-array id: a caller can only
  // learn *which* translation failed validation from the error's array index,
  // and the ids are generated privately in here.
  useEffect(() => {
    if (fields.length === 0) return;
    const current = tab === undefined ? -1 : Number(tab);
    if (!Number.isInteger(current) || current < 0 || current >= fields.length) {
      setTab('0');
    }
  }, [fields, tab, setTab]);

  // Self-revealing: a translation error otherwise renders inside an unmounted
  // tab and the submit button just looks dead. Done here rather than in each
  // caller's `handleSubmit` because these nest — a company role's tabs sit
  // inside a collapsible inside the dialog's own tabs, and threading the error
  // object down every level is what left three of them silent.
  //
  // Declared AFTER the clamp above, and that order is load-bearing: a nested
  // instance mounts already holding the failed submit, so both effects fire in
  // the same commit — the clamp sending the still-undefined tab to '0' and this
  // one to the erroring index. React runs them in declaration order, so the
  // later write is the one that survives.
  //
  // Skipped entirely while a caller controls `value`; the tab is theirs then.
  const isControlled = value !== undefined;
  useRevealOnInvalidSubmit(control, name, (errors) => {
    if (isControlled) return;
    const index = firstErroredIndex(errors);
    if (index !== null) setTab(String(index));
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className={className}>
      <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-2">
        <TabsList>
          {fields.map((f, i) => (
            <TabsTrigger key={f.id} value={String(i)}>
              {getLanguageLabel(translations, i)}
            </TabsTrigger>
          ))}
        </TabsList>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append(newTranslation())}
        >
          <Languages /> {t('translationTabs.addLanguage')}
        </Button>
      </div>

      {fields.map((f, i) => (
        <TabsContent key={f.id} value={String(i)} className="space-y-4">
          <TextField
            control={control}
            name={`${name}.${i}.language`}
            label={t('translationTabs.languageLabel')}
            placeholder={t('translationTabs.languagePlaceholder')}
          />

          {renderFields(i)}

          {fields.length > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                remove(i);
                setTab('0');
              }}
            >
              <Trash /> {t('translationTabs.removeLanguage')}
            </Button>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
