'use client';

import { useFieldArray, type UseFormReturn } from 'react-hook-form';
import { Plus } from 'lucide-react';

import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';
import { Button , DeleteButton , FormControl, FormField, FormItem , Input } from '@/shared/ui';

export function SocialLinksSection({
  form,
}: {
  form: UseFormReturn<UserProfileFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'socialLinks',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Social Links</h3>
          <p className="text-sm text-muted-foreground">
            Add your social profiles
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            append({
              platform: '',
              url: '',
              sortOrder: fields.length,
            })
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Link
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="rounded-lg border py-8 text-center">
            <p className="mb-3 text-sm text-muted-foreground">
              No social links yet
            </p>
            <Button
              onClick={() => append({ platform: '', url: '', sortOrder: 0 })}
            >
              Add your first link
            </Button>
          </div>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-center gap-3 rounded-lg border bg-background/50 p-3"
          >
            {/* Platform */}
            <div className="w-32">
              <FormField
                control={form.control}
                name={`socialLinks.${index}.platform`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input placeholder="GitHub" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* URL */}
            <div className="flex-1">
              <FormField
                control={form.control}
                name={`socialLinks.${index}.url`}
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Remove */}
            <DeleteButton
              onClick={() => {
                if (confirm('Remove this link?')) remove(index);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
