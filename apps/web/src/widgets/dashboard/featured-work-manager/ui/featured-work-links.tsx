import { useId } from 'react';
import { type Control, useFieldArray, useFormState } from 'react-hook-form';
import {
  FEATURED_WORK_LINKS_MAX,
  type FeaturedWorkFormValues,
} from '@byte-of-me/contracts/featured-work';
import { Button, FormField, FormItem } from '@byte-of-me/ui';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { AddButton, FieldMessage, TextField } from '@/shared/ui';

/**
 * The proof links of one featured work, in the order they are listed. Each row is a url and
 * a tag; the buttons move a row up or down, or remove it. The list is capped at six.
 */
export function FeaturedWorkLinks({
  control,
}: {
  control: Control<FeaturedWorkFormValues>;
}) {
  const t = useTranslations('dashboard.featuredWorks');
  const headingId = useId();
  // `fieldKey`, not the default `id`: a stored link's own id must not be overwritten.
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'links',
    keyName: 'fieldKey',
  });
  const atMax = fields.length >= FEATURED_WORK_LINKS_MAX;
  // An error on the whole list (a duplicate, too many) sits on `root`, not on a row.
  const { errors } = useFormState({ control, name: 'links' });
  const listError = errors.links?.root?.message ?? errors.links?.message;

  return (
    <FormField
      control={control}
      name="links"
      render={() => (
        <FormItem role="group" aria-labelledby={headingId}>
          <div className="flex items-baseline justify-between gap-3">
            <p id={headingId} className="text-sm font-medium leading-none">
              {t('linksLabel')}
            </p>
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('linkCount', { count: fields.length })}
            </span>
          </div>

          {fields.map((field, index) => {
            const position = index + 1;
            return (
              <div
                key={field.fieldKey}
                className="grid gap-3 rounded-md border p-3"
              >
                <TextField
                  control={control}
                  name={`links.${index}.url`}
                  label={t('urlLabel')}
                  placeholder={t('urlPlaceholder')}
                />
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      control={control}
                      name={`links.${index}.label`}
                      label={t('linkLabelLabel')}
                      placeholder={t('linkLabelPlaceholder')}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('moveLinkUp', { position })}
                    aria-disabled={index === 0}
                    onClick={() => {
                      if (index > 0) move(index, index - 1);
                    }}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('moveLinkDown', { position })}
                    aria-disabled={index === fields.length - 1}
                    onClick={() => {
                      if (index < fields.length - 1) move(index, index + 1);
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={t('removeLink', { position })}
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <AddButton
            label={t('addLink')}
            onClick={() => append({ url: '', label: '' })}
            variant="outline"
            size="default"
            disabled={atMax}
            className="w-full sm:w-auto"
          />

          <FieldMessage message={listError} />
        </FormItem>
      )}
    />
  );
}
