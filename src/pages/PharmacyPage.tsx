import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PatientDetailsForm from '@/components/PatientDetailsForm';
import FloatingCart from '@/components/FloatingCart';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingCart, Pill, Plus, Minus, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SizeVariant {
  size: string;
  stockCount: number;
  inStock: boolean;
  originalName: string;
  id: string;
}

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
  originalPrice?: number;
  stockCount?: number;
  discount?: number;
  isGrouped?: boolean;
  sizes?: SizeVariant[];
}

const PharmacyPage = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({});
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
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setSearchTerm(query);
    }
    fetchMedicines();
  }, []);

  const filteredMedicines = medicines.filter(medicine => {
    const searchTerms = searchTerm.toLowerCase().split(',').map(term => term.trim()).filter(term => term);
    if (searchTerms.length === 0) return true;
    return searchTerms.some(term =>
      medicine.name.toLowerCase().includes(term) ||
      medicine.category.toLowerCase().includes(term) ||
      medicine.description.toLowerCase().includes(term)
    );
  });

  const getCartKey = (medicine: Medicine, size?: string): string => {
    if (medicine.isGrouped && size) {
      return `${medicine.id}-${size}`;
    }
    return medicine.id;
  };

  const getAvailableStock = (medicine: Medicine, size?: string): number => {
    if (medicine.isGrouped && size && medicine.sizes) {
      const sizeVariant = medicine.sizes.find(s => s.size === size);
      return sizeVariant?.stockCount || 0;
    }
    return medicine.stockCount || 0;
  };

  const addToCart = (medicineId: string, selectedSize?: string) => {
    const medicine = medicines.find(m => m.id === medicineId);
    if (!medicine) return;
    
    if (medicine.isGrouped && !selectedSize) {
      toast({
        title: "Please select a size",
        description: "Please choose a size before adding to cart.",
        variant: "destructive",
      });
      return;
    }
    
    const cartKey = getCartKey(medicine, selectedSize);
    const currentCartQuantity = cart[cartKey] || 0;
    const availableStock = getAvailableStock(medicine, selectedSize);
    
    if (currentCartQuantity >= availableStock) {
      toast({
        title: "Stock limit reached",
        description: `Only ${availableStock} units available in stock.`,
        variant: "destructive",
      });
      return;
    }
    
    setCart(prev => ({
      ...prev,
      [cartKey]: currentCartQuantity + 1
    }));
    toast({
      title: "Added to cart",
      description: "Medicine added successfully!",
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[cartKey] > 1) {
        newCart[cartKey] -= 1;
      } else {
        delete newCart[cartKey];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [cartKey, quantity]) => {
      const cartKeyParts = cartKey.split('-');
      const medicineId = cartKeyParts[0];
      const medicine = medicines.find(m => m.id === medicineId);
      return total + (medicine ? medicine.price * quantity : 0);
    }, 0);
  };

  const scrollToCart = () => {
    const cartSection = document.querySelector('[data-cart-section]');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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

    // Validate stock availability before checkout
    const stockErrors = [];
    for (const [cartKey, quantity] of Object.entries(cart)) {
      const cartKeyParts = cartKey.split('-');
      const medicineId = cartKeyParts[0];
      const size = cartKeyParts.length > 1 ? cartKeyParts.slice(1).join('-') : undefined;
      const medicine = medicines.find(m => m.id === medicineId);
      if (medicine) {
        const availableStock = getAvailableStock(medicine, size);
        if (quantity > availableStock) {
          const displayName = medicine.isGrouped && size ? `${medicine.name} (${size})` : medicine.name;
          stockErrors.push(`${displayName}: Only ${availableStock} available, but ${quantity} in cart`);
        }
      }
    }

    if (stockErrors.length > 0) {
      toast({
        title: "Stock availability issue",
        description: stockErrors.join('. '),
        variant: "destructive",
      });
      return;
    }

    setShowPatientForm(true);
  };

  const handlePatientFormSubmit = async () => {
    try {      
      const items = Object.entries(cart).map(([cartKey, quantity]) => {
        console.log('Processing cart key for email:', cartKey);
        const cartKeyParts = cartKey.split('-');
        const medicineId = cartKeyParts[0];
        const size = cartKeyParts.length > 1 ? cartKeyParts.slice(1).join('-') : undefined;
        console.log('Email - Medicine ID:', medicineId, 'Size:', size);
        
        const medicine = medicines.find(m => m.id === medicineId);
        console.log('Email - Found medicine:', medicine?.name);
        
        let displayName;
        if (medicine?.isGrouped && size) {
          displayName = `${medicine.name} (Size: ${size})`;
        } else {
          displayName = medicine?.name || '';
        }
        console.log('Email - Display name:', displayName);
        
        return {
          name: displayName,
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
        
        fetchMedicines();
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
                Get great discounts on medicines delivered to your home
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
                placeholder="Search medicines or symptoms/complaints..."
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
                 {filteredMedicines.map((medicine) => {
                   const selectedSize = selectedSizes[medicine.id];
                   const cartKey = getCartKey(medicine, selectedSize);
                   const currentStock = getAvailableStock(medicine, selectedSize);
                   
                   return (
                     <Card key={medicine.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground font-medium mt-1">
                                {medicine.category}
                              </div>
                              <CardTitle className="text-lg">{medicine.name}</CardTitle>
                              {medicine.isGrouped && medicine.sizes ? (
                                <div className="mt-2 space-y-2">
                                  <Badge variant="outline" className="w-fit">
                                    Available sizes: {medicine.sizes.map(s => s.size).join(', ')}
                                  </Badge>
                                  <Select
                                    value={selectedSize || ''}
                                    onValueChange={(value) => setSelectedSizes(prev => ({
                                      ...prev,
                                      [medicine.id]: value
                                    }))}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Select size" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {medicine.sizes.map((sizeVariant) => (
                                        <SelectItem 
                                          key={sizeVariant.size} 
                                          value={sizeVariant.size}
                                          disabled={!sizeVariant.inStock || sizeVariant.stockCount === 0}
                                        >
                                          {sizeVariant.size} {!sizeVariant.inStock || sizeVariant.stockCount === 0 ? '(Out of Stock)' : `(${sizeVariant.stockCount} available)`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <Badge variant={medicine.inStock ? "default" : "secondary"} className="w-fit mt-2">
                                  {medicine.inStock ? "In Stock" : "Out of Stock"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardDescription className="mt-2">{medicine.description}</CardDescription>
                          {(medicine.manufacturer || medicine.dosage || medicine.packSize) && (
                            <div className="space-y-1 text-sm text-muted-foreground mt-2">
                              {medicine.manufacturer && <div>Brand: {medicine.manufacturer}</div>}
                              {medicine.dosage && <div>Dosage: {medicine.dosage}</div>}
                              {medicine.packSize && <div>Pack Size: {medicine.packSize}</div>}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                           <div className="flex justify-between items-center mb-4">
                             <div className="flex flex-col">
                               {!medicine.isGrouped && medicine.stockCount !== undefined && (
                                 <div className="space-y-1">
                                   <span className="text-xs text-muted-foreground">
                                     Stock: {medicine.stockCount} available
                                   </span>
                                   {cart[medicine.id] && (
                                     <span className="text-xs text-orange-600">
                                       {" "}{medicine.stockCount - cart[medicine.id]} remaining
                                     </span>
                                   )}
                                 </div>
                               )}
                               {medicine.isGrouped && selectedSize && (
                                 <div className="space-y-1">
                                   <span className="text-xs text-muted-foreground">
                                     Stock: {currentStock} available
                                   </span>
                                   {cart[cartKey] && (
                                     <span className="text-xs text-orange-600">
                                       {" "}{currentStock - cart[cartKey]} remaining
                                     </span>
                                   )}
                                 </div>
                               )}
                               {medicine.prescriptionRequired && (
                                 <Badge variant="outline" className="w-fit mt-1">
                                   Prescription Required
                                 </Badge>
                               )}
                             </div>
                            <div className="text-right">
                              {medicine.originalPrice && medicine.originalPrice > medicine.price ? (
                                <div className="flex flex-col">
                                  <span className="text-sm text-muted-foreground line-through">
                                    ₹{medicine.originalPrice}
                                  </span>
                                  <span className="text-lg font-semibold text-green-600">
                                    ₹{medicine.price}
                                  </span>
                                  {medicine.discount && medicine.discount > 0 && (
                                    <Badge variant="destructive" className="text-xs w-fit ml-auto">
                                      {medicine.discount}% OFF
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-lg font-semibold">₹{medicine.price}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                       <CardFooter className="flex justify-between items-center">
                         {cart[cartKey] ? (
                           <div className="flex items-center gap-3">
                             <Button
                               variant="outline"
                               size="icon"
                               onClick={() => removeFromCart(cartKey)}
                             >
                               <Minus className="h-4 w-4" />
                             </Button>
                             <span className="font-medium">{cart[cartKey]}</span>
                             <Button
                               variant="outline"
                               size="icon"
                               onClick={() => addToCart(medicine.id, selectedSize)}
                               disabled={!medicine.inStock || (cart[cartKey] || 0) >= currentStock}
                             >
                               <Plus className="h-4 w-4" />
                             </Button>
                           </div>
                         ) : (
                           <Button
                             onClick={() => addToCart(medicine.id, selectedSize)}
                             disabled={!medicine.inStock || currentStock === 0 || (medicine.isGrouped && !selectedSize)}
                             className="flex items-center gap-2"
                           >
                             <Pill className="h-4 w-4" />
                             {currentStock === 0 ? 'Out of Stock' : 
                              medicine.isGrouped && !selectedSize ? 'Select Size First' : 'Add to Cart'}
                           </Button>
                         )}
                       </CardFooter>
                     </Card>
                   );
                 })}
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
                <Card className="max-w-md mx-auto" data-cart-section>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Your Cart
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      {Object.entries(cart).map(([cartKey, quantity]) => {
                        //console.log('Cart key:', cartKey);
                        const cartKeyParts = cartKey.split('-');
                        const medicineId = cartKeyParts[0];
                        const size = cartKeyParts.length > 1 ? cartKeyParts.slice(1).join('-') : undefined;
                        //console.log('Medicine ID:', medicineId, 'Size:', size);
                        
                        const medicine = medicines.find(m => m.id === medicineId);
                        //console.log('Found medicine:', medicine?.name);
                        
                        if (!medicine) return null;
                        
                        let displayName;
                        if (medicine.isGrouped && size) {
                          displayName = `${medicine.name} (${size})`;
                        } else {
                          displayName = medicine.name;
                        }
                        //console.log('Display name:', displayName);
                        
                        return (
                          <div key={cartKey} className="flex justify-between">
                            <span>{displayName} x{quantity}</span>
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
                      Continue to Confirm Order
                    </Button>
                  </CardFooter>
                </Card>
              )
            )}
          </div>
        </section>
      </main>
      <FloatingCart
        itemCount={Object.values(cart).reduce((sum, qty) => sum + qty, 0)}
        total={getCartTotal()}
        onViewCart={scrollToCart}
        type="pharmacy"
      />
      <Footer />
    </div>
  );
};

export default PharmacyPage;
