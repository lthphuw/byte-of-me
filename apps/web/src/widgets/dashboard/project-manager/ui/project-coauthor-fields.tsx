'use client';

import { type Control, useFieldArray } from 'react-hook-form';
import { Button } from '@byte-of-me/ui';
import { Plus, X } from 'lucide-react';

import type { ProjectFromValues } from '@/entities/project/model';
import { TextField } from '@/shared/ui';

interface ProjectCoauthorFieldsProps {
  control: Control<ProjectFromValues>;
}

/** Repeatable co-author rows for the project dialog. */
export function ProjectCoauthorFields({ control }: ProjectCoauthorFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'coauthors',
  });

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Co-authors</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => append({ fullName: '', email: '' })}
        >
          <Plus /> Add Co-author
        </Button>
      </div>

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-1 items-start gap-4 md:grid-cols-[1fr_1fr_auto]"
        >
          <TextField
            control={control}
            name={`coauthors.${index}.fullName`}
            label="Name"
            placeholder="Jane Doe"
          />
          <TextField
            control={control}
            name={`coauthors.${index}.email`}
            label="Email"
            type="email"
            placeholder="jane@example.com"
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="md:mt-8"
            onClick={() => remove(index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
