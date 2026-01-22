import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ChevronsRight, IndianRupee, BedDouble } from 'lucide-react';
import { format, getMonth, getYear, parseISO, isValid } from 'date-fns';
import { ConsultationDetailsTable, Consultation } from '@/components/ConsultationDetailsTable';
import { useHospitals } from '@/context/HospitalsContext';

interface Admission {
  id: string;
  admission_date: string;
  status: string;
  room_number: string | null;
  patient: {
    name: string;
  };
}

const ConsultationStats = () => {
  const { hospitals } = useHospitals();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentViewMonth, setCurrentViewMonth] = useState<string | null>(null);

  const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
  const [dailyData, setDailyData] = useState<Consultation[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<Consultation[]>([]);
  const [monthlyData, setMonthlyData] = useState<Consultation[]>([]);

  // Admissions State
  const [monthlyAdmissions, setMonthlyAdmissions] = useState<Admission[]>([]);
  const [monthlyAdmissionsCount, setMonthlyAdmissionsCount] = useState<number | null>(null);
  const [dailyAdmissions, setDailyAdmissions] = useState<Admission[]>([]);

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
    setShowDailyDetails(false);
    setShowMonthlyDetails(false);

    const startOfMonth = new Date(getYear(date), getMonth(date), 1).toISOString();
    const endOfMonth = new Date(getYear(date), getMonth(date) + 1, 0, 23, 59, 59, 999).toISOString();

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
        // Set Monthly Admissions
        setMonthlyAdmissionsCount(data.monthlyAdmissionsCount);
        setMonthlyAdmissions(data.monthlyAdmissions || []);
        setCurrentViewMonth(monthKey);
      }
      setDailyData(data.dailyData);
      // Set Daily Admissions
      setDailyAdmissions(data.dailyAdmissions || []);
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
    setSelectedDate(month);
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

  // Helper to calculate stats and collections
  const calculateStats = (data: Consultation[]) => {
    const counts: { [key: string]: number } = {};
    const paidCounts: { [key: string]: number } = {};
    const collections: { [key: string]: number } = {};
    let totalCollection = 0;

    data.forEach(curr => {
      const loc = curr.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;

      if (curr.visit_type === 'paid') {
        paidCounts[loc] = (paidCounts[loc] || 0) + 1;
        const hospital = hospitals.find(h => h.name === loc);
        // Safely access settings.op_fees
        const settings = hospital?.settings as any;
        const fees = settings?.op_fees ? Number(settings.op_fees) : 0;

        collections[loc] = (collections[loc] || 0) + fees;
        totalCollection += fees;
      }
    });

    return { counts, paidCounts, collections, totalCollection };
  };

  const renderStatsCard = (
    title: string,
    data: Consultation[],
    count: number | null,
    isLoading: boolean,
    showDetails: boolean,
    toggleDetails: () => void,
    isDetailsLoading: boolean = false,
    admissions: Admission[] = [],
    admissionsCount: number | null = null
  ) => {
    const { counts, paidCounts, collections, totalCollection } = calculateStats(data);
    const displayedAdmissionsCount = admissionsCount !== null ? admissionsCount : admissions.length;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {title === 'Monthly Summary'
              ? `Total consultations for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : 'selected month'}.`
              : `Consultations for ${selectedDate ? format(selectedDate, 'PPP') : 'selected day'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Consultations Section */}
              <div>
                <p className="text-4xl font-bold">{count ?? 'N/A'}</p>

                {/* Counts by Location */}
                {Object.keys(counts).length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    {Object.entries(counts).map(([loc, c], i) => (
                      <span key={loc}>
                        {i > 0 && ', '}
                        {loc}: {c}
                      </span>
                    ))}
                  </div>
                )}

                {/* Paid Visits & Collection */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <IndianRupee className="w-4 h-4" />
                    <span>Total Collection: ₹{totalCollection.toLocaleString()}</span>
                  </div>
                  {Object.keys(collections).length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      {Object.entries(collections).map(([loc, amount], i) => (
                        <span key={loc}>
                          {i > 0 && ' | '}
                          {loc}: ₹{amount.toLocaleString()} <span className="text-xs text-muted-foreground/70">({paidCounts[loc] || 0} paid)</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {count !== null && count > 0 && (
                  <Button variant="link" onClick={toggleDetails} className="px-0 mt-2" disabled={isDetailsLoading}>
                    {isDetailsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {showDetails ? 'Hide Details' : 'View Details'}
                    <ChevronsRight className={`w-4 h-4 ml-1 transition-transform ${showDetails ? 'transform rotate-90' : ''}`} />
                  </Button>
                )}
              </div>

              {/* Admissions Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <BedDouble className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-semibold text-foreground">In-Patient Admissions</h3>
                </div>
                <p className="text-3xl font-bold text-foreground">{displayedAdmissionsCount ?? '0'}</p>

                {admissions.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {admissions.slice(0, 5).map((admission) => (
                      <div key={admission.id} className="text-sm flex justify-between items-center text-muted-foreground">
                        <span>{admission.patient?.name || 'Unknown'}</span>
                        <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded">
                          {admission.room_number ? `Room ${admission.room_number}` : 'No Room'}
                        </span>
                      </div>
                    ))}
                    {admissions.length > 5 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        + {admissions.length - 5} more
                      </p>
                    )}
                  </div>
                )}
                {admissions.length === 0 && displayedAdmissionsCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {displayedAdmissionsCount} admissions recorded.
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
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
              View consultation counts, collections, and admissions
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
                  className="rounded-md border h-fit"
                  components={{
                    DayContent: (props) => {
                      const { date } = props;
                      const dayStr = format(date, 'yyyy-MM-dd');
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
                {renderStatsCard(
                  'Monthly Summary',
                  monthlyStats,
                  monthlyCount,
                  isMonthlyStatsLoading,
                  showMonthlyDetails,
                  () => showMonthlyDetails ? setShowMonthlyDetails(false) : fetchMonthlyDetails(),
                  isMonthlyLoading,
                  // For monthly card: If we have explicit `monthlyAdmissions` array (which we fetch in backend for monthly now properly), pass it.
                  // Wait, check fetchStats logic again. I am setting monthlyAdmissions state now.
                  monthlyAdmissions,
                  monthlyAdmissionsCount
                )}
                {renderStatsCard(
                  'Daily Summary',
                  dailyData,
                  dailyData.length,
                  isDailyStatsLoading,
                  showDailyDetails,
                  () => setShowDailyDetails(!showDailyDetails),
                  false,
                  dailyAdmissions,
                  dailyAdmissions.length
                )}
              </div>
            </div>
            {showMonthlyDetails && !isMonthlyLoading && (
              <ConsultationDetailsTable
                title={`Details for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : ''}`}
                data={monthlyData}
                onFilteredDataChange={setFilteredMonthlyData}
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