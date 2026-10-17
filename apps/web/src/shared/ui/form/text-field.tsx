'use client';

import type { ReactElement } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  Input,
  Textarea,
} from '@byte-of-me/ui';

import { FieldMessage } from './field-message';

interface TextFieldProps<T extends FieldValues = FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  className?: string;
}

/**
 * Standard text input field: FormField -> FormItem -> FormLabel ->
 * FormControl -> (Input | Textarea) -> FieldMessage.
 */
export function TextField<T extends FieldValues>(
  props: TextFieldProps<T>
): ReactElement;
export function TextField({
  control,
  name,
  label,
  placeholder,
  type = 'text',
  multiline = false,
  className,
}: TextFieldProps): ReactElement {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea
                placeholder={placeholder}
                {...field}
                value={field.value ?? ''}
              />
            ) : (
              <Input
                type={type}
                placeholder={placeholder}
                {...field}
                value={field.value ?? ''}
              />
            )}
          </FormControl>
          <FieldMessage />
        </FormItem>
      )}
    />
  );
}
