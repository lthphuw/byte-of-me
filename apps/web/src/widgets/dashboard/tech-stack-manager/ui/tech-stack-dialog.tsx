'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import type { AdminTechStack } from '@/entities/tech-stack';
import {
  type TechStackFormValues,
  techStackSchema,
} from '@/entities/tech-stack/schemas/tech-stack';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { SubmitButton } from '@/shared/ui/submit-button';

export function TechStackDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData: AdminTechStack | null;
  onSubmit: (values: TechStackFormValues) => Promise<void>;
  loading: boolean;
}) {
  const form = useForm<TechStackFormValues>({
    resolver: zodResolver(techStackSchema),
    defaultValues: {
      name: '',
      slug: '',
      group: '',
      logoId: null,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        slug: initialData.slug,
        group: initialData.group ?? '',
        logoId: initialData.logoId ?? null,
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        group: '',
        logoId: null,
      });
    }
  }, [initialData, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>
                {initialData ? 'Edit' : 'Add'} Tech Stack
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              {/* name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* group */}
            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* logoId */}
            <FormField
              control={form.control}
              name="logoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo</FormLabel>
                  <FormControl>
                    <MediaSelect
                      value={field.value ?? undefined}
                      onChange={(m) => field.onChange(m?.id ?? null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <SubmitButton
                loading={loading}
                disabled={!form.formState.isValid}
              >
                Save
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
