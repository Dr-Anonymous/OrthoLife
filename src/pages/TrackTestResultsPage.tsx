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
  testRange: string;
  comments: string | null;
}

const TrackTestResultsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Record<string, TestResult[]>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeviated = (result: string, range: string) => {
    // `result` is a string that can be a number or a value like "Positive" or "Negative".
    // `range` is a string representing a numerical range, e.g., "8-10", or a non-numerical value.

    // Handle non-numerical results first
    if (isNaN(parseFloat(result))) {
      const lowerResult = result.toLowerCase();
      const lowerRange = range.toLowerCase();
      if (lowerResult.includes("negative") && lowerRange.includes("negative")) return false;
      if (lowerResult.includes("positive") && lowerRange.includes("negative")) return true;
      if (lowerResult.includes("reactive") && lowerRange.includes("non-reactive")) return true;
      return false;
    }

    // `range` is a string representing a numerical range, e.g., "8-10".
    const rangeParts = range.split('-').map(part => parseFloat(part.trim()));

    // If range is not in the expected "min-max" format, don't highlight.
    if (rangeParts.length !== 2 || rangeParts.some(isNaN)) {
      return false;
    }

    const [min, max] = rangeParts;
    const value = parseFloat(result);

    return value < min || value > max;
  };

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

  const handleDownloadPdf = async (result: TestResult) => {
    setIsDownloading(true);
    const { patientName, testType, testDate, reportDate, testResult, testRange, comments } = result;

    const deviated = isDeviated(testResult, testRange);
    const resultColor = deviated ? 'color: #dc2626;' : '';

    const htmlContent = `
      <div style="font-family: sans-serif; color: #333;">
        <h1 style="text-align: center; color: #1e40af; margin-bottom: 2rem;">Test Report</h1>

        <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
          <p><strong>Patient:</strong> ${patientName}</p>
          <p><strong>Test Date:</strong> ${testDate}</p>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2rem;">
          <p><strong>Test Type:</strong> ${testType}</p>
          <p><strong>Report Date:</strong> ${reportDate || 'N/A'}</p>
        </div>

        <hr style="border-top: 1px solid #e5e7eb; margin: 2rem 0;" />

        <table style="width: 100%; border-collapse: collapse; text-align: center;">
          <thead>
            <tr>
              <th style="padding: 0.75rem; background-color: #f3f4f6;">Test</th>
              <th style="padding: 0.75rem; background-color: #f3f4f6;">Result</th>
              <th style="padding: 0.75rem; background-color: #f3f4f6;">Normal Range</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 0.75rem;">${testType}</td>
              <td style="padding: 0.75rem; font-weight: bold; ${resultColor}">${testResult}</td>
              <td style="padding: 0.75rem;">${testRange}</td>
            </tr>
          </tbody>
        </table>

        ${comments ? `
          <hr style="border-top: 1px solid #e5e7eb; margin: 2rem 0;" />
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">Comments</h2>
            <div style="white-space: pre-wrap;">${comments}</div>
          </div>
        ` : ''}
      </div>
    `;

    try {
      await generatePdf(htmlContent, `${result.patientName}'s ${result.testType} report`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsDownloading(false);
    }
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
                            <div className="space-y-4 py-4">
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">Test Date</p>
                                <p className="font-medium">{result.testDate}</p>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-sm text-muted-foreground">Report Date</p>
                                <p className="font-medium">{result.reportDate || 'Pending'}</p>
                              </div>
                              <div className="border-t border-muted my-4"></div>
                              <div className="grid grid-cols-3 items-center text-center font-semibold">
                                <p>Test</p>
                                <p>Result</p>
                                <p>Normal Range</p>
                              </div>
                              <div className="grid grid-cols-3 items-center text-center">
                                <p className="font-medium">{result.testType}</p>
                                <p className={`font-bold ${isDeviated(result.testResult, result.testRange) ? 'text-destructive' : ''}`}>
                                  {result.testResult}
                                </p>
                                <p className="text-sm text-muted-foreground">{result.testRange}</p>
                              </div>
                              {result.comments && (
                                <>
                                  <div className="border-t border-muted my-4"></div>
                                  <div>
                                    <p className="font-semibold mb-2">Comments</p>
                                    <div
                                      className="text-sm text-muted-foreground whitespace-pre-wrap"
                                      dangerouslySetInnerHTML={{ __html: result.comments }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                            {result.status === 'completed' ? (
                              <Button
                                className="flex items-center gap-2"
                                onClick={() => handleDownloadPdf(result)}
                                disabled={isDownloading}
                              >
                                <Download size={16} />
                                {isDownloading ? 'Downloading...' : 'Download Report'}
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
                      <Button onClick={(e) => { e.preventDefault(); window.location.href = 'tel:+919983849838'; }} variant="outline" className="w-full justify-start">
                        📞 Call: 99 838 49 838
                      </Button>
                      <Button onClick={(e) => { e.preventDefault(); window.location.href = 'https://wa.me/919983849838?text=Hi.%20I%20have%20a%20question.'; }} variant="outline" className="w-full justify-start">
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