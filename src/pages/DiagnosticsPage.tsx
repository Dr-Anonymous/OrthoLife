import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PatientDetailsForm from '@/components/PatientDetailsForm';
import DiagnosticsTimeSlotSelection from '@/components/DiagnosticsTimeSlotSelection';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, TestTubes, Plus, Minus, Clock, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Test {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  marketPrice?: number;
  discount?: number;
  category?: string;
  fasting?: boolean;
  duration?: string;
  available?: boolean;
}

const DiagnosticsPage = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimeSlotSelection, setShowTimeSlotSelection] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [timeSlotData, setTimeSlotData] = useState<{ start: string; end: string; date: string } | null>(null);
  const [patientData, setPatientData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const { toast } = useToast();

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.functions.invoke('fetch-lab-data');
      
      if (error) {
        console.error('Error fetching tests:', error);
        setError('Failed to load tests. Please try again.');
        return;
      }
      
      setTests(data?.medicines || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = tests.filter(test =>
    test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (test.category && test.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (test.description && test.description.toLowerCase().includes(searchTerm.toLowerCase()))
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

    setShowTimeSlotSelection(true);
  };

  const handleTimeSlotSelection = (timeSlotData: { start: string; end: string; date: string }) => {
    setTimeSlotData(timeSlotData);
    setShowTimeSlotSelection(false);
    setShowPatientForm(true);
  };

  const handlePatientFormSubmit = async () => {
    try {
      const items = Object.entries(cart).map(([testId, quantity]) => {
        const test = tests.find(t => t.id === testId);
        return {
          name: test?.name || '',
          quantity,
          price: test?.price || 0
        };
      });

      // Book the time slot in Google Calendar
      if (timeSlotData) {
        const { error: bookingError } = await supabase.functions.invoke('book-diagnostics', {
          body: {
            patientData,
            timeSlotData,
            items,
            total: getCartTotal()
          }
        });

        if (bookingError) {
          console.error('Error booking diagnostics:', bookingError);
        }
      }

      // Send the email notification
      const { error } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderType: 'diagnostics',
          patientData,
          items,
          total: getCartTotal()
        }
      });

      if (error) {
        console.error('Error sending email:', error);
        toast({
          title: "Tests booked!",
          description: `Your tests have been booked successfully.${timeSlotData ? ` Home collection scheduled for ${new Date(timeSlotData.start).toLocaleDateString()} at ${new Date(timeSlotData.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}.` : ' We\'ll contact you soon.'}`,
        });
      } else {
        toast({
          title: "Tests booked successfully!",
          description: `Our technician will visit you on ${timeSlotData ? new Date(timeSlotData.start).toLocaleDateString() + ' at ' + new Date(timeSlotData.start).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true }) : 'the scheduled time'}.`,
        });
        
        // Refresh tests data after successful booking
        fetchTests();
      }

      // Reset all form states
      setCart({});
      setShowPatientForm(false);
      setShowTimeSlotSelection(false);
      setTimeSlotData(null);
      setPatientData({ name: '', phone: '', address: '' });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Tests booked!",
        description: "Your tests have been booked successfully. We'll contact you soon.",
      });
      // Reset all form states
      setCart({});
      setShowPatientForm(false);
      setShowTimeSlotSelection(false);
      setTimeSlotData(null);
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
                <h1 className="text-4xl font-bold">Home Diagnostics</h1>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={fetchTests}
                  disabled={loading}
                  title="Refresh tests"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground">
                Book blood tests and get samples collected from your home
              </p>
            </div>

            {error && (
              <div className="max-w-md mx-auto mb-8">
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button onClick={fetchTests} disabled={loading}>
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
                placeholder="Search tests or categories..."
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
            ) : filteredTests.length === 0 ? (
              <div className="text-center py-12">
                <TestTubes className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No tests found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try searching with different keywords' : 'No tests available at the moment'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {filteredTests.map((test) => (
                  <Card key={test.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{test.name}</CardTitle>
                        <Badge variant={test.available !== false ? "default" : "secondary"}>
                          {test.available !== false ? "Available" : "Not Available"}
                        </Badge>
                      </div>
                      {test.description && (
                        <CardDescription>{test.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {test.category && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Category:</span>
                            <span className="text-sm">{test.category}</span>
                          </div>
                        )}
                        {test.fasting !== undefined && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Fasting:</span>
                            <span className="text-sm">{test.fasting ? "Required" : "Not Required"}</span>
                          </div>
                        )}
                        {test.duration && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Results:
                            </span>
                            <span className="text-sm">{test.duration}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-right">
                            {test.originalPrice && test.originalPrice > test.price ? (
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground line-through">
                                  ₹{test.originalPrice}
                                </span>
                                <span className="text-lg font-semibold text-green-600">
                                  ₹{test.price}
                                </span>
                                {test.discount && test.discount > 0 && (
                                  <Badge variant="destructive" className="text-xs w-fit">
                                    {test.discount}% OFF
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-lg font-semibold">₹{test.price}</span>
                            )}
                          </div>
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
                            disabled={test.available === false}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(test.id)}
                          disabled={test.available === false}
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
            )}

            {showTimeSlotSelection ? (
              <div className="max-w-md mx-auto">
                <DiagnosticsTimeSlotSelection
                  onComplete={handleTimeSlotSelection}
                  onBack={() => setShowTimeSlotSelection(false)}
                />
              </div>
            ) : showPatientForm ? (
              <div className="max-w-md mx-auto">
                <PatientDetailsForm
                  patientData={patientData}
                  onPatientDataChange={setPatientData}
                  onSubmit={handlePatientFormSubmit}
                  onBack={() => {
                    setShowPatientForm(false);
                    setShowTimeSlotSelection(true);
                  }}
                />
              </div>
            ) : (
              Object.keys(cart).length > 0 && (
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
              )
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DiagnosticsPage;
