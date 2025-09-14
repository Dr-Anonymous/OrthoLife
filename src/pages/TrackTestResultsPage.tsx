import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generatePdf } from '@/lib/pdfUtils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TestResult {
  patientName: string;
  testDate: string;
  testType: string;
  status: string;
  reportDate: string | null;
  testResult: string;
  comments: string | null;
}

const TrackTestResultsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Record<string, TestResult[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDownloadPdf = (result: TestResult) => {
    const { patientName, testType, testDate, reportDate, testResult, testRange, comments} = result;
    const htmlContent = `
      <h1>Test Report</h1>
      <p><strong>Patient:</strong> ${patientName}</p>
      <p><strong>Test Type:</strong> ${testType}</p>
      <p><strong>Test Date:</strong> ${testDate}</p>
      <p><strong>Report Date:</strong> ${reportDate || 'N/A'}</p>
      <hr />
      <h2>Result</h2>
      <p>${testResult}</p>
      <h2>Normal Value</h2>
      <p>${testRange}</p>
      <hr />
      <h2>Comments</h2>
      <p>${comments}</p>
    `;
    generatePdf(htmlContent, `${result.patientName}'s ${result.testType} report`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'collected':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sample Collected</Badge>;
      case 'awaiting':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Awaiting Collection</Badge>;
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
                        <Dialog key={result.testType}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                            >
                              <span>{result.testType}</span>
                              {getStatusBadge(result.status)}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{result.testType}</DialogTitle>
                              <DialogDescription>
                                Test result for {result.patientName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-2 items-center gap-4">
                                <Label>Test Date</Label>
                                <span>{result.testDate}</span>
                              </div>
                              <div className="grid grid-cols-2 items-center gap-4">
                                <Label>Report Date</Label>
                                <span>{result.reportDate || 'Pending'}</span>
                              </div>
                              <div className="grid grid-cols-2 items-center gap-4">
                                <Label>Result</Label>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.testResult}</p>
                              </div>
                              <div className="grid grid-cols-2 items-center gap-4">
                                <Label>Normal Value</Label>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.testRange}</p>
                              </div>
                            {result.comments && (
                              <div className="col-span-4">
                                <Label>Comments:</Label>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.comments}</p>
                              </div>
                            )}
                            </div>
                            {result.status === 'completed' ? (
                              <Button className="flex items-center gap-2" onClick={() => handleDownloadPdf(result)}>
                                <Download size={16} />
                                Download Report
                              </Button>
                            ) : (
                              <Button variant="outline" disabled className="flex items-center gap-2">
                                <Clock size={16} />
                                Final Report Pending
                              </Button>
                            )}
                          </DialogContent>
                        </Dialog>
                      ))}
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
                        <Badge variant="outline">Awaiting</Badge>
                        <span className="text-sm">Awaiting sample collection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Collected</Badge>
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
                      <Button onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';}} variant="outline" className="w-full justify-start">
                        📞 Call: 9866812555
                      </Button>
                      <Button onClick={(e) => {e.preventDefault();window.location.href='https://wa.me/919866812555?text=Hi.%20I%20have%20a%20question.';}} variant="outline" className="w-full justify-start">
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