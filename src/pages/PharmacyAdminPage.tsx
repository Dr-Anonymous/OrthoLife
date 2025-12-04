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
import { Pencil, Trash2, Plus, Loader2, Search } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface PharmacyItem {
    id: string;
    name: string;
    description: string | null;
    category: string;
    prescription_required: boolean;
    pack_size: string | null;
    created_at: string;
}

const getCategoryAbbreviation = (category: string) => {
    switch (category) {
        case 'Tablet': return 'Tab.';
        case 'Capsule': return 'Cap.';
        case 'Syrup': return 'Syp.';
        case 'Injection': return 'Inj.';
        case 'Brace': return 'Brace';
        case 'Applicant': return 'App.';
        default: return category;
    }
};

const PharmacyAdminPage = () => {
    const [items, setItems] = useState<PharmacyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PharmacyItem | null>(null);
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [formData, setFormData] = useState<Partial<PharmacyItem>>({
        name: '',
        description: '',
        category: 'Tablet',
        prescription_required: false,
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
                .order('created_at', { ascending: false });

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
                category: isCustomCategory ? customCategory : formData.category,
                prescription_required: formData.prescription_required,
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
                const { data: newItem, error: itemError } = await supabase
                    .from('pharmacy_items')
                    .insert([itemData])
                    .select()
                    .single();

                if (itemError) throw itemError;

                // Create corresponding inventory entry
                const { error: inventoryError } = await supabase
                    .from('pharmacy_inventory')
                    .insert([{
                        item_id: newItem.id,
                        stock: 0,
                        sale_price: 0,
                        original_price: 0,
                        discount_percentage: 0,
                        is_individual: true
                    }]);

                if (inventoryError) {
                    console.error('Error creating inventory:', inventoryError);
                    // Optional: Delete the item if inventory creation fails
                    toast.error('Item created but inventory init failed');
                } else {
                    toast.success('Item added successfully');
                }
            }

            setIsDialogOpen(false);
            setEditingItem(null);
            setFormData({
                name: '',
                description: '',
                category: 'Tablet',
                prescription_required: false,
                pack_size: ''
            });
            setIsCustomCategory(false);
            setCustomCategory('');
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
        if (!['Tablet', 'Capsule', 'Syrup', 'Applicant', 'Brace', 'Injection'].includes(item.category)) {
            setIsCustomCategory(true);
            setCustomCategory(item.category);
            setFormData({ ...item, category: 'Other' });
        } else {
            setIsCustomCategory(false);
            setCustomCategory('');
        }
        setIsDialogOpen(true);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 pt-24">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold">Pharmacy Admin - Medicines</h1>
                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-grow md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search medicines..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => {
                                    setEditingItem(null);
                                    setFormData({
                                        name: '',
                                        description: '',
                                        category: 'Tablet',
                                        prescription_required: false,
                                        pack_size: ''
                                    });
                                    setIsCustomCategory(false);
                                    setCustomCategory('');
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
                                        <Label htmlFor="category">Category</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(value) => {
                                                if (value === 'Other') {
                                                    setIsCustomCategory(true);
                                                    setFormData({ ...formData, category: value });
                                                } else {
                                                    setIsCustomCategory(false);
                                                    setFormData({ ...formData, category: value });
                                                }
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Tablet">Tablet</SelectItem>
                                                <SelectItem value="Capsule">Capsule</SelectItem>
                                                <SelectItem value="Syrup">Syrup</SelectItem>
                                                <SelectItem value="Applicant">Applicant</SelectItem>
                                                <SelectItem value="Brace">Brace</SelectItem>
                                                <SelectItem value="Injection">Injection</SelectItem>
                                                <SelectItem value="Other">Other (Custom)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {isCustomCategory && (
                                            <Input
                                                className="mt-2"
                                                placeholder="Enter custom category"
                                                value={customCategory}
                                                onChange={(e) => setCustomCategory(e.target.value)}
                                            />
                                        )}
                                    </div>
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
                                            id="prescription_required"
                                            checked={formData.prescription_required}
                                            onChange={(e) => setFormData({ ...formData, prescription_required: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="prescription_required">Requires Prescription</Label>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleSave}>Save</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {
                    loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Pack Size</TableHead>
                                        <TableHead>Rx Required</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">
                                                <span className="text-muted-foreground mr-1">{getCategoryAbbreviation(item.category)}</span>
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="max-w-xs truncate" title={item.description || ''}>{item.description || '-'}</TableCell>
                                            <TableCell>{item.pack_size || '-'}</TableCell>
                                            <TableCell>{item.prescription_required ? 'Yes' : 'No'}</TableCell>
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
                    )
                }
            </main >
            <Footer />
        </div >
    );
};

export default PharmacyAdminPage;
