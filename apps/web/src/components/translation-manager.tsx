'use client';

import { useState } from 'react';
import { Translation } from '@repo/db/generated/prisma/client';
import { Pencil, Search, Trash2 } from 'lucide-react';

import {
  addTranslation,
  deleteTranslation,
  updateTranslation,
} from '@/lib/actions/translation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';

export function TranslationManager({
  initialTranslations,
}: {
  initialTranslations: Translation[];
}) {
  const { toast } = useToast();
  const [translations, setTranslations] =
    useState<Translation[]>(initialTranslations);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTranslation, setSelectedTranslation] =
    useState<Translation | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sourceText: '',
    translated: '',
    language: 'vi',
    resourceType: '',
    resourceId: '',
  });

  const filteredTranslations = translations.filter(
    (trans) =>
      trans.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trans.translated.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (value: string) => {
    setFormData({ ...formData, language: value });
  };

  const resetForm = () => {
    setSelectedTranslation(null);
    setIsAdding(false);
    setFormData({
      sourceText: '',
      translated: '',
      language: 'vi',
      resourceType: '',
      resourceId: '',
    });
  };

  const handleSubmit = async () => {
    try {
      const data = {
        sourceText: formData.sourceText,
        translated: formData.translated,
        language: formData.language,
        resourceType: formData.resourceType || null,
        resourceId: formData.resourceId || null,
      };

      let updatedTrans;
      if (selectedTranslation) {
        updatedTrans = await updateTranslation({
          id: selectedTranslation.id,
          ...data,
        });
      } else {
        updatedTrans = await addTranslation(data);
      }

      if (updatedTrans) {
        const updatedList = selectedTranslation
          ? translations.map((trans) =>
              trans.id === selectedTranslation.id ? updatedTrans : trans
            )
          : [...translations, updatedTrans];

        setTranslations(updatedList);
        toast({
          title: 'Success',
          description: `Translation ${
            selectedTranslation ? 'updated' : 'added'
          } successfully`,
        });
        resetForm();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save translation',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const success = await deleteTranslation(deleteConfirmId);
      if (success) {
        setTranslations(
          translations.filter((trans) => trans.id !== deleteConfirmId)
        );
        toast({
          title: 'Success',
          description: 'Translation deleted successfully',
        });
        setDeleteConfirmId(null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete translation',
        variant: 'destructive',
      });
      setDeleteConfirmId(null);
    }
  };

  const openEditDialog = (translation: Translation) => {
    setSelectedTranslation(translation);
    setFormData({
      sourceText: translation.sourceText,
      translated: translation.translated,
      language: translation.language,
      resourceType: translation.resourceType || '',
      resourceId: translation.resourceId || '',
    });
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
            placeholder="Search by source text or translated text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openAddDialog}>Add New Translation</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source Text</TableHead>
              <TableHead>Translated</TableHead>
              <TableHead>Language</TableHead>
              <TableHead>Resource Type</TableHead>
              <TableHead>Resource ID</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTranslations.map((trans) => (
              <TableRow key={trans.id}>
                <TableCell className="truncate max-w-xs">
                  {trans.sourceText}
                </TableCell>
                <TableCell className="truncate max-w-xs">
                  {trans.translated}
                </TableCell>
                <TableCell>{trans.language.toUpperCase()}</TableCell>
                <TableCell>{trans.resourceType || '-'}</TableCell>
                <TableCell>{trans.resourceId || '-'}</TableCell>
                <TableCell>
                  {new Date(trans.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(trans)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmId(trans.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredTranslations.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No translations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={!!selectedTranslation || isAdding} onOpenChange={resetForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTranslation ? 'Edit' : 'Add'} Translation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sourceText">Source Text</Label>
              <Input
                id="sourceText"
                name="sourceText"
                value={formData.sourceText}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="translated">Translated</Label>
              <Input
                id="translated"
                name="translated"
                value={formData.translated}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={formData.language}
                onValueChange={handleSelectChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Vietnamese</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  {/* Add more languages as needed */}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resourceType">Resource Type (optional)</Label>
              <Input
                id="resourceType"
                name="resourceType"
                value={formData.resourceType}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resourceId">Resource ID (optional)</Label>
              <Input
                id="resourceId"
                name="resourceId"
                value={formData.resourceId}
                onChange={handleInputChange}
              />
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
              Are you sure you want to delete this translation? This action
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
