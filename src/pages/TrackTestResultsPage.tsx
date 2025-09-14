import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Download, Clock, CheckCircle, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TestResult {
  testId: string;
  patientName: string;
  testDate: string;
  testType: string;
  status: string;
  reportDate: string | null;
  testResult: string;
}

const TrackTestResultsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Record<string, TestResult[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    setResults({});

    try {
      const { data, error } = await supabase.functions.invoke('search-test-results', {
        body: { query: searchQuery },
      });

      if (error) {
        throw new Error(error.message);
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
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
                  Enter your phone number to find your test results
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="search">Phone Number</Label>
                      <Input
                        id="search"
                        placeholder="Enter phone number"
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

            {/* Error Message */}
            {error && (
              <Card className="mb-8 bg-destructive/10 border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Search Failed</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {Object.keys(results).length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-heading font-semibold">Your Test Results</h2>
                
                {Object.entries(results).map(([patientName, tests]) => (
                  <Card key={patientName}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User /> {patientName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {tests.map((result) => (
                        <Button
                          key={result.testId}
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setSelectedTest(result)}
                        >
                          <span>{result.testType}</span>
                          {getStatusBadge(result.status)}
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Test Details Modal */}
            <Dialog open={!!selectedTest} onOpenChange={(isOpen) => !isOpen && setSelectedTest(null)}>
              <DialogContent>
                {selectedTest && (
                  <>
                    <DialogHeader>
                      <DialogTitle>{selectedTest.testType}</DialogTitle>
                      <DialogDescription>
                        Test result for {selectedTest.patientName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label>Test Date</Label>
                        <span>{selectedTest.testDate}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label>Report Date</Label>
                        <span>{selectedTest.reportDate || 'Pending'}</span>
                      </div>
                      <div className="grid grid-cols-2 items-center gap-4">
                        <Label>Status</Label>
                        {getStatusBadge(selectedTest.status)}
                      </div>
                      <div className="col-span-2">
                        <Label>Result</Label>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTest.testResult}</p>
                      </div>
                    </div>
                    {selectedTest.status === 'completed' ? (
                      <Button className="flex items-center gap-2" onClick={() => alert('Download functionality to be implemented.')}>
                        <Download size={16} />
                        Download Report
                      </Button>
                    ) : (
                      <Button variant="outline" disabled className="flex items-center gap-2">
                        <Clock size={16} />
                        Report Pending
                      </Button>
                    )}
                  </>
                )}
              </DialogContent>
            </Dialog>

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