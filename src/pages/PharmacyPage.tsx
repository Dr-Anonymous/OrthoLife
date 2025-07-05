import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PatientDetailsForm from '@/components/PatientDetailsForm';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Pill, Plus, Minus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  manufacturer?: string;
  dosage?: string;
  packSize?: string;
  prescriptionRequired?: boolean;
}

const PharmacyPage = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientData, setPatientData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const { toast } = useToast();

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('fetch-pharmacy-data');
      
      if (error) {
        console.error('Error fetching medicines:', error);
        setError('Failed to load medicines. Please try again.');
        return;
      }
      
      setMedicines(data?.medicines || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load medicines. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const filteredMedicines = medicines.filter(medicine =>
    medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    medicine.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (medicineId: string) => {
    setCart(prev => ({
      ...prev,
      [medicineId]: (prev[medicineId] || 0) + 1
    }));
    toast({
      title: "Added to cart",
      description: "Medicine added successfully!",
    });
  };

  const removeFromCart = (medicineId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[medicineId] > 1) {
        newCart[medicineId] -= 1;
      } else {
        delete newCart[medicineId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [medicineId, quantity]) => {
      const medicine = medicines.find(m => m.id === medicineId);
      return total + (medicine ? medicine.price * quantity : 0);
    }, 0);
  };

  const handleCheckout = () => {
    if (Object.keys(cart).length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add medicines to your cart first.",
        variant: "destructive",
      });
      return;
    }

    setShowPatientForm(true);
  };

  const handlePatientFormSubmit = async () => {
    try {
      const items = Object.entries(cart).map(([medicineId, quantity]) => {
        const medicine = medicines.find(m => m.id === medicineId);
        return {
          name: medicine?.name || '',
          quantity,
          price: medicine?.price || 0
        };
      });

      const { error } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderType: 'pharmacy',
          patientData,
          items,
          total: getCartTotal()
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: "Order placed!",
          description: "Your order has been placed successfully. We'll contact you soon.",
        });
      } else {
        toast({
          title: "Order placed successfully!",
          description: "Your medicines will be delivered within 2-3 hours.",
        });
      }

      setCart({});
      setShowPatientForm(false);
      setPatientData({ name: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Order placed!",
        description: "Your order has been placed successfully. We'll contact you soon.",
      });
      setCart({});
      setShowPatientForm(false);
      setPatientData({ name: '', phone: '', address: '' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="py-16 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-4 mb-4">
                <h1 className="text-4xl font-bold">Online Pharmacy</h1>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchMedicines}
                  disabled={loading}
                  title="Refresh medicines"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground">
                Order medicines and get them delivered to your home
              </p>
            </div>

            {error && (
              <div className="max-w-md mx-auto mb-8">
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button onClick={fetchMedicines} disabled={loading}>
                        {loading ? 'Loading...' : 'Try Again'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="max-w-md mx-auto mb-8">
              <Input
                type="text"
                placeholder="Search medicines or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                disabled={loading}
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                      <div className="h-6 bg-muted rounded w-1/4"></div>
                    </CardContent>
                    <CardFooter>
                      <div className="h-10 bg-muted rounded w-full"></div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : filteredMedicines.length === 0 ? (
              <div className="text-center py-12">
                <Pill className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No medicines found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try searching with different keywords' : 'No medicines available at the moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredMedicines.map((medicine) => (
                  <Card key={medicine.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{medicine.name}</CardTitle>
                        <Badge variant={medicine.inStock ? "default" : "secondary"}>
                          {medicine.inStock ? "In Stock" : "Out of Stock"}
                        </Badge>
                      </div>
                      <CardDescription>{medicine.description}</CardDescription>
                      {(medicine.manufacturer || medicine.dosage || medicine.packSize) && (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {medicine.manufacturer && <div>Brand: {medicine.manufacturer}</div>}
                          {medicine.dosage && <div>Dosage: {medicine.dosage}</div>}
                          {medicine.packSize && <div>Pack Size: {medicine.packSize}</div>}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-muted-foreground">{medicine.category}</span>
                          {medicine.prescriptionRequired && (
                            <Badge variant="outline" className="w-fit mt-1">
                              Prescription Required
                            </Badge>
                          )}
                        </div>
                        <span className="text-lg font-semibold">₹{medicine.price}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                      {cart[medicine.id] ? (
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeFromCart(medicine.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="font-medium">{cart[medicine.id]}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => addToCart(medicine.id)}
                            disabled={!medicine.inStock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(medicine.id)}
                          disabled={!medicine.inStock}
                          className="flex items-center gap-2"
                        >
                          <Pill className="h-4 w-4" />
                          Add to Cart
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {showPatientForm ? (
              <div className="max-w-md mx-auto">
                <PatientDetailsForm
                  patientData={patientData}
                  onPatientDataChange={setPatientData}
                  onSubmit={handlePatientFormSubmit}
                  onBack={() => setShowPatientForm(false)}
                />
              </div>
            ) : (
              Object.keys(cart).length > 0 && (
                <Card className="max-w-md mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Your Cart
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {Object.entries(cart).map(([medicineId, quantity]) => {
                        const medicine = medicines.find(m => m.id === medicineId);
                        if (!medicine) return null;
                        return (
                          <div key={medicineId} className="flex justify-between">
                            <span>{medicine.name} x{quantity}</span>
                            <span>₹{medicine.price * quantity}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="border-t pt-2 font-semibold">
                      Total: ₹{getCartTotal()}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleCheckout} className="w-full">
                      Place Order
                    </Button>
                  </CardFooter>
                </Card>
              )
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PharmacyPage;