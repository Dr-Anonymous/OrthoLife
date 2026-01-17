import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ChevronsRight } from 'lucide-react';
import { format, getMonth, getYear, parseISO, isValid } from 'date-fns';
import { ConsultationDetailsTable, Consultation } from '@/components/ConsultationDetailsTable';

const ConsultationStats = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentViewMonth, setCurrentViewMonth] = useState<string | null>(null);

  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [dailyData, setDailyData] = useState<Consultation[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<Consultation[]>([]);
  const [monthlyData, setMonthlyData] = useState<Consultation[]>([]);
  const [filteredMonthlyData, setFilteredMonthlyData] = useState<Consultation[]>([]);
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

    // Calculate dates for client-side fetch
    const startOfMonth = new Date(getYear(date), getMonth(date), 1).toISOString();
    const endOfMonth = new Date(getYear(date), getMonth(date) + 1, 0, 23, 59, 59, 999).toISOString(); // End of month, end of day

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
        console.log('Fetched monthlyStats:', data.monthlyStats?.length, 'Sample:', data.monthlyStats?.[0]);
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

  const handleMonthChange = (month: Date) => {
    fetchStats(month);
    setMonthlyData([]);
    setFilteredMonthlyData([]);
    setShowMonthlyDetails(false);
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
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  onMonthChange={handleMonthChange}
                  className="rounded-md border"
                  components={{
                    DayContent: (props) => {
                      const { date } = props;
                      const dayStr = format(date, 'yyyy-MM-dd');
                      // Use filteredMonthlyData if available (when table is shown and filtered), otherwise monthlyData (when table shown but no filter change yet, or logic below)
                      // Actually, if we set filteredMonthlyData to monthlyData initially, we can just use filteredMonthlyData.
                      // Let's rely on filteredMonthlyData which should correspond to what's in the table.
                      const stats = filteredMonthlyData.length > 0 || showMonthlyDetails ? filteredMonthlyData : [];

                      const count = stats.filter(s => {
                        if (!s.created_at) return false;
                        const d = typeof s.created_at === 'string' ? parseISO(s.created_at) : new Date(s.created_at);
                        return isValid(d) && format(d, 'yyyy-MM-dd') === dayStr;
                      }).length;

                      return (
                        <div className="flex flex-col items-center justify-center relative w-full h-full p-1 h-9 w-9">
                          <span className="text-sm font-normal">{date.getDate()}</span>
                          {count > 0 && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {count}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    },
                    IconLeft: ({ ...props }) => <ChevronsRight className="h-4 w-4 rotate-180" />,
                    IconRight: ({ ...props }) => <ChevronsRight className="h-4 w-4" />,
                  }}
                />
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
                onFilteredDataChange={setFilteredMonthlyData} // Pass the setter
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