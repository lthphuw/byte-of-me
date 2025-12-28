'use client';

import { useState } from 'react';
import { Pencil, Search, Trash2 } from 'lucide-react';

import {
  addTechStack,
  deleteTechStack,
  updateTechStack,
} from '@/lib/actions/tech-stack';
import { FileHelper } from '@/lib/core/file-helper';
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
import { TechStack } from '@repo/db/generated/prisma/client';

export function TechStackManager({
  initialTechStacks,
}: {
  initialTechStacks: TechStack[];
}) {
  const { toast } = useToast();
  const [techStacks, setTechStacks] = useState<TechStack[]>(initialTechStacks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTechStack, setSelectedTechStack] = useState<TechStack | null>(
    null
  );
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    group: '',
    logo: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const filteredTechStacks = techStacks.filter(
    (tech) =>
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.group.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setSelectedTechStack(null);
    setIsAdding(false);
    setFormData({
      slug: '',
      name: '',
      group: '',
      logo: '',
    });
    setLogoFile(null);
  };

  const handleSubmit = async () => {
    try {
      let logoBase64 = formData.logo;
      if (logoFile) {
        logoBase64 = await FileHelper.fileToBase64(logoFile);
      }

      const data = {
        slug: formData.slug,
        name: formData.name,
        group: formData.group,
        logo: logoBase64 || null,
      };

      let updatedTech;
      if (selectedTechStack) {
        updatedTech = await updateTechStack({
          id: selectedTechStack.id,
          ...data,
        });
      } else {
        updatedTech = await addTechStack(data);
      }

      if (updatedTech) {
        const updatedList = selectedTechStack
          ? techStacks.map((tech) =>
              tech.id === selectedTechStack.id ? updatedTech : tech
            )
          : [...techStacks, updatedTech];

        setTechStacks(updatedList);
        toast({
          title: 'Success',
          description: `Tech stack ${
            selectedTechStack ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
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
      const success = await deleteTechStack(deleteConfirmId);
      if (success) {
        setTechStacks(techStacks.filter((tech) => tech.id !== deleteConfirmId));
        toast({
          title: 'Success',
          description: 'Tech stack deleted successfully',
        });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete tech stack',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  const openEditDialog = (techStack: TechStack) => {
    setSelectedTechStack(techStack);
    setFormData({
      slug: techStack.slug,
      name: techStack.name,
      group: techStack.group,
      logo: techStack.logo || '',
    });
    setLogoFile(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
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
        <Button onClick={openAddDialog}>Add New Tech Stack</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Group</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTechStacks.map((tech) => (
              <TableRow key={tech.id}>
                <TableCell>
                  {tech.logo ? (
                    <img
                      src={tech.logo}
                      alt={tech.name}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{tech.slug}</TableCell>
                <TableCell>{tech.name}</TableCell>
                <TableCell>{tech.group}</TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(tech)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(tech.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredTechStacks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  No tech stacks found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={!!selectedTechStack || isAdding} onOpenChange={resetForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTechStack ? 'Edit' : 'Add'} Tech Stack
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group">Group</Label>
              <Input
                id="group"
                name="group"
                value={formData.group}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />
              {formData.logo && (
                <img
                  src={formData.logo}
                  alt="Logo Preview"
                  className="w-16 h-16 object-contain"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this tech stack? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
