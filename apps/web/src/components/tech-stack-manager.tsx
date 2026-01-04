'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { TechStack } from '@repo/db/generated/prisma/client';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

import {
  addTechStack,
  deleteTechStack,
  updateTechStack,
} from '@/lib/actions/tech-stack';
import { FileHelper } from '@/lib/core/file-helper';
import { TechStackForm, techStackSchema } from '@/lib/schemas/tech-stack';
import { Button } from '@/components/ui/button';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { SubmitButton } from '@/components/submit-button';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: TechStack[];
}) {
  const { toast } = useToast();

  const [techStacks, setTechStacks] = useState(initialTechStacks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechStack, setSelectedTechStack] = useState<TechStack | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<TechStackForm>({
    resolver: zodResolver(techStackSchema),
    defaultValues: {
      slug: '',
      name: '',
      group: '',
      logo: null,
    },
  });

  const filteredTechStacks = techStacks.filter(
    (tech) =>
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAddDialog = () => {
    setSelectedTechStack(null);
    reset();
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tech: TechStack) => {
    setSelectedTechStack(tech);
    reset({
      slug: tech.slug,
      name: tech.name,
      group: tech.group,
      logo: tech.logo,
    });
    setLogoFile(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setSelectedTechStack(null);
    reset();
    setLogoFile(null);
  };
  const onSubmit = async (values: TechStackForm) => {
    try {
      let logoBase64 = values.logo;

      if (logoFile) {
        logoBase64 = await FileHelper.fileToBase64(logoFile);
      }

      const payload = {
        ...values,
        logo: logoBase64 || null,
      };

      const updatedTech = selectedTechStack
        ? await updateTechStack({
            id: selectedTechStack.id,
            ...payload,
          })
        : await addTechStack(payload);

      setTechStacks((prev) =>
        updatedTech
          ? selectedTechStack
            ? prev.map((t) => (t.id === updatedTech.id ? updatedTech : t))
            : [...prev, updatedTech]
          : prev
      );

      toast({
        title: 'Success',
        description: `Tech stack ${
          selectedTechStack ? 'updated' : 'added'
        } successfully`,
      });

      closeDialog();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save tech stack',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteTechStack(deleteConfirmId);
      setTechStacks((prev) => prev.filter((t) => t.id !== deleteConfirmId));
      toast({
        title: 'Deleted',
        description: 'Tech stack deleted successfully',
      });
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openAddDialog}>Add Tech</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="w-[90px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechStacks.map((tech) => (
              <TableRow key={tech.id}>
                <TableCell>
                  {tech.logo ? (
                    <img src={tech.logo} className="h-6 w-6" />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{tech.slug}</TableCell>
                <TableCell>{tech.name}</TableCell>
                <TableCell>{tech.group}</TableCell>
                <TableCell className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(tech)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteConfirmId(tech.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <fieldset disabled={isSubmitting} className="space-y-4">
              <DialogHeader>
                <DialogTitle>
                  {selectedTechStack ? 'Edit' : 'Add'} Tech Stack
                </DialogTitle>
              </DialogHeader>

              {['slug', 'name', 'group'].map((field) => (
                <div key={field} className="space-y-1">
                  <Label>{field}</Label>
                  <Input {...register(field as any)} />
                  {errors[field as keyof typeof errors] && (
                    <p className="text-xs text-destructive">
                      {errors[field as keyof typeof errors]?.message}
                    </p>
                  )}
                </div>
              ))}

              <div className="space-y-1">
                <Label>Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <SubmitButton loading={isSubmitting}>Save</SubmitButton>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <SubmitButton
              loading={false}
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
