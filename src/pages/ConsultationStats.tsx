import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ChevronsRight } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';
import { ConsultationDetailsTable, Consultation } from '@/components/ConsultationDetailsTable';

const ConsultationStats = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentViewMonth, setCurrentViewMonth] = useState<string | null>(null);

  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [dailyData, setDailyData] = useState<Consultation[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<Consultation[]>([]);
  const [monthlyData, setMonthlyData] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMonthlyStatsLoading, setIsMonthlyStatsLoading] = useState(false);
  const [isDailyStatsLoading, setIsDailyStatsLoading] = useState(false);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [showDailyDetails, setShowDailyDetails] = useState(false);
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      fetchStats(selectedDate);
    }
  }, [selectedDate]);

  const fetchStats = async (date: Date) => {
    // setIsLoading(true); // Removed global loading
    setShowDailyDetails(false);
    setShowMonthlyDetails(false);

    const monthKey = format(date, 'yyyy-MM');
    const includeMonthly = monthKey !== currentViewMonth;

    setIsDailyStatsLoading(true);
    if (includeMonthly) {
      setIsMonthlyStatsLoading(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-consultation-stats', {
        body: {
          year: getYear(date),
          month: getMonth(date),
          day: date.getDate(),
          dataType: 'day',
          includeMonthly,
        },
      });

      if (error) throw error;

      if (includeMonthly) {
        setMonthlyCount(data.monthlyCount);
        setMonthlyStats(data.monthlyStats || []);
        setCurrentViewMonth(monthKey);
      }
      setDailyData(data.dailyData);
    } catch (error) {
      console.error('Error fetching consultation stats:', error);
      toast.error('Failed to fetch stats. Please try again.');
    } finally {
      setIsLoading(false);
      setIsDailyStatsLoading(false);
      setIsMonthlyStatsLoading(false);
    }
  };

  const fetchMonthlyDetails = async () => {
    if (!selectedDate) return;
    setIsMonthlyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-consultation-stats', {
        body: {
          year: getYear(selectedDate),
          month: getMonth(selectedDate),
          dataType: 'month',
        },
      });
      if (error) throw error;
      setMonthlyData(data.monthlyData);
      setShowMonthlyDetails(true);
    } catch (error) {
      console.error('Error fetching monthly details:', error);
      toast.error('Failed to fetch monthly details.');
    } finally {
      setIsMonthlyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="shadow-lg border-0 bg-card/95 backdrop-blur">
          <CardHeader className="text-center pb-8">
            <CardTitle className="flex items-center justify-center gap-3 text-2xl font-bold text-primary">
              <User className="w-7 h-7" />
              Consultation Statistics
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              View consultation counts by month and day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex justify-center">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
              </div>
              <div className="space-y-4">
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Summary</CardTitle>
                      <CardDescription>Total consultations for {selectedDate ? format(selectedDate, 'MMMM yyyy') : 'the selected month'}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isMonthlyStatsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                      ) : (
                        <>
                          <p className="text-4xl font-bold">{monthlyCount ?? 'N/A'}</p>
                          {monthlyStats.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {Object.entries(
                                monthlyStats.reduce((acc: { [key: string]: number }, curr) => {
                                  const loc = curr.location || 'Unknown';
                                  acc[loc] = (acc[loc] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([loc, count], i) => (
                                <span key={loc}>
                                  {i > 0 && ', '}
                                  {loc}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-sm font-medium text-muted-foreground">
                            Paid visits: {monthlyStats.filter(c => c.visit_type === 'paid').length > 0 ? (
                              monthlyStats
                                .filter(c => c.visit_type === 'paid')
                                .reduce((acc: { [key: string]: number }, curr) => {
                                  const loc = curr.location || 'Unknown';
                                  acc[loc] = (acc[loc] || 0) + 1;
                                  return acc;
                                }, {})
                              && Object.entries(
                                monthlyStats
                                  .filter(c => c.visit_type === 'paid')
                                  .reduce((acc: { [key: string]: number }, curr) => {
                                    const loc = curr.location || 'Unknown';
                                    acc[loc] = (acc[loc] || 0) + 1;
                                    return acc;
                                  }, {})
                              ).map(([loc, count], i) => (
                                <span key={loc}>
                                  {i > 0 && ', '}
                                  {loc}: {count}
                                </span>
                              ))
                            ) : '0'}
                          </div>
                          {monthlyCount !== null && monthlyCount > 0 && (
                            <Button variant="link" onClick={() => showMonthlyDetails ? setShowMonthlyDetails(false) : fetchMonthlyDetails()} className="px-0" disabled={isMonthlyLoading}>
                              {isMonthlyLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              {showMonthlyDetails ? 'Hide Details' : 'View Details'}
                              <ChevronsRight className={`w-4 h-4 ml-1 transition-transform ${showMonthlyDetails ? 'transform rotate-90' : ''}`} />
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Summary</CardTitle>
                      <CardDescription>Consultations for {selectedDate ? format(selectedDate, 'PPP') : 'the selected day'}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isDailyStatsLoading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                      ) : (
                        <>
                          <p className="text-4xl font-bold">{dailyData.length}</p>
                          {dailyData.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              {Object.entries(
                                dailyData.reduce((acc: { [key: string]: number }, curr) => {
                                  const loc = curr.location || 'Unknown';
                                  acc[loc] = (acc[loc] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([loc, count], i) => (
                                <span key={loc}>
                                  {i > 0 && ', '}
                                  {loc}: {count}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-sm font-medium text-muted-foreground">
                            Paid visits: {dailyData.filter(c => c.visit_type === 'paid').length > 0 ? (
                              Object.entries(
                                dailyData
                                  .filter(c => c.visit_type === 'paid')
                                  .reduce((acc: { [key: string]: number }, curr) => {
                                    const loc = curr.location || 'Unknown';
                                    acc[loc] = (acc[loc] || 0) + 1;
                                    return acc;
                                  }, {})
                              ).map(([loc, count], i) => (
                                <span key={loc}>
                                  {i > 0 && ', '}
                                  {loc}: {count}
                                </span>
                              ))
                            ) : '0'}
                          </div>
                          {dailyData.length > 0 && (
                            <Button variant="link" onClick={() => setShowDailyDetails(!showDailyDetails)} className="px-0">
                              {showDailyDetails ? 'Hide Details' : 'View Details'}
                              <ChevronsRight className={`w-4 h-4 ml-1 transition-transform ${showDailyDetails ? 'transform rotate-90' : ''}`} />
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              </div>
            </div>
            {showMonthlyDetails && !isMonthlyLoading && (
              <ConsultationDetailsTable
                title={`Details for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : ''}`}
                data={monthlyData}
              />
            )}
            {showDailyDetails && (
              <ConsultationDetailsTable
                title={`Details for ${selectedDate ? format(selectedDate, 'PPP') : ''}`}
                data={dailyData}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultationStats;