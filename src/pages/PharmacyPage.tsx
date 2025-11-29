import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PatientDetailsForm from '@/components/PatientDetailsForm';
import FloatingCart from '@/components/FloatingCart';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Pill, Plus, Minus, RefreshCw, CalendarClock, Trash2 } from 'lucide-react';
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
  individual?: string;
}

const PharmacyPage = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({});
  const [orderType, setOrderType] = useState<{ [key: string]: 'pack' | 'unit' }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [autoReorder, setAutoReorder] = useState(false);
  const [reorderFrequencyCount, setReorderFrequencyCount] = useState(1);
  const [reorderFrequencyUnit, setReorderFrequencyUnit] = useState('monthly');

  const [patientData, setPatientData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('pharmacyCart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pharmacyCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    trackEvent({
      eventType: "page_view",
      path: location.pathname,
      user_phone: user?.phoneNumber,
      user_name: user?.displayName,
      details: { page: 'pharmacy' }
    });
  }, [location.pathname, user]);

  // Autofill patient data from user profile
  useEffect(() => {
    if (user) {
      setPatientData(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        phone: user.phoneNumber || prev.phone
      }));
    }
  }, [user]);

  const addMultipleToCart = (medicine: Medicine, quantity: number) => {
    if (!medicine) return;

    const packSize = medicine.packSize ? parseInt(medicine.packSize, 10) : 0;
    let itemsAdded = false;

    if (packSize > 0 && medicine.individual === 'TRUE') {
      const packs = Math.floor(quantity / packSize);
      const units = quantity % packSize;

      if (packs > 0) {
        const cartKey = getCartKey(medicine, undefined, 'pack');
        const availableStock = getAvailableStock(medicine, undefined, 'pack');
        if (packs <= availableStock) {
          setCart(prev => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + packs }));
          itemsAdded = true;
        }
      }

      if (units > 0) {
        const cartKey = getCartKey(medicine, undefined, 'unit');
        const availableStock = getAvailableStock(medicine, undefined, 'unit');
        if (units <= availableStock) {
          setCart(prev => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + units }));
          itemsAdded = true;
        }
      }
    } else {
      const cartKey = getCartKey(medicine, undefined, 'pack');
      const availableStock = getAvailableStock(medicine, undefined, 'pack');
      if (quantity <= availableStock) {
        setCart(prev => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + quantity }));
        itemsAdded = true;
      }
    }

    if (itemsAdded) {
      toast({
        title: "Added to cart",
        description: `${medicine.name} was automatically added to your cart.`,
      });
    }
  };

  const fetchMedicines = async (): Promise<Medicine[]> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('fetch-pharmacy-data');

      if (error) {
        console.error('Error fetching medicines:', error);
        setError('Failed to load medicines. Please try again.');
        return [];
      }

      const medicinesData = data?.medicines || [];
      setMedicines(medicinesData);
      return medicinesData;
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load medicines. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const processUrlQuery = async () => {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q');

      const medicinesData = await fetchMedicines();

      if (query && query.includes('*')) {
        const items = query.split(',').map(item => {
          const parts = item.split('*');
          return {
            name: parts[0].trim(),
            quantity: parseInt(parts[1] || '1', 10),
            type: parts[2] as 'pack' | 'unit' | undefined
          };
        });

        const medicineNames = items.map(item => item.name).join(', ');
        setSearchTerm(medicineNames);

        items.forEach(item => {
          const searchTerm = item.name.toLowerCase();
          const medicine = medicinesData.find(m =>
            (m.name && m.name.toLowerCase().includes(searchTerm)) ||
            (m.category && m.category.toLowerCase().includes(searchTerm)) ||
            (m.description && m.description.toLowerCase().includes(searchTerm))
          );

          if (medicine) {
            // If type is specified, use it. Otherwise default to logic in addMultipleToCart
            if (item.type) {
              const cartKey = getCartKey(medicine, undefined, item.type);
              const availableStock = getAvailableStock(medicine, undefined, item.type);
              if (item.quantity <= availableStock) {
                setCart(prev => ({ ...prev, [cartKey]: (prev[cartKey] || 0) + item.quantity }));
                setOrderType(prev => ({ ...prev, [medicine.id]: item.type! }));
              }
            } else {
              addMultipleToCart(medicine, item.quantity);
            }
          }
        });
      } else if (query) {
        setSearchTerm(query);
      }
    };

    processUrlQuery();
  }, []);

  const filteredMedicines = (() => {
    const searchTerms = searchTerm.toLowerCase().split(',').map(term => term.trim()).filter(term => term);
    if (searchTerms.length === 0) {
      return medicines;
    }

    const result = [];
    const addedIds = new Set();

    for (const term of searchTerms) {
      for (const medicine of medicines) {
        if (!addedIds.has(medicine.id)) {
          if (
            (medicine.name && medicine.name.toLowerCase().includes(term)) ||
            (medicine.category && medicine.category.toLowerCase().includes(term)) ||
            (medicine.description && medicine.description.toLowerCase().includes(term))
          ) {
            result.push(medicine);
            addedIds.add(medicine.id);
          }
        }
      }
    }
    return result;
  })();

  const getCartKey = (medicine: Medicine, size: string | undefined, type: 'pack' | 'unit'): string => {
    let baseKey = medicine.id;
    if (medicine.isGrouped && size) {
      baseKey = `${medicine.id}-${size}`;
    }

    if (medicine.individual === 'TRUE') {
      return `${baseKey}-${type}`;
    }

    return baseKey;
  };

  const getAvailableStock = (medicine: Medicine, size: string | undefined, type: 'pack' | 'unit'): number => {
    let stock = 0;
    if (medicine.isGrouped && size && medicine.sizes) {
      const sizeVariant = medicine.sizes.find(s => s.size === size);
      stock = sizeVariant?.stockCount || 0;
    } else {
      stock = medicine.stockCount || 0;
    }

    if (medicine.individual === 'TRUE' && type === 'unit' && medicine.packSize) {
      const packSize = parseInt(medicine.packSize, 10);
      if (!isNaN(packSize)) {
        return stock * packSize;
      }
    }

    return stock;
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

    const currentOrderType = orderType[medicine.id] || 'pack';
    const cartKey = getCartKey(medicine, selectedSize, currentOrderType);
    const currentCartQuantity = cart[cartKey] || 0;
    const availableStock = getAvailableStock(medicine, selectedSize, currentOrderType);

    if (currentCartQuantity >= availableStock) {
      toast({
        title: "Stock limit reached",
        description: `Only ${availableStock} units available in stock.`,
        variant: "destructive",
      });
      return;
    }

    trackEvent({
      eventType: "add_to_cart",
      path: location.pathname,
      user_phone: user?.phoneNumber,
      user_name: user?.displayName,
      details: {
        page: 'pharmacy',
        medicineId: medicine.id,
        medicineName: medicine.name,
        size: selectedSize,
        orderType: currentOrderType,
      },
    });

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

  const removeLineItem = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[cartKey];
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [cartKey, quantity]) => {
      const cartKeyParts = cartKey.split('-');
      const medicineId = cartKeyParts[0];
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        if (cartKey.endsWith('-unit') && medicine.packSize) {
          const packSize = parseInt(medicine.packSize, 10);
          if (!isNaN(packSize) && packSize > 0) {
            const unitPrice = medicine.price / packSize;
            return total + (unitPrice * quantity);
          }
        }
        return total + (medicine.price * quantity);
      }
      return total;
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
      const medicine = medicines.find(m => m.id === medicineId);

      if (medicine) {
        const orderType = cartKey.endsWith('-unit') ? 'unit' : 'pack';

        let size;
        if (medicine.isGrouped) {
          if (cartKey.endsWith('-unit') || cartKey.endsWith('-pack')) {
            size = cartKeyParts.slice(1, cartKeyParts.length - 1).join('-');
          } else {
            size = cartKeyParts.slice(1).join('-');
          }
        }

        const availableStock = getAvailableStock(medicine, size, orderType);

        if (quantity > availableStock) {
          let displayName = medicine.name;
          if (medicine.isGrouped && size) {
            displayName = `${medicine.name} (${size})`;
          }
          if (orderType === 'unit') {
            displayName = `${displayName} (Units)`;
          }
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

    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to place an order.",
      });
      navigate(`/auth?redirect=/pharmacy`);
      return;
    }

    setShowPatientForm(true);
  };

  const handlePatientFormSubmit = async () => {
    try {
      const items = Object.entries(cart).map(([cartKey, quantity]) => {
        const cartKeyParts = cartKey.split('-');
        const medicineId = cartKeyParts[0];
        const medicine = medicines.find(m => m.id === medicineId);

        if (!medicine) return null;

        let size;
        if (medicine.isGrouped) {
          if (cartKey.endsWith('-unit') || cartKey.endsWith('-pack')) {
            size = cartKeyParts.slice(1, cartKeyParts.length - 1).join('-');
          } else {
            size = cartKeyParts.slice(1).join('-');
          }
        }

        let nameForStockUpdate = medicine.name;
        if (medicine.isGrouped && size) {
          nameForStockUpdate = `${medicine.name} ${size}`;
        }

        let displayNameForEmail = medicine.name;
        if (medicine.isGrouped && size) {
          displayNameForEmail = `${medicine.name} (${size})`;
        }

        const orderType = cartKey.endsWith('-unit') ? 'unit' : 'pack';
        if (orderType === 'unit') {
          displayNameForEmail = `${displayNameForEmail} (Units)`;
        } else {
          displayNameForEmail = `${displayNameForEmail} (Pack)`;
        }

        let itemPrice = 0;
        if (orderType === 'unit' && medicine.packSize) {
          const packSize = parseInt(medicine.packSize, 10);
          if (!isNaN(packSize) && packSize > 0) {
            itemPrice = medicine.price / packSize;
          }
        } else {
          itemPrice = medicine.price;
        }

        return {
          name: nameForStockUpdate,
          displayName: displayNameForEmail,
          quantity,
          price: itemPrice,
          orderType: orderType,
          packSize: medicine.packSize ? parseInt(medicine.packSize, 10) : undefined
        };
      }).filter(Boolean);

      const total = getCartTotal();

      trackEvent({
        eventType: "purchase",
        path: location.pathname,
        user_phone: user?.phoneNumber,
        user_name: user?.displayName,
        details: {
          page: 'pharmacy',
          items: items,
          total: total,
        },
      });

      const { error } = await supabase.functions.invoke('place-order', {
        body: {
          userId: user?.phoneNumber, // Using phone number as ID as requested
          items,
          totalAmount: total,
          items,
          totalAmount: total,
          subscription: autoReorder ? { frequency: `${reorderFrequencyCount}-${reorderFrequencyUnit}` } : null,
          patientData: patientData
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
                  const currentOrderType = orderType[medicine.id] || 'pack';
                  const cartKey = getCartKey(medicine, selectedSize, currentOrderType);
                  const currentStock = getAvailableStock(medicine, selectedSize, currentOrderType);

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
                            {medicine.packSize && <div>Pack Size: {medicine.packSize} unit(s)/pack</div>}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        {medicine.individual === 'TRUE' && medicine.packSize && parseInt(medicine.packSize, 10) > 1 && (
                          <div className="mb-4">
                            <Label>Order by:</Label>
                            <RadioGroup
                              defaultValue="pack"
                              value={orderType[medicine.id] || 'pack'}
                              onValueChange={(value) => {
                                setOrderType(prev => ({
                                  ...prev,
                                  [medicine.id]: value as 'pack' | 'unit'
                                }));
                              }}
                              className="flex items-center space-x-4 mt-2"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="pack" id={`${medicine.id}-pack`} />
                                <Label htmlFor={`${medicine.id}-pack`}>Pack</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="unit" id={`${medicine.id}-unit`} />
                                <Label htmlFor={`${medicine.id}-unit`}>Unit</Label>
                              </div>
                            </RadioGroup>
                          </div>
                        )}
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex flex-col">
                            <div className="space-y-1">
                              <span className="text-xs text-muted-foreground">
                                Stock: {currentStock} {currentOrderType === 'unit' ? 'units' : 'packs'} available
                              </span>
                              {(cart[cartKey] || 0) > 0 && (
                                <span className="text-xs text-orange-600">
                                  {" "}{currentStock - (cart[cartKey] || 0)} remaining
                                </span>
                              )}
                            </div>
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
                                  ₹{Math.ceil(medicine.originalPrice)}
                                </span>
                                <span className="text-lg font-semibold text-green-600">
                                  ₹{Math.ceil(medicine.price)}
                                </span>
                                {medicine.discount && medicine.discount > 0 && (
                                  <Badge variant="destructive" className="text-xs w-fit ml-auto">
                                    {Math.ceil(medicine.discount)}% OFF
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-lg font-semibold">₹{medicine.price}</span>
                            )}
                            {medicine.individual === 'TRUE' && medicine.packSize && parseInt(medicine.packSize, 10) > 1 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                (₹{(medicine.price / parseInt(medicine.packSize, 10)).toFixed(2)} / unit)
                              </div>
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
                        const cartKeyParts = cartKey.split('-');
                        const medicineId = cartKeyParts[0];
                        const medicine = medicines.find(m => m.id === medicineId);

                        if (!medicine) return null;

                        let size;
                        if (medicine.isGrouped) {
                          if (cartKey.endsWith('-unit') || cartKey.endsWith('-pack')) {
                            size = cartKeyParts.slice(1, cartKeyParts.length - 1).join('-');
                          } else {
                            size = cartKeyParts.slice(1).join('-');
                          }
                        }

                        let displayName;
                        if (medicine.isGrouped && size) {
                          displayName = `${medicine.name} (${size})`;
                        } else {
                          displayName = medicine.name;
                        }

                        if (cartKey.endsWith('-unit')) {
                          displayName = `${displayName} (Units)`;
                        } else if (cartKey.endsWith('-pack')) {
                          displayName = `${displayName} (Pack)`;
                        }

                        let itemPrice = 0;
                        if (cartKey.endsWith('-unit') && medicine.packSize) {
                          const packSize = parseInt(medicine.packSize, 10);
                          if (!isNaN(packSize) && packSize > 0) {
                            const unitPrice = medicine.price / packSize;
                            itemPrice = unitPrice * quantity;
                          }
                        } else {
                          itemPrice = medicine.price * quantity;
                        }

                        const currentStock = getAvailableStock(medicine, size, cartKey.endsWith('-unit') ? 'unit' : 'pack');

                        return (
                          <div key={cartKey} className="flex justify-between items-center border-b pb-4 last:border-0">
                            <div className="flex-1">
                              <div className="font-medium">{displayName}</div>
                              <div className="text-sm text-muted-foreground">
                                ₹{itemPrice.toFixed(2)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-r-none"
                                  onClick={() => removeFromCart(cartKey)}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-l-none"
                                  onClick={() => addToCart(medicine.id, size)}
                                  disabled={quantity >= currentStock}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeLineItem(cartKey)}
                                title="Remove item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="auto-reorder"
                        checked={autoReorder}
                        onCheckedChange={(checked) => setAutoReorder(checked as boolean)}
                      />
                      <label
                        htmlFor="auto-reorder"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Automatically reorder
                      </label>
                    </div>
                    {autoReorder && (
                      <div className="mb-4">
                        <Label className="mb-2 block">Reorder Frequency</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={reorderFrequencyCount}
                            onChange={(e) => setReorderFrequencyCount(parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                          <Select value={reorderFrequencyUnit} onValueChange={setReorderFrequencyUnit}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weeks</SelectItem>
                              <SelectItem value="monthly">Months</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-2 font-semibold">
                      Total: ₹{getCartTotal().toFixed(2)}
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
        total={parseInt(getCartTotal().toFixed(1))}
        onViewCart={scrollToCart}
        type="pharmacy"
      />
      <Footer />
    </div>
  );
};

export default PharmacyPage;
