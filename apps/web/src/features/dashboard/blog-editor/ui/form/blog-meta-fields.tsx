'use client';

import type { Control } from 'react-hook-form';
import {
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Loading,
  MultiSelect,
  type Option,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@byte-of-me/ui';

import type { BlogFormValues } from '@/entities/blog/model/blog-schema';
import type { AdminProject } from '@/entities/project/model';
import { MediaSelect } from '@/features/dashboard/media-library/ui/media-select';
import { TextField } from '@/shared/ui';

interface BlogMetaFieldsProps {
  control: Control<BlogFormValues>;
  projects: AdminProject[];
  tagOptions: Option[];
  isProjectLoading: boolean;
  isTagLoading: boolean;
}

/** Everything above the translation tabs: slug, relations, flags, cover. */
export function BlogMetaFields({
  control,
  projects,
  tagOptions,
  isProjectLoading,
  isTagLoading,
}: BlogMetaFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <TextField
          control={control}
          name="slug"
          label="Slug"
          placeholder="my-awesome-blog"
        />

        <FormField
          control={control}
          name="projectId"
          render={({ field }) =>
            isProjectLoading ? (
              <Loading />
            ) : (
              <FormItem>
                <FormLabel>Related Project</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a projectSchema (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>

                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.translations?.[0]?.title || project.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }
        />

        <FormField
          control={control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Published</FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <FormField
          control={control}
          name="coverImageId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cover Image</FormLabel>
              <FormControl>
                <MediaSelect
                  value={field.value ?? undefined}
                  onChange={(media) => field.onChange(media?.id)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tagIds"
          render={({ field }) =>
            isTagLoading ? (
              <Loading />
            ) : (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={tagOptions}
                    selected={field.value || []}
                    onValueChange={field.onChange}
                    placeholder="Select tags..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )
          }
        />
      </div>
    </div>
  );
}
