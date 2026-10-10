import type { FieldErrors, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { keptTranslationIndexes } from './translation-values';

import {
  type FeaturedWorkFormValues,
  featuredWorkSchema,
} from '@/entities/featured-work/model/featured-work-schema';

const validate = zodResolver(featuredWorkSchema);

/**
 * Validates the schema against the form with its blank translations removed,
 * so `submit` receives exactly what the action will store. Errors come back
 * indexed by the shortened list; they are moved back onto the field that
 * produced them, or an error on `vi` would be drawn under `en`.
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
  if (!Array.isArray(byKept)) return result;

  const byForm: FieldErrors<FeaturedWorkFormValues>['translations'] = [];
  byKept.forEach((entry: unknown, i) => {
    const formIndex = kept[i];
    if (entry && formIndex !== undefined) byForm[formIndex] = entry;
  });
  // An error array only exists on a failed result, whose `values` is empty.
  return { values: {}, errors: { ...result.errors, translations: byForm } };
};
