'use client';

import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import {
  type ArrayPath,
  type Control,
  type FieldArray,
  type FieldValues,
  useFieldArray,
  useWatch,
} from 'react-hook-form';
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from '@byte-of-me/ui';
import { Languages, Trash } from 'lucide-react';

import { TextField } from './text-field';

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
  newTranslation: () => FieldArray<T, TName>;
  /** Per-language fields rendered below the language input. */
  renderFields: (index: number) => ReactNode;
  className?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getLanguageLabel(
  values: unknown,
  name: string,
  index: number
): string {
  let current: unknown = values;
  for (const segment of `${name}.${index}.language`.split('.')) {
    if (!isRecord(current)) return '??';
    current = current[segment];
  }
  return typeof current === 'string' && current
    ? current.toUpperCase()
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
}: TranslationTabsProps): ReactElement {
  const { fields, append, remove } = useFieldArray({ control, name });
  const [tab, setTab] = useState<string>();
  const values = useWatch({ control });

  useEffect(() => {
    if (fields.length === 0) return;
    if (!tab || !fields.some((f) => f.id === tab)) {
      setTab(fields[0].id);
    }
  }, [fields, tab]);

  return (
    <Tabs value={tab} onValueChange={setTab} className={className}>
      <div className="mb-2 flex w-full justify-between align-middle">
        <TabsList>
          {fields.map((f, i) => (
            <TabsTrigger key={f.id} value={f.id}>
              {getLanguageLabel(values, name, i)}
            </TabsTrigger>
          ))}
        </TabsList>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append(newTranslation())}
        >
          <Languages /> Add Language
        </Button>
      </div>

      {fields.map((f, i) => (
        <TabsContent key={f.id} value={f.id} className="space-y-4">
          <TextField
            control={control}
            name={`${name}.${i}.language`}
            label="Language"
            placeholder="en, vi..."
          />

          {renderFields(i)}

          {fields.length > 1 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                remove(i);
                setTab(fields[i === 0 ? 1 : 0]?.id);
              }}
            >
              <Trash /> Remove Language
            </Button>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
