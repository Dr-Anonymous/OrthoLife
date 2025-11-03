import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Beaker, User, Download, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

const TestResultsCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, TestResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchTestResults = async () => {
      if (user?.phoneNumber) {
        try {
          setLoading(true);
          const phoneNumber = user.phoneNumber.slice(-10);
          const { data, error } = await supabase.functions.invoke('search-test-results', {
            body: { query: phoneNumber },
          });

          if (error) throw new Error(`Error fetching test results: ${error.message}`);
          setTestResults(data || {});
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchTestResults();
  }, [user]);

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

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center space-x-3">
        <Beaker className="h-6 w-6 text-primary" />
        <CardTitle>{t('testResultsCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p>{t('testResultsCard.loading')}</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          Object.keys(testResults).length > 0 ? (
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
            <p className="text-gray-500">{t('testResultsCard.noResults')}</p>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default TestResultsCard;
