import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, TestTubes, Plus, Minus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Test {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  fasting: boolean;
  duration: string;
  available: boolean;
}

const tests: Test[] = [
  {
    id: '1',
    name: 'Complete Blood Count (CBC)',
    description: 'Comprehensive blood analysis including RBC, WBC, platelets, and hemoglobin levels.',
    price: 400,
    category: 'Blood Tests',
    fasting: false,
    duration: '6-8 hours',
    available: true,
  },
  {
    id: '2',
    name: 'Lipid Profile',
    description: 'Cholesterol and triglyceride levels assessment for heart health.',
    price: 600,
    category: 'Heart Health',
    fasting: true,
    duration: '12-24 hours',
    available: true,
  },
  {
    id: '3',
    name: 'Blood Glucose (Fasting)',
    description: 'Fasting blood sugar levels to screen for diabetes.',
    price: 150,
    category: 'Diabetes',
    fasting: true,
    duration: '4-6 hours',
    available: true,
  },
  {
    id: '4',
    name: 'Thyroid Function Test (TSH)',
    description: 'Thyroid stimulating hormone levels to assess thyroid function.',
    price: 350,
    category: 'Hormones',
    fasting: false,
    duration: '6-8 hours',
    available: true,
  },
  {
    id: '5',
    name: 'Liver Function Test (LFT)',
    description: 'Comprehensive liver health assessment including enzymes and proteins.',
    price: 500,
    category: 'Liver Health',
    fasting: true,
    duration: '12-24 hours',
    available: false,
  },
  {
    id: '6',
    name: 'Vitamin D (25-OH)',
    description: 'Vitamin D deficiency screening and levels assessment.',
    price: 800,
    category: 'Vitamins',
    fasting: false,
    duration: '24-48 hours',
    available: true,
  },
  {
    id: '7',
    name: 'HbA1c (Diabetes)',
    description: '3-month average blood sugar levels for diabetes monitoring.',
    price: 450,
    category: 'Diabetes',
    fasting: false,
    duration: '6-8 hours',
    available: true,
  },
  {
    id: '8',
    name: 'Kidney Function Test',
    description: 'Creatinine and urea levels to assess kidney health.',
    price: 300,
    category: 'Kidney Health',
    fasting: false,
    duration: '6-8 hours',
    available: true,
  },
];

const DiagnosticsPage = () => {
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const filteredTests = tests.filter(test =>
    test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (testId: string) => {
    setCart(prev => ({
      ...prev,
      [testId]: (prev[testId] || 0) + 1
    }));
    toast({
      title: "Added to cart",
      description: "Test added successfully!",
    });
  };

  const removeFromCart = (testId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[testId] > 1) {
        newCart[testId] -= 1;
      } else {
        delete newCart[testId];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.entries(cart).reduce((total, [testId, quantity]) => {
      const test = tests.find(t => t.id === testId);
      return total + (test ? test.price * quantity : 0);
    }, 0);
  };

  const handleBookTests = () => {
    if (Object.keys(cart).length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add tests to your cart first.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Tests booked successfully!",
      description: "Our phlebotomist will visit you within 24 hours.",
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
              <h1 className="text-4xl font-bold mb-4">Home Diagnostics</h1>
              <p className="text-xl text-muted-foreground">
                Book blood tests and get samples collected from your home
              </p>
            </div>

            <div className="max-w-md mx-auto mb-8">
              <Input
                type="text"
                placeholder="Search tests or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredTests.map((test) => (
                <Card key={test.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{test.name}</CardTitle>
                      <Badge variant={test.available ? "default" : "secondary"}>
                        {test.available ? "Available" : "Not Available"}
                      </Badge>
                    </div>
                    <CardDescription>{test.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Category:</span>
                        <span className="text-sm">{test.category}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Fasting:</span>
                        <span className="text-sm">{test.fasting ? "Required" : "Not Required"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Results:
                        </span>
                        <span className="text-sm">{test.duration}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-lg font-semibold">₹{test.price}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    {cart[test.id] ? (
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeFromCart(test.id)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="font-medium">{cart[test.id]}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => addToCart(test.id)}
                          disabled={!test.available}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => addToCart(test.id)}
                        disabled={!test.available}
                        className="flex items-center gap-2"
                      >
                        <TestTubes className="h-4 w-4" />
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
                    <Calendar className="h-5 w-5" />
                    Your Tests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {Object.entries(cart).map(([testId, quantity]) => {
                      const test = tests.find(t => t.id === testId);
                      if (!test) return null;
                      return (
                        <div key={testId} className="flex justify-between">
                          <span>{test.name} x{quantity}</span>
                          <span>₹{test.price * quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t pt-2 font-semibold">
                    Total: ₹{getCartTotal()}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleBookTests} className="w-full">
                    Book Tests
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

export default DiagnosticsPage;