import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Beaker, User, Download, Clock, Loader2, XCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generatePdf } from '@/lib/pdfUtils';

interface OrderTestsCardProps {
  investigations: string;
}

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

const OrderTestsCard: React.FC<OrderTestsCardProps> = ({ investigations }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Prescribed Tests State
  const [labInvestigations, setLabInvestigations] = useState('');
  const [radiologicalInvestigations, setRadiologicalInvestigations] = useState<string[]>([]);

  // Test Results State
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reorders State
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [cancellingSub, setCancellingSub] = useState<string | null>(null);

  // Effect for Prescribed Tests
  useEffect(() => {
    const radiologicalKeywords = ['xray', 'usg', 'mri', 'ct'];
    const allInvestigations = investigations.split('\n').filter(line => line.trim());

    const lab = allInvestigations.filter(line =>
      !radiologicalKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    const radiological = allInvestigations.filter(line =>
      radiologicalKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );

    setLabInvestigations(lab.join('\n'));
    setRadiologicalInvestigations(radiological);
  }, [investigations]);

  // Effect for Test Results and Reorders
  useEffect(() => {
    if (user?.phoneNumber) {
      fetchTestResults();
      fetchOrderHistory();
    } else {
      setLoadingResults(false);
    }
  }, [user]);

  const fetchTestResults = async () => {
    try {
      setLoadingResults(true);
      const phoneNumber = user?.phoneNumber?.slice(-10);
      const { data, error } = await supabase.functions.invoke('search-test-results', {
        body: { query: phoneNumber },
      });

      if (error) throw new Error(`Error fetching test results: ${error.message}`);
      setTestResults(data || {});
    } catch (err: any) {
      setResultsError(err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchOrderHistory = async () => {
    try {
      setLoadingHistory(true);
      const { data, error } = await supabase.functions.invoke('get-order-history', {
        body: { userId: user?.phoneNumber }
      });

      if (error) throw error;

      // Filter for diagnostics subscriptions
      const diagnosticsSubs = (data.subscriptions || []).filter((sub: any) =>
        sub.type === 'diagnostics'
      );
      setSubscriptions(diagnosticsSubs);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOrderNow = () => {
    const query = labInvestigations.replace(/\n/g, ',');
    navigate(`/diagnostics?q=${encodeURIComponent(query)}`);
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
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('testResultsCard.status.completed')}</Badge>;
      case 'processing':
        return <Badge variant="secondary">{t('testResultsCard.status.processing')}</Badge>;
      case 'collected':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t('testResultsCard.status.collected')}</Badge>;
      case 'awaiting':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{t('testResultsCard.status.awaiting')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      setCancellingSub(subscriptionId);
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId,
          userId: user?.phoneNumber
        }
      });

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your auto-reorder subscription has been cancelled.",
      });

      fetchOrderHistory();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCancellingSub(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center space-x-3 pb-2">
        <Beaker className="h-6 w-6 text-primary" />
        <CardTitle>{t('orderTestsCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="prescribed" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="prescribed">Prescribed Tests</TabsTrigger>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="reorders">Reorders</TabsTrigger>
          </TabsList>

          <TabsContent value="prescribed">
            {!investigations ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">{t('orderTestsCard.noInvestigations')}</p>
                <Button onClick={() => navigate('/diagnostics')} className="w-full">
                  {t('orderTestsCard.orderNew')}
                </Button>
              </div>
            ) : (
              <>
                {labInvestigations && (
                  <>
                    <p>{t('orderTestsCard.labTestsFromPrescription')}</p>
                    <Textarea
                      value={labInvestigations}
                      onChange={(e) => setLabInvestigations(e.target.value)}
                      className="mt-2"
                      rows={5}
                    />
                    <Button onClick={handleOrderNow} className="w-full mt-4">
                      {t('orderTestsCard.orderNow')}
                    </Button>
                  </>
                )}

                {radiologicalInvestigations.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-800">{t('orderTestsCard.radiologicalInvestigations')}</h3>
                    <div className="mt-2 text-sm text-gray-700">
                      {radiologicalInvestigations.map((investigation, index) => (
                        <p key={index} className="py-1">{investigation}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="results">
            {loadingResults && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
            {resultsError && <p className="text-red-500">{resultsError}</p>}
            {!loadingResults && !resultsError && (
              Object.keys(testResults).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(testResults).map(([patientName, tests]) => (
                    <Card key={patientName} className="border-0 shadow-none">
                      <CardHeader className="px-0 py-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <User className="h-4 w-4" /> {patientName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-0 space-y-2">
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
                                  {t('testResultsCard.dialog.description', { patientName: result.patientName })}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="flex justify-between items-center">
                                  <p className="text-sm text-muted-foreground">{t('testResultsCard.dialog.testDate')}</p>
                                  <p className="font-medium">{result.testDate}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                  <p className="text-sm text-muted-foreground">{t('testResultsCard.dialog.reportDate')}</p>
                                  <p className="font-medium">{result.reportDate || t('testResultsCard.dialog.pending')}</p>
                                </div>
                                <div className="border-t border-muted my-4"></div>
                                <div className="grid grid-cols-3 items-center text-center font-semibold">
                                  <p>{t('testResultsCard.dialog.test')}</p>
                                  <p>{t('testResultsCard.dialog.result')}</p>
                                  <p>{t('testResultsCard.dialog.normalRange')}</p>
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
                                      <p className="font-semibold mb-2">{t('testResultsCard.dialog.comments')}</p>
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
                                  {isDownloading ? t('testResultsCard.dialog.downloading') : t('testResultsCard.dialog.downloadReport')}
                                </Button>
                              ) : (
                                <Button variant="outline" disabled className="flex items-center gap-2">
                                  <Clock size={16} />
                                  {t('testResultsCard.dialog.reportPending')}
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
                <p className="text-gray-500 text-center py-4">{t('testResultsCard.noResults')}</p>
              )
            )}
          </TabsContent>

          <TabsContent value="reorders">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active subscriptions.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {subscriptions.map((sub) => (
                  <div key={sub.id} className="border rounded-lg p-3 text-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {sub.frequency.charAt(0).toUpperCase() + sub.frequency.slice(1)} Subscription
                          {sub.status === 'cancelled' && <Badge variant="destructive" className="text-[10px] h-5">Cancelled</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Next run: {format(new Date(sub.next_run_date), 'PPP')}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      {Array.isArray(sub.items) ? (
                        <ul className="list-disc list-inside">
                          {sub.items.map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.name} x {item.quantity}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span>{sub.items.length} items</span>
                      )}
                    </div>
                    {sub.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => handleCancelSubscription(sub.id)}
                        disabled={cancellingSub === sub.id}
                      >
                        {cancellingSub === sub.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default OrderTestsCard;
