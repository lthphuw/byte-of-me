'use client';

import { useEffect, useState } from 'react';
import { Translation } from '@repo/db/generated/prisma/client';
import { EditorState } from 'draft-js';
import { stateToHTML } from 'draft-js-export-html';
import { stateFromHTML } from 'draft-js-import-html';
import { Pencil, Search, Trash2 } from 'lucide-react';

import { languageNames } from '@/config/language';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/components/rich-text-editor';

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
  const [editorModeSource, setEditorModeSource] = useState<string>('text');
  const [editorStateSource, setEditorStateSource] = useState(() =>
    EditorState.createEmpty()
  );
  const [editorModeTranslated, setEditorModeTranslated] =
    useState<string>('text');
  const [editorStateTranslated, setEditorStateTranslated] = useState(() =>
    EditorState.createEmpty()
  );
  const [formData, setFormData] = useState({
    sourceText: '',
    translated: '',
    language: 'vi',
    resourceType: '',
    resourceId: '',
  });

  const filteredTranslations = translations.filter(
    (t) =>
      t.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.translated.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setSelectedTranslation(null);
    setIsAdding(false);
    setEditorModeSource('text');
    setEditorStateSource(EditorState.createEmpty());
    setEditorModeTranslated('text');
    setEditorStateTranslated(EditorState.createEmpty());
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
      const result = selectedTranslation
        ? await updateTranslation({ id: selectedTranslation.id, ...data })
        : await addTranslation(data);
      if (!result) return;
      setTranslations((prev) =>
        selectedTranslation
          ? prev.map((t) => (t.id === result.id ? result : t))
          : [...prev, result]
      );
      toast({
        title: 'Success',
        description: selectedTranslation
          ? 'Translation updated'
          : 'Translation added',
      });
      resetForm();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save translation',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const success = await deleteTranslation(deleteConfirmId);
    if (success) {
      setTranslations((prev) => prev.filter((t) => t.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const determineMode = (text: string) => {
    return /<(b|i|u|strong|em|p|br|span)[^>]*>/i.test(text) ? 'rich' : 'text';
  };

  const openEditDialog = (t: Translation) => {
    setSelectedTranslation(t);
    setFormData({
      sourceText: t.sourceText,
      translated: t.translated,
      language: t.language,
      resourceType: t.resourceType || '',
      resourceId: t.resourceId || '',
    });

    const sourceMode = determineMode(t.sourceText);
    setEditorModeSource(sourceMode);
    if (sourceMode === 'rich') {
      const contentState = stateFromHTML(t.sourceText);
      setEditorStateSource(EditorState.createWithContent(contentState));
    } else {
      setEditorStateSource(EditorState.createEmpty());
    }

    const translatedMode = determineMode(t.translated);
    setEditorModeTranslated(translatedMode);
    if (translatedMode === 'rich') {
      const contentState = stateFromHTML(t.translated);
      setEditorStateTranslated(EditorState.createWithContent(contentState));
    } else {
      setEditorStateTranslated(EditorState.createEmpty());
    }
  };

  const handleEditorModeSourceChange = (v: string) => {
    if (v === 'rich' && editorModeSource === 'text') {
      const contentState = stateFromHTML(formData.sourceText);
      setEditorStateSource(EditorState.createWithContent(contentState));
    }
    setEditorModeSource(v);
  };

  const handleEditorModeTranslatedChange = (v: string) => {
    if (v === 'rich' && editorModeTranslated === 'text') {
      const contentState = stateFromHTML(formData.translated);
      setEditorStateTranslated(EditorState.createWithContent(contentState));
    }
    setEditorModeTranslated(v);
  };

  useEffect(() => {
    if (editorModeSource === 'rich') {
      const html = stateToHTML(editorStateSource.getCurrentContent());
      setFormData((prev) => ({ ...prev, sourceText: html }));
    }
  }, [editorStateSource, editorModeSource]);

  useEffect(() => {
    if (editorModeTranslated === 'rich') {
      const html = stateToHTML(editorStateTranslated.getCurrentContent());
      setFormData((prev) => ({ ...prev, translated: html }));
    }
  }, [editorStateTranslated, editorModeTranslated]);

  const stripTags = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-10"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAdding(true)}>Add</Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Translated</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTranslations.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="truncate max-w-xs">
                  {stripTags(t.sourceText)}
                </TableCell>
                <TableCell className="truncate max-w-xs">
                  {stripTags(t.translated)}
                </TableCell>
                <TableCell>{t.language.toUpperCase()}</TableCell>
                <TableCell>
                  {new Date(t.updatedAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEditDialog(t)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteConfirmId(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Add / Edit */}
      <Dialog open={!!selectedTranslation || isAdding} onOpenChange={resetForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTranslation ? 'Edit' : 'Add'} Translation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Tabs
              value={editorModeSource}
              onValueChange={handleEditorModeSourceChange}
            >
              <div className="flex justify-between items-center">
                <Label>Source Text</Label>
                <TabsList>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="rich">Rich text</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="text">
                <Input
                  value={formData.sourceText}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceText: e.target.value })
                  }
                />
              </TabsContent>
              <TabsContent value="rich">
                <RichTextEditor
                  editorState={editorStateSource}
                  onChange={setEditorStateSource}
                />
              </TabsContent>
            </Tabs>
            <Tabs
              value={editorModeTranslated}
              onValueChange={handleEditorModeTranslatedChange}
            >
              <div className="flex justify-between items-center">
                <Label>Translated</Label>
                <TabsList>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="rich">Rich text</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="text">
                <Input
                  value={formData.translated}
                  onChange={(e) =>
                    setFormData({ ...formData, translated: e.target.value })
                  }
                />
              </TabsContent>
              <TabsContent value="rich">
                <RichTextEditor
                  editorState={editorStateTranslated}
                  onChange={setEditorStateTranslated}
                />
              </TabsContent>
            </Tabs>
            <div>
              <Label>Language</Label>
              <Select
                value={formData.language}
                onValueChange={(v) => setFormData({ ...formData, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(languageNames).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
      {/* Delete */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm delete</DialogTitle>
            <DialogDescription>This action cannot be undone</DialogDescription>
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
