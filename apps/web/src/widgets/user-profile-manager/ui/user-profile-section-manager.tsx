import { ProfileFormValues } from '@/entities/user-profile/schemas/user-profile';
import { DatePicker } from '@/shared/ui/date-picker';
import { FormControl, FormField, FormItem, FormLabel } from '@/shared/ui/form';
import { UseFormReturn } from 'react-hook-form';

export function UserProfileSectionManager({
  form,
}: {
  form: UseFormReturn<ProfileFormValues>;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Common Information</h3>
        <p className="text-sm text-muted-foreground">
          General profile settings
        </p>
      </div>

      <div className="border rounded-xl p-6 bg-background/50">
        <div className="grid md:grid-cols-2 gap-6">
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
