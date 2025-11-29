'use client';

import { useState } from 'react';
import { Delete, Edit, Trash } from 'lucide-react';



import { addBanner, deleteBanner, updateBanner } from '@/lib/actions/banner';
import { FileHelper } from '@/lib/core/file';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import Image from 'next/image';



interface Banner {
  id: string;
  src: string;
  caption: string;
}

export function BannerManager({ initialBanners }: { initialBanners: Banner[] }) {
  const { toast } = useToast();

  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [editingBanners, setEditingBanners] = useState<Record<string, { caption: string; file: File | null }>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({ title: 'Error', description: 'Please select a file', variant: 'destructive' });
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await FileHelper.fileToBase64(uploadFile);
      const newBanner = await addBanner({ src: base64, caption: uploadCaption });
      setBanners([...banners, newBanner]);
      toast({ title: 'Success', description: 'Banner added successfully' });
      setUploadFile(null);
      setUploadCaption('');
    } catch {
      toast({ title: 'Error', description: 'Failed to add banner', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const startEditing = (banner: Banner) => {
    setEditingBanners((prev) => ({
      ...prev,
      [banner.id]: { caption: banner.caption, file: null },
    }));
  };

  const updateEditing = (id: string, caption: string, file: File | null) => {
    setEditingBanners((prev) => ({ ...prev, [id]: { caption, file } }));
  };

  const handleSaveConfirmed = async () => {
    try {
      const updatedBanners: Banner[] = [];
      for (const [id, edit] of Object.entries(editingBanners)) {
        const original = banners.find((b) => b.id === id);
        if (!original) continue;
        let src = original.src;
        if (edit.file) src = await FileHelper.fileToBase64(edit.file);
        const updated = await updateBanner({ id, src, caption: edit.caption });
        updatedBanners.push(updated);
      }
      setBanners((prev) =>
        prev.map((b) => updatedBanners.find((u) => u.id === b.id) || b)
      );
      setEditingBanners({});
      setSelectedIds(new Set());
      toast({ title: 'Success', description: `${updatedBanners.length} banner(s) updated!` });
    } catch {
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } finally {
      setSaveDialogOpen(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteBanner(id)))
      setBanners((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
      setEditingBanners({});
      toast({ title: 'Success', description: `${selectedIds.size} selected banners deleted!` });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete banners', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload New Banner */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          <Textarea
            placeholder="Caption..."
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
          />
          <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </CardContent>
      </Card>

      {/* Banner Gallery */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => {
          const isEditing = editingBanners[banner.id];
          const isSelected = selectedIds.has(banner.id);

          return (
            <Card
              key={banner.id}
              className={`overflow-hidden relative cursor-pointer flex flex-col gap-3 border rounded-md ${
                isSelected ? 'border-destructive shadow-md' : 'border-transparent'
              }`}
            >
              <div
                className=" relative w-full h-48 object-cover"
              >
                <Image
                  src={isEditing?.file ? URL.createObjectURL(isEditing.file) : banner.src}
                  alt={banner.caption}
                  className="object-center object-cover"
                  fill
                />
              </div>

              <CardContent className="space-y-2">
                {isEditing ? (
                  <>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateEditing(banner.id, isEditing.caption, e.target.files?.[0] || null)}
                    />
                    <Textarea
                      value={isEditing.caption}
                      onChange={(e) => updateEditing(banner.id, e.target.value, isEditing.file)}
                      placeholder="Caption..."
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground truncate">{banner.caption || 'No caption'}</p>
                )}
                <div className="absolute flex gap-2 top-2 right-2">
                  {!isEditing && (
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); startEditing(banner); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {(
                    <Button size="icon" onClick={(e) => { e.stopPropagation(); toggleSelect(banner.id); }}>
                      <Trash className={`h-4 w-4 ${selectedIds.has(banner.id) && 'text-destructive' }`} />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Actions */}
      {(Object.keys(editingBanners).length > 0 || selectedIds.size > 0) && (
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => { setEditingBanners({}); setSelectedIds(new Set()); }}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} disabled={selectedIds.size === 0}>
            Delete
          </Button>
          <Button onClick={() => setSaveDialogOpen(true)} disabled={Object.keys(editingBanners).length === 0}>
            Save
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {selectedIds.size} selected banner(s)?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirmed}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Save</DialogTitle>
          </DialogHeader>
          <p>You are about to save changes to {Object.keys(editingBanners).length} banner(s). Proceed?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfirmed}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
