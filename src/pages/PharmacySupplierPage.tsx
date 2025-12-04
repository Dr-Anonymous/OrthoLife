import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil, Loader2, Search, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface InventoryItem {
    item_id: string;
    stock: number;
    sale_price: number;
    original_price: number;
    discount_percentage: number;
    is_individual: boolean;
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
        pack_size: '',
        stock: 0,
        sale_price: 0,
        original_price: 0,
        discount_percentage: 0,
        is_individual: true
    });

    const [formData, setFormData] = useState({
        stock: 0,
        sale_price: 0,
        original_price: 0,
        discount_percentage: 0,
        is_individual: true
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('pharmacy_inventory')
                .select(`
          item_id,
          stock,
          sale_price,
          original_price,
          discount_percentage,
          is_individual,
          pharmacy_items (
            name,
            pack_size
          )
        `);

            if (error) throw error;

            // Transform data to match interface
            const transformedData = (data || []).map((item: any) => ({
                item_id: item.item_id,
                stock: item.stock,
                sale_price: item.sale_price,
                original_price: item.original_price,
                discount_percentage: item.discount_percentage,
                is_individual: item.is_individual,
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
                    sale_price: formData.sale_price,
                    original_price: formData.original_price,
                    discount_percentage: formData.discount_percentage,
                    is_individual: formData.is_individual
                })
                .eq('item_id', editingItem.item_id);

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
                    pack_size: newMedicineData.pack_size,
                    prescription_required: false
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
                    sale_price: newMedicineData.sale_price,
                    original_price: newMedicineData.original_price,
                    discount_percentage: newMedicineData.discount_percentage,
                    is_individual: newMedicineData.is_individual
                }]);

            if (inventoryError) throw inventoryError;

            toast.success('Medicine added successfully');
            setIsAddDialogOpen(false);
            setNewMedicineData({
                name: '',
                pack_size: '',
                stock: 0,
                sale_price: 0,
                original_price: 0,
                discount_percentage: 0,
                is_individual: true
            });
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
            sale_price: item.sale_price,
            original_price: item.original_price,
            discount_percentage: item.discount_percentage,
            is_individual: item.is_individual
        });
        setIsDialogOpen(true);
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedInventory = [...inventory].sort((a, b) => {
        if (!sortConfig) return 0;

        let aValue: any = a;
        let bValue: any = b;

        if (sortConfig.key === 'name') {
            aValue = a.pharmacy_items?.name || '';
            bValue = b.pharmacy_items?.name || '';
        } else if (sortConfig.key === 'stock') {
            aValue = a.stock;
            bValue = b.stock;
        } else if (sortConfig.key === 'price') {
            aValue = a.sale_price;
            bValue = b.sale_price;
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const filteredInventory = sortedInventory.filter(item =>
        item.pharmacy_items?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 pt-24">
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
                                        <Label htmlFor="new-pack-size">Pack Size (e.g., "10")</Label>
                                        <Input
                                            id="new-pack-size"
                                            value={newMedicineData.pack_size}
                                            onChange={(e) => setNewMedicineData({ ...newMedicineData, pack_size: e.target.value })}
                                            placeholder="Enter pack size"
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
                                        <Label htmlFor="new-original-price">Original Price (₹)</Label>
                                        <Input
                                            id="new-original-price"
                                            type="number"
                                            value={newMedicineData.original_price}
                                            onChange={(e) => {
                                                const originalPrice = parseFloat(e.target.value) || 0;
                                                const discount = newMedicineData.discount_percentage;
                                                const salePrice = discount > 0
                                                    ? Math.round(originalPrice - (originalPrice * discount / 100))
                                                    : newMedicineData.sale_price;

                                                setNewMedicineData({
                                                    ...newMedicineData,
                                                    original_price: originalPrice,
                                                    sale_price: salePrice
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-discount">Discount (%)</Label>
                                        <Input
                                            id="new-discount"
                                            type="number"
                                            value={newMedicineData.discount_percentage}
                                            onChange={(e) => {
                                                const discount = parseFloat(e.target.value) || 0;
                                                const originalPrice = newMedicineData.original_price;
                                                const salePrice = originalPrice > 0
                                                    ? Math.round(originalPrice - (originalPrice * discount / 100))
                                                    : newMedicineData.sale_price;

                                                setNewMedicineData({
                                                    ...newMedicineData,
                                                    discount_percentage: discount,
                                                    sale_price: salePrice
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-price">Sale Price (₹)</Label>
                                        <Input
                                            id="new-price"
                                            type="number"
                                            value={newMedicineData.sale_price}
                                            onChange={(e) => {
                                                const salePrice = parseFloat(e.target.value) || 0;
                                                const originalPrice = newMedicineData.original_price;
                                                const discount = originalPrice > 0
                                                    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                                                    : 0;

                                                setNewMedicineData({
                                                    ...newMedicineData,
                                                    sale_price: salePrice,
                                                    discount_percentage: discount
                                                });
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="new-is-individual"
                                            checked={newMedicineData.is_individual}
                                            onChange={(e) => setNewMedicineData({ ...newMedicineData, is_individual: e.target.checked })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="new-is-individual">Individual Sale</Label>
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
                                <Label htmlFor="original_price">Original Price (₹)</Label>
                                <Input
                                    id="original_price"
                                    type="number"
                                    value={formData.original_price}
                                    onChange={(e) => {
                                        const originalPrice = parseFloat(e.target.value) || 0;
                                        const discount = formData.discount_percentage;
                                        const salePrice = discount > 0
                                            ? Math.round(originalPrice - (originalPrice * discount / 100))
                                            : formData.sale_price;

                                        setFormData({
                                            ...formData,
                                            original_price: originalPrice,
                                            sale_price: salePrice
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="discount_percentage">Discount (%)</Label>
                                <Input
                                    id="discount_percentage"
                                    type="number"
                                    value={formData.discount_percentage}
                                    onChange={(e) => {
                                        const discount = parseFloat(e.target.value) || 0;
                                        const originalPrice = formData.original_price;
                                        const salePrice = originalPrice > 0
                                            ? Math.round(originalPrice - (originalPrice * discount / 100))
                                            : formData.sale_price;

                                        setFormData({
                                            ...formData,
                                            discount_percentage: discount,
                                            sale_price: salePrice
                                        });
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="sale_price">Sale Price (₹)</Label>
                                <Input
                                    id="sale_price"
                                    type="number"
                                    value={formData.sale_price}
                                    onChange={(e) => {
                                        const salePrice = parseFloat(e.target.value) || 0;
                                        const originalPrice = formData.original_price;
                                        const discount = originalPrice > 0
                                            ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
                                            : 0;

                                        setFormData({
                                            ...formData,
                                            sale_price: salePrice,
                                            discount_percentage: discount
                                        });
                                    }}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_individual"
                                    checked={formData.is_individual}
                                    onChange={(e) => setFormData({ ...formData, is_individual: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300"
                                />
                                <Label htmlFor="is_individual">Individual Sale</Label>
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
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-2">
                                            Medicine Name
                                            {sortConfig?.key === 'name' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                            )}
                                            {!sortConfig || sortConfig.key !== 'name' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </TableHead>
                                    <TableHead>Pack Size</TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('stock')}>
                                        <div className="flex items-center gap-2">
                                            Stock
                                            {sortConfig?.key === 'stock' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                            )}
                                            {!sortConfig || sortConfig.key !== 'stock' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </TableHead>
                                    <TableHead className="cursor-pointer" onClick={() => handleSort('price')}>
                                        <div className="flex items-center gap-2">
                                            Sale Price
                                            {sortConfig?.key === 'price' && (
                                                sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                                            )}
                                            {!sortConfig || sortConfig.key !== 'price' && <ArrowUpDown className="h-4 w-4 text-gray-400" />}
                                        </div>
                                    </TableHead>
                                    <TableHead>Original Price</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Individual Sale</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory.map((item) => (
                                    <TableRow key={item.item_id}>
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
                                        <TableCell>₹{item.original_price || '-'}</TableCell>
                                        <TableCell>{item.discount_percentage ? `${item.discount_percentage}%` : '-'}</TableCell>
                                        <TableCell>{item.is_individual ? 'Yes' : 'No'}</TableCell>
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
