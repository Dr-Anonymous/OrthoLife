import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronsRight } from 'lucide-react';
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
  const [showActivityDetails, setShowActivityDetails] = useState(false);

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
      fetchUserActivity(selectedDate);
    }
  }, [selectedDate]);

  const fetchUserActivity = async (date: Date) => {
    setIsActivityLoading(true);
    setShowActivityDetails(false);
    try {
      const { data, error } = await supabase.functions.invoke('get-user-activity', {
        body: {
          year: getYear(date),
          month: getMonth(date),
          day: date.getDate(),
        },
      });

      if (error) throw error;
      setUserActivity(data.data);
      setShowActivityDetails(true);
    } catch (error) {
      console.error('Error fetching user activity:', error);
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
              <CardTitle>User Activity</CardTitle>
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
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Activity for {selectedDate ? format(selectedDate, 'PPP') : ''}</h3>
                      <div className="overflow-x-auto h-64">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userActivity.map((activity) => (
                              <tr key={activity.created_at}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{format(new Date(activity.created_at), 'p')}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{activity.user_phone}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{activity.page_visited}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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

export default AnalyticsPage;