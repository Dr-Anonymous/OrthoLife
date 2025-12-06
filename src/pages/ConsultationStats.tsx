import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, User, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';

interface Patient {
  id: string;
  name: string;
  dob: string;
  sex: string;
  phone: string;
  drive_id: string | null;
}

interface Consultation {
  id: string;
  status: string;
  created_at: string;
  patient: Patient;
  visit_type?: string;
  location?: string;
  language?: string;
  consultation_data?: {
    location?: string;
    [key: string]: any;
  };
}

const ConsultationStats = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentViewMonth, setCurrentViewMonth] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data: Consultation[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'patient':
          aValue = a.patient.name.toLowerCase();
          bValue = b.patient.name.toLowerCase();
          break;
        case 'phone':
          aValue = a.patient.phone;
          bValue = b.patient.phone;
          break;
        case 'location':
          aValue = (a.location || '').toLowerCase();
          bValue = (b.location || '').toLowerCase();
          break;
        case 'visit_type':
          aValue = (a.visit_type || '').toLowerCase();
          bValue = (b.visit_type || '').toLowerCase();
          break;
        case 'status':
          aValue = a.status.toLowerCase();
          bValue = b.status.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const renderSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 ml-1 inline-block text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4 ml-1 inline-block text-primary" /> :
      <ArrowDown className="w-4 h-4 ml-1 inline-block text-primary" />;
  };

  const renderDetailsTable = (title: string, data: Consultation[]) => {
    const sortedData = sortData(data);

    return (
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                  Date {renderSortIcon('date')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('patient')}>
                  Patient Name {renderSortIcon('patient')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('phone')}>
                  Phone {renderSortIcon('phone')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('location')}>
                  Location {renderSortIcon('location')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('visit_type')}>
                  Payment {renderSortIcon('visit_type')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('status')}>
                  Status {renderSortIcon('status')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((consultation) => (
                <tr key={consultation.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(consultation.created_at), 'PPP')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {consultation.patient.drive_id ? (
                      <a href={`https://drive.google.com/drive/folders/${consultation.patient.drive_id}`} target="_blank" className="text-blue-600 hover:underline">
                        {consultation.patient.name}
                      </a>
                    ) : (
                      consultation.patient.name
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{consultation.patient.phone}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{consultation.location || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{consultation.visit_type || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${consultation.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {consultation.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
            {showMonthlyDetails && !isMonthlyLoading && renderDetailsTable(`Details for ${selectedDate ? format(selectedDate, 'MMMM yyyy') : ''}`, monthlyData)}
            {showDailyDetails && renderDetailsTable(`Details for ${selectedDate ? format(selectedDate, 'PPP') : ''}`, dailyData)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultationStats;