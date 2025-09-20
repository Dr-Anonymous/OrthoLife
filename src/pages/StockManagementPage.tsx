import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Medicine {
  id: string;
  name: string;
  price: number;
  stock_count: number;
}

const StockManagementPage = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [editState, setEditState] = useState<{ [key: string]: { price: number; stock_count: number } }>({});

  const fetchAllMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    let allMedicines: Medicine[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const { data, error } = await supabase.functions.invoke('get-medicines', {
          body: { page, search: '' },
        });

        if (error) {
          throw new Error('Failed to load medicines');
        }

        const newMedicines = data?.medicines || [];
        allMedicines = [...allMedicines, ...newMedicines];
        hasMore = newMedicines.length > 0;
        page++;

      } catch (err) {
        setError('Failed to load medicines. Please try again.');
        hasMore = false;
      }
    }
    setMedicines(allMedicines);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAllMedicines();
  }, [fetchAllMedicines]);

  const handleInputChange = (id: string, field: 'price' | 'stock_count', value: string) => {
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

  const handleSaveChanges = async (id: string) => {
    const medicineToUpdate = editState[id];
    if (!medicineToUpdate) return;

    try {
      const { error } = await supabase.functions.invoke('update-medicine', {
        body: { id, ...medicineToUpdate },
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
        {!loading && !error && (
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
                <TableRow key={medicine.id}>
                  <TableCell>{medicine.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editState[medicine.id]?.price ?? medicine.price}
                      onChange={(e) => handleInputChange(medicine.id, 'price', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editState[medicine.id]?.stock_count ?? medicine.stock_count}
                      onChange={(e) => handleInputChange(medicine.id, 'stock_count', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => handleSaveChanges(medicine.id)}>Save</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StockManagementPage;
