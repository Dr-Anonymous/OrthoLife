import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SizeVariant {
  id: string;
  size: string;
  stockCount: number;
  originalName: string;
}

interface Medicine {
  id:string;
  name: string;
  price: number;
  stockCount: number;
  isGrouped?: boolean;
  sizes?: SizeVariant[];
}

const StockManagementPage = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [editState, setEditState] = useState<{ [key: string]: { price?: number; stockCount?: number } }>({});

  const fetchAllMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-medicines', {
        body: { fetchAll: true, search: '' },
      });

      if (error) {
        throw new Error('Failed to load medicines');
      }

      setMedicines(data?.medicines || []);
    } catch (err) {
      setError('Failed to load medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMedicines();
  }, [fetchAllMedicines]);

  const handleInputChange = (id: string, field: 'price' | 'stockCount', value: string) => {
    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
      setEditState(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          [field]: numericValue,
        },
      }));
    }
  };

  const handleSaveChanges = async (id: string, parentId?: string) => {
    const medicineToUpdate = editState[id];
    if (!medicineToUpdate) return;

    const updatePayload: { id: string; price?: number; stock_count?: number; parentId?: string } = { id };
    if (medicineToUpdate.price !== undefined) {
      updatePayload.price = medicineToUpdate.price;
    }
    if (medicineToUpdate.stockCount !== undefined) {
      updatePayload.stock_count = medicineToUpdate.stockCount;
    }
    if (parentId) {
      updatePayload.parentId = parentId;
    }

    try {
      const { error } = await supabase.functions.invoke('update-medicine', {
        body: updatePayload,
      });

      if (error) {
        throw new Error('Failed to update medicine');
      }

      toast({
        title: 'Success',
        description: 'Medicine updated successfully.',
      });

      // Refresh data
      fetchAllMedicines();

    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update medicine. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Stock Management</h1>
        {loading && <p>Loading...</p>}
        {error && <p className="text-destructive">{error}</p>}
        {!loading && medicines.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock Count</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map(medicine => (
                <React.Fragment key={medicine.id}>
                  <TableRow>
                    <TableCell>{medicine.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editState[medicine.id]?.price ?? medicine.price}
                        onChange={(e) => handleInputChange(medicine.id, 'price', e.target.value)}
                        disabled={medicine.isGrouped}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editState[medicine.id]?.stockCount ?? medicine.stockCount}
                        onChange={(e) => handleInputChange(medicine.id, 'stockCount', e.target.value)}
                        disabled={medicine.isGrouped}
                      />
                    </TableCell>
                    <TableCell>
                      <Button onClick={() => handleSaveChanges(medicine.id)} disabled={medicine.isGrouped}>Save</Button>
                    </TableCell>
                  </TableRow>
                  {medicine.isGrouped && medicine.sizes && medicine.sizes.map(variant => (
                    <TableRow key={variant.id} className="bg-muted/50">
                      <TableCell className="pl-10">{variant.originalName}</TableCell>
                      <TableCell>
                         <Input
                            type="number"
                            value={0} // Price for variants not available directly
                            disabled
                          />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editState[variant.id]?.stockCount ?? variant.stockCount}
                          onChange={(e) => handleInputChange(variant.id, 'stockCount', e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button onClick={() => handleSaveChanges(variant.id, medicine.id)}>Save</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        ) : (
          !loading && <p>No medicines found.</p>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StockManagementPage;
