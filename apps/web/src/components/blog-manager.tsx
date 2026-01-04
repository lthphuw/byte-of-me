'use client';

import { useState } from 'react';
import { Prisma, Tag } from '@repo/db/generated/prisma/client';
import { format } from 'date-fns';
import { EditorState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { CalendarIcon, Trash } from 'lucide-react';

import { addBlog, deleteBlog, updateBlog } from '@/lib/actions/blog';
import { blogSchema } from '@/lib/schemas/blog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { RichText } from '@/components/rich-text';
import { RichTextEditor } from '@/components/rich-text-editor';
import { SubmitButton } from '@/components/submit-button';
import { TrashButton } from '@/components/trash-button';

type Blog = Prisma.BlogGetPayload<{
  include: {
    tags: { include: { tag: true } };
    project: true;
  };
}>;

type Project = Prisma.ProjectGetPayload<{
  select: { id: true; title: true };
}>;

export function BlogManager({
  initialBlogs,
  availableProjects,
  availableTags,
}: {
  initialBlogs: Blog[];
  availableProjects: Project[];
  availableTags: Tag[];
}) {
  const { toast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>(initialBlogs);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    publishedDate: format(new Date(), 'yyyy-MM-dd'),
    projectId: '',
    tagIds: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contentState, setContentState] = useState(EditorState.createEmpty());

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'title') {
      setFormData({
        ...formData,
        title: e.target.value,
        slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
      });
    }
  };

  const handleProjectChange = (value: string) => {
    setFormData({ ...formData, projectId: value });
  };

  const handleTagChange = (id: string, checked: boolean) => {
    const updatedIds = checked
      ? [...formData.tagIds, id]
      : formData.tagIds.filter((tagId) => tagId !== id);
    setFormData({ ...formData, tagIds: updatedIds });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      const contentHTML = stateToHTML(contentState.getCurrentContent());

      const data = {
        title: formData.title,
        content: contentHTML,
        slug: formData.slug,
        publishedDate: new Date(formData.publishedDate),
        projectId: formData.projectId || null,
        tagIds: formData.tagIds,
      };
      const parsed = blogSchema.safeParse(data);

      if (!parsed.success) {
        toast({
          title: 'Validation error',
          description: parsed.error.errors[0]?.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      let updatedBlog;
      if (selectedBlog) {
        updatedBlog = await updateBlog({ id: selectedBlog.id, ...data });
      } else {
        updatedBlog = await addBlog(data);
      }

      if (updatedBlog) {
        const updatedList = selectedBlog
          ? blogs.map((blog) =>
              blog.id === selectedBlog.id ? updatedBlog : blog
            )
          : [...blogs, updatedBlog];

        setBlogs(updatedList);
        toast({
          title: 'Success',
          description: `Blog ${
            selectedBlog ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save blog',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsSubmitting(true);
      const success = await deleteBlog(deleteConfirmId);
      if (success) {
        setBlogs(blogs.filter((blog) => blog.id !== deleteConfirmId));
        toast({ title: 'Success', description: 'Blog deleted successfully' });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete blog',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (blog: Blog) => {
    setSelectedBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      publishedDate: format(new Date(blog.publishedDate), 'yyyy-MM-dd'),
      projectId: blog.projectId || '',
      tagIds: blog.tags.map((t) => t.tag.id),
    });
    setContentState(
      blog.content
        ? EditorState.createWithContent(stateFromHTML(blog.content))
        : EditorState.createEmpty()
    );
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
    setContentState(EditorState.createEmpty());
  };

  const resetForm = () => {
    setSelectedBlog(null);
    setIsAdding(false);
    setFormData({
      title: '',
      slug: '',
      publishedDate: format(new Date(), 'yyyy-MM-dd'),
      projectId: '',
      tagIds: [],
    });
    setContentState(EditorState.createEmpty());
  };

  return (
    <div className="space-y-6">
      <Button onClick={openAddDialog}>Add New Blog</Button>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {blogs.map((blog) => (
          <Card
            key={blog.id}
            className="overflow-hidden cursor-pointer relative"
            onClick={() => openEditDialog(blog)}
          >
            <CardHeader>
              <CardTitle>{blog.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <RichText
                className="text-sm truncate line-clamp-3"
                html={blog.content}
              />

              <Separator className="my-4" />
              <p className="text-sm">Slug: {blog.slug}</p>
              <p className="text-sm">
                Published: {format(new Date(blog.publishedDate), 'PPP')}
              </p>
              <p className="text-sm">
                Tags: {blog.tags.map((t) => t.tag.name).join(', ')}
              </p>
            </CardContent>

            <TrashButton
              className="absolute top-2 right-2"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmId(blog.id);
              }}
            />
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedBlog || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBlog ? 'Edit' : 'Add'} Blog</DialogTitle>
          </DialogHeader>
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                editorState={contentState}
                onChange={setContentState}
                placeholder="Enter content..."
              />
            </div>
            <div className="space-y-2">
              <Label>Published Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.publishedDate ? (
                      format(new Date(formData.publishedDate), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={new Date(formData.publishedDate)}
                    onSelect={(date) =>
                      setFormData({
                        ...formData,
                        publishedDate: date ? format(date, 'yyyy-MM-dd') : '',
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Project (optional)</Label>
              <Select
                value={formData.projectId}
                onValueChange={handleProjectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="grid grid-cols-3 gap-2">
                {availableTags.map((tag) => (
                  <div key={tag.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={formData.tagIds.includes(tag.id)}
                      onCheckedChange={(checked) =>
                        handleTagChange(tag.id, checked as boolean)
                      }
                    />
                    <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <SubmitButton loading={isSubmitting} onClick={handleSubmit}>Save</SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this blog? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <SubmitButton loading={isSubmitting} variant="destructive" onClick={handleDelete}>
              Delete
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
