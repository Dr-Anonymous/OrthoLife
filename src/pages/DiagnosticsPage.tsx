import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PatientDetailsForm from '@/components/PatientDetailsForm';
import DiagnosticsTimeSlotSelection from '@/components/DiagnosticsTimeSlotSelection';
import FloatingCart from '@/components/FloatingCart';
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
  maxPrice?: number;
  marketPrice?: number;
  category?: string;
  duration?: string;
}

const DiagnosticsPage = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showTimeSlotSelection, setShowTimeSlotSelection] = useState(false);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [isOffer, setIsOffer] = useState(false);
  const [timeSlotData, setTimeSlotData] = useState<{ start: string; end: string; date: string } | null>(null);
  const [patientData, setPatientData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const { toast } = useToast();
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    trackEvent({
      eventType: "page_view",
      path: location.pathname,
      user_phone: user?.phoneNumber,
      user_name: user?.displayName,
      details: { page: 'diagnostics' }
    });
  }, [location.pathname, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code == 'off') {
      setIsOffer(true);
    }
    const query = params.get('q');
    if (query) {
      setSearchTerm(query);
    }
  }, []);


  const fetchTests = async (bustCache = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = bustCache ? `/lab-data.json?v=${new Date().getTime()}` : '/lab-data.json';
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          // File doesn't exist, which is a valid state before the first refresh.
          setTests([]);
          setError("Lab data has not been generated yet. Please click the refresh button to fetch it.");
        } else {
          console.error('Error fetching tests:', await response.text());
          setError('Failed to load tests. Please try again.');
        }
        return;
      }

      const responseText = await response.text();
      if (!responseText) {
        // The file is empty, treat it as if it's not there.
        setTests([]);
        setError("Lab data is empty. Please click the refresh button to fetch it.");
        return;
      }

      const data = JSON.parse(responseText);
      setTests(data?.medicines || []);

    } catch (err) {
      console.error('Error parsing lab data:', err);
      setError('Failed to load tests. The data file might be corrupted or in an invalid format.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestsWithRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      toast({
        title: "Refreshing...",
        description: "Fetching the latest test data.",
      });

      const { error } = await supabase.functions.invoke('fetch-lab-data?refresh=true');

      if (error) {
        console.error('Error refreshing tests:', error);
        setError('Failed to refresh tests. Please try again.');
        toast({
          title: "Refresh failed",
          description: "Could not fetch the latest data.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Data has been refreshed, now fetch it from the static file, busting the cache.
      await fetchTests(true);
      toast({
        title: "Refresh complete",
        description: "You are viewing the latest test data.",
      });

    } catch (err) {
      console.error('Error during refresh:', err);
      setError('An unexpected error occurred during refresh.');
      toast({
        title: "Refresh failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTests();
  }, []);

  const filteredTests = (() => {
    const searchTerms = searchTerm.toLowerCase().split(',').map(term => term.trim()).filter(term => term);
    if (searchTerms.length === 0) {
      return tests;
    }

    const result = [];
    const addedIds = new Set();

    for (const term of searchTerms) {
      for (const test of tests) {
        if (!addedIds.has(test.id)) {
          if (
            test.name.replace(/[.,;]/g, '').toLowerCase().includes(term) ||
            (test.category && test.category.toLowerCase().includes(term)) ||
            (test.description && test.description.toLowerCase().includes(term))
          ) {
            result.push(test);
            addedIds.add(test.id);
          }
        }
      }
    }
    return result;
  })();

  const addToCart = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    trackEvent({
      eventType: "add_to_cart",
      path: location.pathname,
      user_phone: user?.phoneNumber,
      user_name: user?.displayName,
      details: {
        page: 'diagnostics',
        testId: test.id,
        testName: test.name,
      },
    });

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
      if (!test) return total;
      const price = isOffer ? test.price : (test.marketPrice || test.price);
      return total + (price * quantity);
    }, 0);
  };

  const scrollToCart = () => {
    const cartSection = document.querySelector('[data-cart-section]');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
        const price = isOffer ? test.price : (test.marketPrice || test.price);
        return {
          name: test?.name || '',
          quantity,
          price: price
        };
      });

      const total = getCartTotal();
      trackEvent({
        eventType: "purchase",
        path: location.pathname,
        user_phone: user?.phoneNumber,
        user_name: user?.displayName,
        details: {
          page: 'diagnostics',
          items: items,
          total: total,
        },
      });

      // Book the time slot in Google Calendar and save order
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
          toast({
            title: "Booking failed",
            description: "Could not book your tests. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Tests booked successfully!",
            description: `Our technician will visit you on ${new Date(timeSlotData.start).toLocaleDateString()} at ${new Date(timeSlotData.start).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: true })}.`,
          });
        }
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
                  onClick={fetchTestsWithRefresh}
                  disabled={loading}
                  title="Refresh tests"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <p className="text-xl text-muted-foreground">
                Convenient, accurate, and affordable lab tests—right from the comfort of your home.
              </p>
            </div>

            {error && (
              <div className="max-w-md mx-auto mb-8">
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-destructive mb-4">{error}</p>
                      <Button onClick={fetchTestsWithRefresh} disabled={loading}>
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
                placeholder="Search by test name (creatinine) or by complaint/organ (kidney)"
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
                        {isOffer && test.marketPrice && test.marketPrice > test.price && (
                          <Badge variant="destructive" className="text-xs w-fit ml-auto">
                            {Math.ceil(((test.marketPrice - test.price) / test.marketPrice) * 100)}% OFF
                          </Badge>
                        )}
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
                        {test.duration && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Results:
                            </span>
                            <span className="text-sm">{test.duration}</span>
                          </div>
                        )}
                        <div className="text-right">
                          {test.marketPrice && test.marketPrice > test.price && isOffer ? (
                            <div className="flex flex-col">
                              <span className="text-sm text-muted-foreground line-through">
                                ₹{test.marketPrice}
                              </span>
                              <span className="text-lg font-semibold text-green-600">
                                ₹{test.price}
                              </span>
                            </div>
                          ) : (
                            <span className="text-lg font-semibold">₹{test.marketPrice || test.price}</span>
                          )}
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
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(test.id)}
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
                <Card className="max-w-md mx-auto" data-cart-section>
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
                        const price = isOffer ? test.price : (test.marketPrice || test.price);
                        return (
                          <div key={testId} className="flex justify-between">
                            <span>{test.name} x{quantity}</span>
                            <span>₹{price * quantity}</span>
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
      <FloatingCart
        itemCount={Object.values(cart).reduce((sum, qty) => sum + qty, 0)}
        total={getCartTotal()}
        onViewCart={scrollToCart}
        type="diagnostics"
      />
      <Footer />
    </div>
  );
};

export default DiagnosticsPage;
