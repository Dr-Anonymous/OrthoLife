import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, FileText, AlertCircle, Briefcase, Beaker, Download, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import OrderMedicationCard from '@/components/OrderMedicationCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generatePdf } from '@/lib/pdfUtils';

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

const MySpace = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<any>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      navigate('/auth');
      return;
    }

    const fetchData = async () => {
      if (user?.phoneNumber) {
        try {
          setLoading(true);
          const phoneNumber = user.phoneNumber.slice(-10);

          const [recordsRes, testResultsRes, medicationsRes] = await Promise.all([
            supabase.functions.invoke('search-whatsappme-records', {
              body: { phoneNumber },
            }),
            supabase.functions.invoke('search-test-results', {
              body: { query: phoneNumber },
            }),
            supabase.functions.invoke('get-latest-prescription', {
              body: { phoneNumber },
            }),
          ]);

          if (recordsRes.error) throw new Error(`Error fetching records: ${recordsRes.error.message}`);
          if (testResultsRes.error) throw new Error(`Error fetching test results: ${testResultsRes.error.message}`);
          if (medicationsRes.error) throw new Error(`Error fetching medications: ${medicationsRes.error.message}`);

          setRecords(recordsRes.data);
          setTestResults(testResultsRes.data || {});
          setMedications(medicationsRes.data?.medications || []);

        } catch (err: any) {
          setError(err.message);
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        setError("No phone number associated with your account. Please re-login.");
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const isDeviated = (result: string, range: string) => {
    if (isNaN(parseFloat(result))) {
      const lowerResult = result.toLowerCase();
      const lowerRange = range.toLowerCase();
      if (lowerResult.includes("negative") && lowerRange.includes("negative")) return false;
      if (lowerResult.includes("positive") && lowerRange.includes("negative")) return true;
      if (lowerResult.includes("reactive") && lowerRange.includes("non-reactive")) return true;
      return false;
    }

    const rangeParts = range.split('-').map(part => parseFloat(part.trim()));
    if (rangeParts.length !== 2 || rangeParts.some(isNaN)) return false;

    const [min, max] = rangeParts;
    const value = parseFloat(result);
    return value < min || value > max;
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

  const formatAppointmentDescription = (description: string) => {
    if (!description) return '';
    const cutoff = description.indexOf('WhatsApp:');
    const truncatedDesc = cutoff !== -1 ? description.substring(0, cutoff) : description;
    return truncatedDesc.replace(/\n/g, '<br />');
  };


  if (authLoading) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow bg-gray-50 py-12">
        <div className="container mx-auto p-4 sm:p-6 md:p-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome to My Space</h1>
              {user?.phoneNumber && <p className="mt-1 text-lg text-gray-600">Your personal health dashboard (<strong>{user.phoneNumber}</strong>).</p>}
            </div>
            <Button onClick={handleLogout} variant="outline" className="mt-4 sm:mt-0">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </header>

          {loading && <div className="text-center py-10"><PageLoader /></div>}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && (
            <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8">
              <OrderMedicationCard medications={medications} />
              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center space-x-3">
                  <Briefcase className="h-6 w-6 text-primary" />
                  <CardTitle>My Prescriptions and Records</CardTitle>
                </CardHeader>
                <CardContent>
                  {records?.patientFolders?.length > 0 ? (
                    <ul className="space-y-3">
                      {records.patientFolders.map((record: any) => (
                        <a key={record.id} href={`https://drive.google.com/drive/folders/${record.id}`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                          <p className="font-medium text-gray-800">{record.name}</p>
                        </a>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No prescriptions/records found.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center space-x-3">
                  <Calendar className="h-6 w-6 text-primary" />
                  <CardTitle>My Appointments</CardTitle>
                </CardHeader>
                <CardContent>
                  {records?.calendarEvents?.length > 0 ? (
                    <ul className="space-y-3">
                      {records.calendarEvents.map((event: any, index: number) => (
                        <li key={index} className="p-4 bg-gray-100 rounded-lg">
                          <p className="font-semibold text-gray-800">{new Date(event.start).toLocaleString()}</p>
                          <div
                            className="text-gray-600 mt-1"
                            dangerouslySetInnerHTML={{ __html: formatAppointmentDescription(event.description) }}
                          />
                          {event.attachments && <a href={event.attachments} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">View Attachment</a>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No appointments found.</p>
                    <p>Want to <a href="/appointment">book an appointment</a>?</p>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="flex flex-row items-center space-x-3">
                  <Beaker className="h-6 w-6 text-primary" />
                  <CardTitle>My Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(testResults).length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(testResults).map(([patientName, tests]) => (
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
                  ) : (
                    <p className="text-gray-500">No test results found.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MySpace;