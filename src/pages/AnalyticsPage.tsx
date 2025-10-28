import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsRight, ArrowRight } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';

interface UserActivity {
  created_at: string;
  user_phone: string;
  page_visited: string;
}

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [monthlyViewType, setMonthlyViewType] = useState<'date' | 'user'>('date');

  const processedTrails = useMemo(() => {
    if (!userActivity || userActivity.length === 0) {
      return {};
    }

    return userActivity.reduce((acc, activity) => {
      const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
      const user = activity.user_phone;

      if (viewMode === 'day') {
        if (!acc[user]) acc[user] = [];
        acc[user].push(activity);
      } else { // month view
        if (monthlyViewType === 'date') {
          if (!acc[date]) acc[date] = {};
          if (!acc[date][user]) acc[date][user] = [];
          acc[date][user].push(activity);
        } else { // user-wise
          if (!acc[user]) acc[user] = {};
          if (!acc[user][date]) acc[user][date] = [];
          acc[user][date].push(activity);
        }
      }
      return acc;
    }, {} as any);
  }, [userActivity, viewMode, monthlyViewType]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('analytics').select('*').order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setAnalyticsData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch analytics data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchUserActivity(selectedDate, viewMode);
    }
  }, [selectedDate, viewMode]);

  const fetchUserActivity = async (date: Date, mode: 'day' | 'month') => {
    setIsActivityLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-user-activity', {
        body: {
          year: getYear(date),
          month: getMonth(date),
          day: date.getDate(),
          view: mode,
        },
      });

      if (error) throw error;
      setUserActivity(data.data || []);
    } catch (error) {
      console.error('Error fetching user activity:', error);
      setUserActivity([]);
    } finally {
      setIsActivityLoading(false);
    }
  };

  const processedData = useMemo(() => {
    if (analyticsData.length === 0) {
      return null;
    }

    const pageViews = analyticsData
      .filter(d => d.event_type === 'page_view')
      .reduce((acc, curr) => {
        acc[curr.path] = (acc[curr.path] || 0) + 1;
        return acc;
      }, {});

    const popularBlogPosts = analyticsData
      .filter(d => d.details?.page === 'blog-post')
      .reduce((acc, curr) => {
        const postId = curr.details.postId;
        acc[postId] = (acc[postId] || 0) + 1;
        return acc;
      }, {});

    const popularGuides = analyticsData
      .filter(d => d.details?.page === 'patient-guide')
      .reduce((acc, curr) => {
        const guideId = curr.details.guideId;
        acc[guideId] = (acc[guideId] || 0) + 1;
        return acc;
      }, {});

    const medicineCartAdds = analyticsData
      .filter(d => d.event_type === 'add_to_cart' && d.details?.page === 'pharmacy')
      .reduce((acc, curr) => {
        const medicineName = curr.details.medicineName;
        acc[medicineName] = (acc[medicineName] || 0) + 1;
        return acc;
      }, {});

    const testCartAdds = analyticsData
      .filter(d => d.event_type === 'add_to_cart' && d.details?.page === 'diagnostics')
      .reduce((acc, curr) => {
        const testName = curr.details.testName;
        acc[testName] = (acc[testName] || 0) + 1;
        return acc;
      }, {});

    const medicinePurchases = analyticsData
      .filter(d => d.event_type === 'purchase' && d.details?.page === 'pharmacy')
      .flatMap(d => d.details.items)
      .reduce((acc, item) => {
        acc[item.displayName] = (acc[item.displayName] || 0) + item.quantity;
        return acc;
      }, {});

    const testPurchases = analyticsData
      .filter(d => d.event_type === 'purchase' && d.details?.page === 'diagnostics')
      .flatMap(d => d.details.items)
      .reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {});

    const formatDataForChart = (data: Record<string, number>) => {
      return Object.entries(data)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    };

    return {
      pageViews: formatDataForChart(pageViews),
      popularBlogPosts: formatDataForChart(popularBlogPosts),
      popularGuides: formatDataForChart(popularGuides),
      medicineCartAdds: formatDataForChart(medicineCartAdds),
      testCartAdds: formatDataForChart(testCartAdds),
      medicinePurchases: formatDataForChart(medicinePurchases),
      testPurchases: formatDataForChart(testPurchases),
    };
  }, [analyticsData]);

  const renderChart = (data: { name: string; value: number }[], title: string, barKey: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={barKey} fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Analytics Dashboard</h1>

          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Activity</CardTitle>
                <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'day' | 'month') => value && setViewMode(value)}>
                  <ToggleGroupItem value="day">Day View</ToggleGroupItem>
                  <ToggleGroupItem value="month">Month View</ToggleGroupItem>
                </ToggleGroup>
              </div>
              {viewMode === 'month' && (
                <div className="flex justify-end mt-2">
                  <ToggleGroup type="single" value={monthlyViewType} onValueChange={(value: 'date' | 'user') => value && setMonthlyViewType(value)}>
                    <ToggleGroupItem value="date">Date Wise</ToggleGroupItem>
                    <ToggleGroupItem value="user">User Wise</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex justify-center">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
                </div>
                <div>
                  {isActivityLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : (
                    <div className="overflow-y-auto h-[400px] pr-4">
                      {viewMode === 'day' && Object.keys(processedTrails).map(user => (
                        <div key={user} className="mb-4 p-2 border rounded">
                          <h4 className="font-semibold">{user}</h4>
                          <Trail trail={processedTrails[user]} />
                        </div>
                      ))}
                      {viewMode === 'month' && monthlyViewType === 'date' && Object.keys(processedTrails).map(date => (
                        <div key={date} className="mb-4">
                          <h3 className="text-lg font-bold my-2">{format(new Date(date), 'PPP')}</h3>
                          {Object.keys(processedTrails[date]).map(user => (
                            <div key={user} className="mb-2 p-2 border rounded">
                              <h4 className="font-semibold">{user}</h4>
                              <Trail trail={processedTrails[date][user]} />
                            </div>
                          ))}
                        </div>
                      ))}
                      {viewMode === 'month' && monthlyViewType === 'user' && Object.keys(processedTrails).map(user => (
                        <div key={user} className="mb-4 p-2 border rounded">
                          <h3 className="text-lg font-bold my-2">{user}</h3>
                          {Object.keys(processedTrails[user]).map(date => (
                             <div key={date} className="mb-2">
                               <h4 className="font-semibold text-sm text-muted-foreground">{format(new Date(date), 'PPP')}</h4>
                               <Trail trail={processedTrails[user][date]} />
                             </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {loading && (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && processedData && (
            <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
              {renderChart(processedData.pageViews, 'Page Views', 'value')}
              {renderChart(processedData.popularBlogPosts, 'Popular Blog Posts (by ID)', 'value')}
              {renderChart(processedData.popularGuides, 'Popular Patient Guides (by ID)', 'value')}
              {renderChart(processedData.medicineCartAdds, 'Top Medicines Added to Cart', 'value')}
              {renderChart(processedData.testCartAdds, 'Top Tests Added to Cart', 'value')}
              {renderChart(processedData.medicinePurchases, 'Top Selling Medicines', 'value')}
              {renderChart(processedData.testPurchases, 'Top Booked Tests', 'value')}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};
const Trail = ({ trail }: { trail: UserActivity[] }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    {trail.map((activity, index) => (
      <React.Fragment key={activity.created_at}>
        <div className="flex flex-col items-center">
          <span className="px-2 py-1 bg-muted rounded">{activity.page_visited}</span>
          <span className="text-xs text-muted-foreground">{format(new Date(activity.created_at), 'p')}</span>
        </div>
        {index < trail.length - 1 && <ArrowRight className="w-4 h-4" />}
      </React.Fragment>
    ))}
  </div>
);

export default AnalyticsPage;