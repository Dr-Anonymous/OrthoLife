import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Pill, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Medicine {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
}

const medicines: Medicine[] = [
  {
    id: '1',
    name: 'Paracetamol 500mg',
    description: 'Pain relief and fever reducer. Pack of 20 tablets.',
    price: 120,
    category: 'Pain Relief',
    inStock: true,
  },
  {
    id: '2',
    name: 'Cetrizine 10mg',
    description: 'Antihistamine for allergy relief. Pack of 10 tablets.',
    price: 80,
    category: 'Allergy',
    inStock: true,
  },
  {
    id: '3',
    name: 'Omeprazole 20mg',
    description: 'Acid reflux and heartburn relief. Pack of 14 capsules.',
    price: 150,
    category: 'Digestive',
    inStock: true,
  },
  {
    id: '4',
    name: 'Vitamin D3 1000IU',
    description: 'Daily vitamin D supplement. Pack of 30 tablets.',
    price: 200,
    category: 'Vitamins',
    inStock: true,
  },
  {
    id: '5',
    name: 'Ibuprofen 400mg',
    description: 'Anti-inflammatory pain relief. Pack of 16 tablets.',
    price: 100,
    category: 'Pain Relief',
    inStock: false,
  },
  {
    id: '6',
    name: 'Cough Syrup',
    description: 'Natural honey-based cough relief. 100ml bottle.',
    price: 180,
    category: 'Cold & Flu',
    inStock: true,
  },
];

const PharmacyPage = () => {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

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

    toast({
      title: "Order placed successfully!",
      description: "Your medicines will be delivered within 2-3 hours.",
    });
    setCart({});
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="py-16 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Online Pharmacy</h1>
              <p className="text-xl text-muted-foreground">
                Order medicines and get them delivered to your home
              </p>
            </div>

            <div className="max-w-md mx-auto mb-8">
              <Input
                type="text"
                placeholder="Search medicines or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

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
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-muted-foreground">{medicine.category}</span>
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

            {Object.keys(cart).length > 0 && (
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
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PharmacyPage;