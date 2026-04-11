import { ProfileFormValues } from '@/entities/user-profile/schemas/user-profile';
import { Button } from '@/shared/ui/button';
import { FormControl, FormField, FormItem } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { UseFormReturn, useFieldArray } from 'react-hook-form';

export function SocialLinksSection({
  form,
}: {
  form: UseFormReturn<ProfileFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'socialLinks',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
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
          <Plus className="w-4 h-4 mr-1" />
          Add Link
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="text-center border rounded-lg py-8">
            <p className="text-sm text-muted-foreground mb-3">
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
            className="flex items-center gap-3 border rounded-lg p-3 bg-background/50"
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm('Remove this link?')) remove(index);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
