import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ChevronsRight, IndianRupee, BedDouble } from 'lucide-react';
import { format, getMonth, getYear, parseISO, isValid } from 'date-fns';
import { ConsultationDetailsTable } from '@/components/ConsultationDetailsTable';
import { Consultation } from '@/types/consultation';
import { useHospitals } from '@/context/HospitalsContext';

interface Admission {
  id: string;
  admission_date: string;
  status: string;
  room_number: string | null;
  patient: {
    name: string;
  };
  total_bill?: number;
  consultant_cut?: number;
  referral_amount?: number;
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
    const consultantShares: { [key: string]: number } = {};
    const procedureCollectionsByLoc: { [key: string]: number } = {};
    const procedureSharesByLoc: { [key: string]: number } = {};
    let totalCollection = 0;
    let opCollections = 0;
    let opConsultantShare = 0;
    let procedureCollections = 0;
    let procedureConsultantShare = 0;
    let opReferralPayouts = 0;

    data.forEach(curr => {
      const loc = curr.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;

      if (curr.visit_type === 'paid') {
        paidCounts[loc] = (paidCounts[loc] || 0) + 1;
        const hospital = hospitals.find(h => h.name === loc);
        const settings = hospital?.settings as any;
        const fees = settings?.op_fees ? Number(settings.op_fees) : 0;
        const opCut = settings?.consultant_cut ? Number(settings.consultant_cut) : 0;

        collections[loc] = (collections[loc] || 0) + fees;
        consultantShares[loc] = (consultantShares[loc] || 0) + opCut;
        opCollections += fees;
        opConsultantShare += opCut;
      }

      // Procedure & Referrals
      // Uses extracted fields from backend
      const procFee = Number(curr.procedure_fee) || 0;
      const procCut = Number(curr.procedure_consultant_cut) || 0;
      const refAmt = Number(curr.referral_amount) || 0;

      if (procFee > 0) {
        procedureCollectionsByLoc[loc] = (procedureCollectionsByLoc[loc] || 0) + procFee;
        procedureSharesByLoc[loc] = (procedureSharesByLoc[loc] || 0) + procCut;
      }

      procedureCollections += procFee;
      procedureConsultantShare += procCut;
      opReferralPayouts += refAmt;
    });

    totalCollection = opCollections + procedureCollections;

    return {
      counts,
      paidCounts,
      collections,
      consultantShares,
      procedureCollectionsByLoc,
      procedureSharesByLoc,
      totalCollection,
      financials: {
        opCollections,
        opConsultantShare,
        procedureCollections,
        procedureConsultantShare,
        opReferralPayouts
      }
    };
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
    const { counts, paidCounts, collections, consultantShares, totalCollection } = calculateStats(data);
    const displayedAdmissionsCount = admissionsCount !== null ? admissionsCount : admissions.length;

    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {title === 'Monthly Summary'
              ? `Overview for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : 'selected month'}.`
              : `Overview for ${selectedDate ? format(selectedDate, 'PPP') : 'selected day'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Consultations Section */}
              <div>


                {/* Counts by Location - Tabular Format */}
                {Object.keys(counts).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-primary">Patient Visits</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="h-8 py-1">Location</TableHead>
                            <TableHead className="h-8 py-1 text-center">Total</TableHead>
                            <TableHead className="h-8 py-1 text-center">Paid</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(counts).map(([loc, c]) => (
                            <TableRow key={loc} className="h-8">
                              <TableCell className="py-1 font-medium">{loc}</TableCell>
                              <TableCell className="py-1 text-center">{c}</TableCell>
                              <TableCell className="py-1 text-center">{paidCounts[loc] || 0}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>

                        <TableFooter>
                          <TableRow className="h-8 bg-muted/30">
                            <TableCell className="py-1 font-bold">Total</TableCell>
                            <TableCell className="py-1 text-center font-bold">{count ?? 0}</TableCell>
                            <TableCell className="py-1 text-center font-bold">{Object.values(paidCounts).reduce((a, b) => a + b, 0)}</TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                )}


                {count !== null && count > 0 && (
                  <Button variant="link" onClick={toggleDetails} className="px-0 mt-2" disabled={isDetailsLoading}>
                    {isDetailsLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {showDetails ? 'Hide Details' : 'View Details'}
                    <ChevronsRight className={`w-4 h-4 ml-1 transition-transform ${showDetails ? 'transform rotate-90' : ''}`} />
                  </Button>
                )}
              </div>

              {/* Admissions Section */}
              <div className="pt-4 border-t space-y-4">
                {/* Financial Breakdown */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-primary">Financial Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">

                    <div className="bg-muted/30 p-2 rounded col-span-2">
                      <p className="text-muted-foreground font-semibold mb-2">OP Collections</p>
                      {Object.keys(collections).length > 0 ? (
                        <div className="bg-background rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-8 py-1 px-2">Location</TableHead>
                                <TableHead className="h-8 py-1 px-2 text-right">Collection</TableHead>
                                <TableHead className="h-8 py-1 px-2 text-right text-muted-foreground">Share</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(collections).map(([loc, amount]) => (
                                <TableRow key={loc} className="h-8 border-b-0">
                                  <TableCell className="py-1 px-2 font-medium">{loc}</TableCell>
                                  <TableCell className="py-1 px-2 text-right">₹{amount.toLocaleString()}</TableCell>
                                  <TableCell className="py-1 px-2 text-right text-muted-foreground">₹{consultantShares[loc]?.toLocaleString() || 0}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow className="h-8 bg-muted/30">
                                <TableCell className="py-1 px-2 font-bold">Total</TableCell>
                                <TableCell className="py-1 px-2 text-right font-bold">₹{calculateStats(data).financials.opCollections.toLocaleString()}</TableCell>
                                <TableCell className="py-1 px-2 text-right font-bold text-muted-foreground">₹{calculateStats(data).financials.opConsultantShare.toLocaleString()}</TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-2">No collections</div>
                      )}
                    </div>
                    <div className="bg-muted/30 p-2 rounded col-span-2">
                      <p className="text-muted-foreground font-semibold mb-2">Procedures (OP)</p>
                      {calculateStats(data).financials.procedureCollections > 0 ? (
                        <div className="bg-background rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-8 py-1 px-2">Location</TableHead>
                                <TableHead className="h-8 py-1 px-2 text-right">Collection</TableHead>
                                <TableHead className="h-8 py-1 px-2 text-right text-muted-foreground">Share</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {Object.entries(calculateStats(data).procedureCollectionsByLoc).map(([loc, amount]) => (
                                <TableRow key={loc} className="h-8 border-b-0">
                                  <TableCell className="py-1 px-2 font-medium">{loc}</TableCell>
                                  <TableCell className="py-1 px-2 text-right">₹{amount.toLocaleString()}</TableCell>
                                  <TableCell className="py-1 px-2 text-right text-muted-foreground">₹{calculateStats(data).procedureSharesByLoc[loc]?.toLocaleString() || 0}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow className="h-8 bg-muted/30">
                                <TableCell className="py-1 px-2 font-bold">Total</TableCell>
                                <TableCell className="py-1 px-2 text-right font-bold">₹{calculateStats(data).financials.procedureCollections.toLocaleString()}</TableCell>
                                <TableCell className="py-1 px-2 text-right font-bold text-muted-foreground">₹{calculateStats(data).financials.procedureConsultantShare.toLocaleString()}</TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-2">No procedures</div>
                      )}
                    </div>
                    {admissions.length > 0 && (
                      <div className="bg-muted/30 p-2 rounded col-span-2">
                        <p className="text-muted-foreground text-xs">IP Financials</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="font-medium">Bill: ₹{admissions.reduce((sum, a) => sum + (Number(a.total_bill) || 0), 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Consultant Cut</p>
                            <p className="font-medium text-green-600">₹{admissions.reduce((sum, a) => sum + (Number(a.consultant_cut) || 0), 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-red-50 p-2 rounded col-span-2 border border-red-100">
                      <div className="flex justify-between">
                        <span className="text-xs text-red-600 font-medium">Referral Payouts</span>
                        <span className="text-xs font-bold text-red-700">
                          - ₹{(calculateStats(data).financials.opReferralPayouts + admissions.reduce((sum, a) => sum + (Number(a.referral_amount) || 0), 0)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admissions List */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BedDouble className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-foreground">Admissions ({displayedAdmissionsCount ?? '0'})</h3>
                  </div>

                  {admissions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {admissions.slice(0, 5).map((admission) => (
                        <div key={admission.id} className="text-sm flex justify-between items-center text-muted-foreground border-b border-dashed pb-1 last:border-0">
                          <span>{admission.patient?.name || 'Unknown'}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-600 font-mono">
                              {admission.consultant_cut ? `+₹${admission.consultant_cut}` : ''}
                            </span>
                            <span className="text-xs bg-secondary/50 px-2 py-0.5 rounded">
                              {admission.room_number ? admission.room_number : 'Day Care'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {admissions.length > 5 && (
                        <p className="text-xs text-muted-foreground pt-1">
                          + {admissions.length - 5} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card >
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="container mx-auto max-w-7xl space-y-8">

        {/* Header Section */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 text-2xl font-bold text-primary mb-2">
            <User className="w-7 h-7" />
            Consultation Statistics
          </div>
          <p className="text-lg text-muted-foreground">
            View consultation counts, collections, and admissions
          </p>
        </div>

        {/* Main Grid: Calendar & Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Calendar */}
          <Card className="shadow-md border-0 bg-card/95 backdrop-blur">
            <CardContent className="p-6 flex justify-center h-full items-center">
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
            </CardContent>
          </Card>

          {/* Column 2: Monthly Stats */}
          <div className="h-full">
            {renderStatsCard(
              'Monthly Summary',
              monthlyStats,
              monthlyCount,
              isMonthlyStatsLoading,
              showMonthlyDetails,
              () => showMonthlyDetails ? setShowMonthlyDetails(false) : fetchMonthlyDetails(),
              isMonthlyLoading,
              monthlyAdmissions,
              monthlyAdmissionsCount
            )}
          </div>

          {/* Column 3: Daily Stats */}
          <div className="h-full">
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

        {/* Details Section */}
        {(showMonthlyDetails || showDailyDetails) && (
          <Card className="shadow-lg border-0 bg-card/95 backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader>
              <CardTitle>Detailed Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
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
        )}
      </div>
    </div>
  );
};

export default ConsultationStats;