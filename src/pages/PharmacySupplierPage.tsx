import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Loader2, Search, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface InventoryItem {
    id: string; // This is the inventory ID
    item_id: string;
    stock: number;
    sale_price: number;
    pharmacy_items: {
        name: string;
        pack_size: string | null;
    };
}

const PharmacySupplierPage = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [newMedicineData, setNewMedicineData] = useState({
        name: '',
        stock: 0,
        sale_price: 0
    });

    const [formData, setFormData] = useState({
        stock: 0,
        sale_price: 0
    });

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pharmacy_inventory')
                .select(`
          id,
          item_id,
          stock,
          sale_price,
          pharmacy_items (
            name,
            pack_size
          )
        `);

            if (error) throw error;

            // Transform data to match interface
            const transformedData = (data || []).map((item: any) => ({
                id: item.id,
                item_id: item.item_id,
                stock: item.stock,
                sale_price: item.sale_price,
                pharmacy_items: item.pharmacy_items
            }));

            setInventory(transformedData);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (!editingItem) return;

            const { error } = await supabase
                .from('pharmacy_inventory')
                .update({
                    stock: formData.stock,
                    sale_price: formData.sale_price
                })
                .eq('id', editingItem.id);

            if (error) throw error;
            toast.success('Inventory updated successfully');

            setIsDialogOpen(false);
            setEditingItem(null);
            fetchInventory();
        } catch (error) {
            console.error('Error updating inventory:', error);
            toast.error('Failed to update inventory');
        }
    };

    const handleAddMedicine = async () => {
        try {
            if (!newMedicineData.name) {
                toast.error('Medicine name is required');
                return;
            }

            // 1. Create pharmacy item
            const { data: itemData, error: itemError } = await supabase
                .from('pharmacy_items')
                .insert([{
                    name: newMedicineData.name,
                    category: 'Medicines', // Default category
                    requires_prescription: false,
                    is_grouped: false
                }])
                .select()
                .single();

            if (itemError) throw itemError;

            // 2. Create inventory entry
            const { error: inventoryError } = await supabase
                .from('pharmacy_inventory')
                .insert([{
                    item_id: itemData.id,
                    stock: newMedicineData.stock,
                    sale_price: newMedicineData.sale_price
                }]);

            if (inventoryError) throw inventoryError;

            toast.success('Medicine added successfully');
            setIsAddDialogOpen(false);
            setNewMedicineData({ name: '', stock: 0, sale_price: 0 });
            fetchInventory();
        } catch (error) {
            console.error('Error adding medicine:', error);
            toast.error('Failed to add medicine');
        }
    };

    const openEditDialog = (item: InventoryItem) => {
        setEditingItem(item);
        setFormData({
            stock: item.stock,
            sale_price: item.sale_price
        });
        setIsDialogOpen(true);
    };

    const filteredInventory = inventory.filter(item =>
        item.pharmacy_items?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl font-bold">Pharmacy Supplier - Inventory</h1>
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
                        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Medicine
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Add New Medicine</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-name">Medicine Name</Label>
                                        <Input
                                            id="new-name"
                                            value={newMedicineData.name}
                                            onChange={(e) => setNewMedicineData({ ...newMedicineData, name: e.target.value })}
                                            placeholder="Enter medicine name"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-stock">Initial Stock</Label>
                                        <Input
                                            id="new-stock"
                                            type="number"
                                            value={newMedicineData.stock}
                                            onChange={(e) => setNewMedicineData({ ...newMedicineData, stock: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-price">Sale Price (₹)</Label>
                                        <Input
                                            id="new-price"
                                            type="number"
                                            value={newMedicineData.sale_price}
                                            onChange={(e) => setNewMedicineData({ ...newMedicineData, sale_price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                    <Button onClick={handleAddMedicine}>Add Medicine</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Update Inventory: {editingItem?.pharmacy_items?.name}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="stock">Stock Quantity</Label>
                                <Input
                                    id="stock"
                                    type="number"
                                    value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="sale_price">Sale Price (₹)</Label>
                                <Input
                                    id="sale_price"
                                    type="number"
                                    value={formData.sale_price}
                                    onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>Save Changes</Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {loading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Medicine Name</TableHead>
                                    <TableHead>Pack Size</TableHead>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Price (₹)</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.pharmacy_items?.name || 'Unknown Item'}</TableCell>
                                        <TableCell>{item.pharmacy_items?.pack_size || '-'}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.stock > 10 ? 'bg-green-100 text-green-800' :
                                                item.stock > 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {item.stock}
                                            </span>
                                        </TableCell>
                                        <TableCell>₹{item.sale_price}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)}>
                                                <Pencil className="w-4 h-4 mr-2" />
                                                Update
                                            </Button>
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

export default PharmacySupplierPage;
