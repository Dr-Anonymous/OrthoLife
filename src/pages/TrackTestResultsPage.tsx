import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download, Clock, CheckCircle, Calendar } from 'lucide-react';

const TrackTestResultsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mockResults = [
    {
      id: 'TR001',
      patientName: 'John Doe',
      testDate: '2024-01-15',
      testType: 'Complete Blood Count',
      status: 'completed',
      reportDate: '2024-01-16',
      downloadUrl: '#'
    },
    {
      id: 'TR002',
      patientName: 'John Doe', 
      testDate: '2024-01-10',
      testType: 'Lipid Profile',
      status: 'processing',
      reportDate: null,
      downloadUrl: null
    }
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    setTimeout(() => {
      setResults(mockResults);
      setIsSearching(false);
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'sample_collected':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sample Collected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                Track Test Results
              </h1>
              <p className="text-lg text-muted-foreground">
                Enter your phone number or booking ID to track your test results
              </p>
            </div>

            {/* Search Form */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="text-primary" />
                  Search Your Results
                </CardTitle>
                <CardDescription>
                  Enter your phone number or booking ID to find your test results
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="search">Phone Number or Booking ID</Label>
                      <Input
                        id="search"
                        placeholder="Enter phone number or booking ID"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" disabled={isSearching}>
                        {isSearching ? 'Searching...' : 'Search'}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-heading font-semibold">Your Test Results</h2>
                
                {results.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{result.testType}</h3>
                            {getStatusBadge(result.status)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar size={16} />
                              <span>Test Date: {result.testDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText size={16} />
                              <span>Booking ID: {result.id}</span>
                            </div>
                            {result.reportDate && (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={16} />
                                <span>Report Ready: {result.reportDate}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          {result.status === 'completed' ? (
                            <Button className="flex items-center gap-2">
                              <Download size={16} />
                              Download Report
                            </Button>
                          ) : (
                            <Button variant="outline" disabled className="flex items-center gap-2">
                              <Clock size={16} />
                              Report Pending
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Help Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Test Status Explained</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Sample Collected</Badge>
                        <span className="text-sm">Your sample is being processed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Processing</Badge>
                        <span className="text-sm">Tests are being performed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                        <span className="text-sm">Results are ready for download</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Contact Support</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Can't find your results? Contact our support team.
                    </p>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        📞 Call: 9866812555
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        💬 WhatsApp Support
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default TrackTestResultsPage;