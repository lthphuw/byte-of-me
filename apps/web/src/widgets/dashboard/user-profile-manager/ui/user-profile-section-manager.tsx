import type { UseFormReturn } from 'react-hook-form';
import type { UserProfileFormValues } from '@/entities/user-profile/model/user-profile-schema';
import { DatePicker } from '@/shared/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel } from '@/shared/ui/form';

export function UserProfileSectionManager({
  form,
}: {
  form: UseFormReturn<UserProfileFormValues>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Common Information</h3>
        <p className="text-muted-foreground text-sm">
          General profile settings
        </p>
      </div>

      <div className="bg-background/50 rounded-xl border p-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="birthdate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Birthdate</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ? new Date(field.value) : null}
                    onChange={(date) =>
                      field.onChange(date ? date.toISOString() : null)
                    }
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
