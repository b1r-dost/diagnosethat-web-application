import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RoadmapItem {
  id: string;
  title_tr: string;
  title_en: string;
  description_tr: string | null;
  description_en: string | null;
  display_order: number;
  is_active: boolean;
  icon: string | null;
}

const emptyForm = {
  title_tr: '',
  title_en: '',
  description_tr: '',
  description_en: '',
  display_order: 0,
  is_active: true,
  icon: '',
};

export function RoadmapTab() {
  const { language } = useI18n();
  const { toast } = useToast();

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const tr = language === 'tr';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      toast({
        variant: 'destructive',
        title: tr ? 'Hata' : 'Error',
        description: error.message,
      });
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: items.length + 1 });
    setShowForm(true);
  };

  const openEditForm = (item: RoadmapItem) => {
    setEditingId(item.id);
    setForm({
      title_tr: item.title_tr,
      title_en: item.title_en,
      description_tr: item.description_tr || '',
      description_en: item.description_en || '',
      display_order: item.display_order,
      is_active: item.is_active,
      icon: item.icon || '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.title_tr.trim() || !form.title_en.trim()) {
      toast({
        variant: 'destructive',
        title: tr ? 'Hata' : 'Error',
        description: tr
          ? 'Türkçe ve İngilizce başlık zorunludur.'
          : 'Turkish and English titles are required.',
      });
      return;
    }

    setIsSaving(true);

    const payload = {
      title_tr: form.title_tr.trim(),
      title_en: form.title_en.trim(),
      description_tr: form.description_tr.trim() || null,
      description_en: form.description_en.trim() || null,
      display_order: Number(form.display_order),
      is_active: form.is_active,
      icon: form.icon.trim() || null,
    };

    let error;

    if (editingId) {
      ({ error } = await supabase
        .from('roadmap_items')
        .update(payload)
        .eq('id', editingId));
    } else {
      ({ error } = await supabase.from('roadmap_items').insert(payload));
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: tr ? 'Hata' : 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: tr ? 'Kaydedildi' : 'Saved',
        description: tr
          ? 'Yol haritası öğesi güncellendi.'
          : 'Roadmap item updated.',
      });
      cancelForm();
      fetchItems();
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from('roadmap_items')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast({
        variant: 'destructive',
        title: tr ? 'Hata' : 'Error',
        description: error.message,
      });
    } else {
      toast({
        title: tr ? 'Silindi' : 'Deleted',
        description: tr ? 'Öğe silindi.' : 'Item deleted.',
      });
      fetchItems();
    }
    setDeleteId(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {tr ? 'Yol Haritası Yönetimi' : 'Roadmap Management'}
          </CardTitle>
          {!showForm && (
            <Button onClick={openAddForm} size="sm">
              <Plus className="h-4 w-4" />
              {tr ? 'Yeni Öğe Ekle' : 'Add New Item'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form */}
          {showForm && (
            <Card className="border-primary/30 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-base">
                  {editingId
                    ? tr ? 'Öğeyi Düzenle' : 'Edit Item'
                    : tr ? 'Yeni Öğe Ekle' : 'Add New Item'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'Türkçe Başlık' : 'Turkish Title'} *
                    </label>
                    <Input
                      value={form.title_tr}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title_tr: e.target.value }))
                      }
                      placeholder={tr ? 'Türkçe başlık...' : 'Turkish title...'}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'İngilizce Başlık' : 'English Title'} *
                    </label>
                    <Input
                      value={form.title_en}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, title_en: e.target.value }))
                      }
                      placeholder="English title..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'Türkçe Açıklama' : 'Turkish Description'}
                    </label>
                    <Textarea
                      value={form.description_tr}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description_tr: e.target.value,
                        }))
                      }
                      placeholder={
                        tr ? 'Türkçe açıklama...' : 'Turkish description...'
                      }
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'İngilizce Açıklama' : 'English Description'}
                    </label>
                    <Textarea
                      value={form.description_en}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          description_en: e.target.value,
                        }))
                      }
                      placeholder="English description..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'Sıra Numarası' : 'Display Order'}
                    </label>
                    <Input
                      type="number"
                      value={form.display_order}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          display_order: Number(e.target.value),
                        }))
                      }
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {tr ? 'İkon (opsiyonel)' : 'Icon (optional)'}
                    </label>
                    <Input
                      value={form.icon}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, icon: e.target.value }))
                      }
                      placeholder={tr ? 'ikon adı...' : 'icon name...'}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_active"
                    checked={form.is_active}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, is_active: Boolean(checked) }))
                    }
                  />
                  <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    {tr ? 'Aktif (ana sayfada göster)' : 'Active (show on homepage)'}
                  </label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={cancelForm} disabled={isSaving}>
                    {tr ? 'İptal' : 'Cancel'}
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {tr ? 'Kaydet' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {tr
                ? 'Henüz yol haritası öğesi yok.'
                : 'No roadmap items yet.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{tr ? 'Türkçe Başlık' : 'Turkish Title'}</TableHead>
                  <TableHead>{tr ? 'İngilizce Başlık' : 'English Title'}</TableHead>
                  <TableHead className="w-24">{tr ? 'Durum' : 'Status'}</TableHead>
                  <TableHead className="w-24 text-right">{tr ? 'İşlem' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.display_order}
                    </TableCell>
                    <TableCell className="font-medium">{item.title_tr}</TableCell>
                    <TableCell className="text-muted-foreground">{item.title_en}</TableCell>
                    <TableCell>
                      {item.is_active ? (
                        <Badge variant="default">{tr ? 'Aktif' : 'Active'}</Badge>
                      ) : (
                        <Badge variant="outline">{tr ? 'Pasif' : 'Inactive'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditForm(item)}
                          title={tr ? 'Düzenle' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(item.id)}
                          title={tr ? 'Sil' : 'Delete'}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tr ? 'Öğeyi sil' : 'Delete item'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tr
                ? 'Bu yol haritası öğesi kalıcı olarak silinecek. Emin misiniz?'
                : 'This roadmap item will be permanently deleted. Are you sure?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tr ? 'İptal' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tr ? 'Evet, Sil' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
