import type { FieldErrors, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { keptTranslationIndexes } from './translation-values';

import {
  type FeaturedWorkFormValues,
  featuredWorkSchema,
} from '@/entities/featured-work/model/featured-work-schema';

const validate = zodResolver(featuredWorkSchema);

/**
 * Validates with blank translations removed so `submit` gets what the action
 * stores; errors are moved back to the form index of the field that raised them.
 */
export const featuredWorkResolver: Resolver<FeaturedWorkFormValues> = async (
  values,
  context,
  options
) => {
  const kept = keptTranslationIndexes(values.translations);
  const result = await validate(
    {
      ...values,
      translations: kept.flatMap((i) => {
        const translation = values.translations[i];
        return translation ? [translation] : [];
      }),
    },
    context,
    options
  );

  const byKept = result.errors.translations;
  const root = byKept?.root;
  if (!Array.isArray(byKept)) return result;

  const byForm: FieldErrors<FeaturedWorkFormValues>['translations'] = [];
  byKept.forEach((entry: unknown, i) => {
    const formIndex = kept[i];
    if (entry && formIndex !== undefined) byForm[formIndex] = entry;
  });
  // The array-level errors ("each language once") live on `root`, not an index.
  if (root) byForm.root = root;
  // An error array only exists on a failed result, whose `values` is empty.
  return { values: {}, errors: { ...result.errors, translations: byForm } };
};
