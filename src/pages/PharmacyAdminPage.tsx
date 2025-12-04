import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PharmacyItem {
    id: string;
    name: string;
    description: string | null;
    category: string;
    image_url: string | null;
    requires_prescription: boolean;
    is_grouped: boolean;
    pack_size: string | null;
}

const PharmacyAdminPage = () => {
    const [items, setItems] = useState<PharmacyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PharmacyItem | null>(null);
    const [formData, setFormData] = useState<Partial<PharmacyItem>>({
        name: '',
        description: '',
        category: 'Medicines',
        requires_prescription: false,
        is_grouped: false,
        pack_size: ''
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pharmacy_items')
                .select('*')
                .order('name');

            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching items:', error);
            toast.error('Failed to load pharmacy items');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!formData.name) {
                toast.error('Name is required');
                return;
            }

            const itemData = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                requires_prescription: formData.requires_prescription,
                is_grouped: formData.is_grouped,
                pack_size: formData.pack_size
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('pharmacy_items')
                    .update(itemData)
                    .eq('id', editingItem.id);

                if (error) throw error;
                toast.success('Item updated successfully');
            } else {
                const { error } = await supabase
                    .from('pharmacy_items')
                    .insert([itemData]);

                if (error) throw error;
                toast.success('Item added successfully');
            }

            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                category: 'Medicines',
                requires_prescription: false,
                is_grouped: false,
                pack_size: ''
            });
            fetchItems();
        } catch (error) {
            console.error('Error saving item:', error);
            toast.error('Failed to save item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const { error } = await supabase
                .from('pharmacy_items')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Item deleted successfully');
            fetchItems();
        } catch (error) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete item');
        }
    };

    const openEditDialog = (item: PharmacyItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsDialogOpen(true);
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Pharmacy Admin - Medicines</h1>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button onClick={() => {
                                setEditingItem(null);
                                setFormData({
                                    name: '',
                                    description: '',
                                    category: 'Medicines',
                                    requires_prescription: false,
                                    is_grouped: false,
                                    pack_size: ''
                                });
                            }}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Medicine
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{editingItem ? 'Edit Medicine' : 'Add New Medicine'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Name</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="category">Category</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(value) => setFormData({ ...formData, category: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Medicines">Medicines</SelectItem>
                                            <SelectItem value="Supplements">Supplements</SelectItem>
                                            <SelectItem value="Equipment">Equipment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="pack_size">Pack Size (e.g., "10")</Label>
                                    <Input
                                        id="pack_size"
                                        value={formData.pack_size || ''}
                                        onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_grouped"
                                        checked={formData.is_grouped}
                                        onChange={(e) => setFormData({ ...formData, is_grouped: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="is_grouped">Is Grouped (Has sizes/variants)</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requires_prescription"
                                        checked={formData.requires_prescription}
                                        onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <Label htmlFor="requires_prescription">Requires Prescription</Label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSave}>Save</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Pack Size</TableHead>
                                    <TableHead>Grouped</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.category}</TableCell>
                                        <TableCell>{item.pack_size || '-'}</TableCell>
                                        <TableCell>{item.is_grouped ? 'Yes' : 'No'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                                    <Pencil className="w-4 h-4 text-blue-600" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </main>
            <Footer />
        </div>
    );
};

export default PharmacyAdminPage;
