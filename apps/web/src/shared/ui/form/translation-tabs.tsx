'use client';

import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import {
  type ArrayPath,
  type Control,
  type FieldArrayPathValue,
  type FieldValues,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui';
import { Languages, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { TextField } from './text-field';

import { useRevealOnInvalidSubmit } from '@/shared/hooks/use-reveal-on-invalid-submit';

/**
 * One element of the field array at `TName`. rhf 7.83's `<FieldArray>` component shadows
 * the `FieldArray` type (a named export beats a star export: TS2749), so it is rebuilt
 * from `FieldArrayPathValue`.
 */
type FieldArrayItem<
  T extends FieldValues,
  TName extends ArrayPath<T>
> = FieldArrayPathValue<T, TName> extends
  | ReadonlyArray<infer U>
  | null
  | undefined
  ? U
  : never;

export interface TranslationTabsProps<
  T extends FieldValues = FieldValues,
  TName extends ArrayPath<T> = ArrayPath<T>
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

/** The `language` of each entry, in order — all a tab label ever reads. */
function languagesOf(translations: unknown): unknown[] {
  if (!Array.isArray(translations)) return [];

  return translations.map((entry: unknown) =>
    isRecord(entry) ? entry.language : undefined
  );
}

function getLanguageLabel(language: unknown): string {
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
  TName extends ArrayPath<T>
>(props: TranslationTabsProps<T, TName>): ReactElement;
export function TranslationTabs({
  control,
  name,
  newTranslation,
  renderFields,
  className,
}: TranslationTabsProps): ReactElement {
  const t = useTranslations('dashboard.shared');
  const { fields, append, remove } = useFieldArray({ control, name });
  // The active tab, as the stringified index of the translation.
  const [tab, setTab] = useState('0');
  // Scoped (an unscoped `useWatch` deep-clones the whole form per keystroke)
  // and computed down to the languages: RHF gates a `compute` result with
  // deepEqual, so typing in a field re-renders the tab bodies only for a new label.
  const languages = useWatch({ control, name, compute: languagesOf });

  // Tabs are keyed by index, not by the field-array id: a caller can only
  // learn *which* translation failed validation from the error's array index,
  // and the ids are generated privately in here.
  useEffect(() => {
    if (fields.length === 0) return;
    const current = Number(tab);
    if (!Number.isInteger(current) || current < 0 || current >= fields.length) {
      setTab('0');
    }
  }, [fields, tab]);

  // Reveals the erroring tab (else the error sits in an unmounted tab and submit looks
  // dead). Here, not in callers: these nest, and threading errors down left three silent.
  // Declared AFTER the clamp above: both effects can fire in one commit and the later wins.
  useRevealOnInvalidSubmit(control, name, (errors) => {
    const index = firstErroredIndex(errors);
    if (index !== null) setTab(String(index));
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className={className}>
      <div className="mb-2 flex w-full flex-wrap items-center justify-between gap-2">
        <TabsList>
          {fields.map((f, i) => (
            <TabsTrigger key={f.id} value={String(i)}>
              {getLanguageLabel(languages[i])}
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
