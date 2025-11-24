import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, ArrowRight, User, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { format, getMonth, getYear } from 'date-fns';

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
  const [monthlyViewType, setMonthlyViewType] = useState<'date' | 'user'>('date');

  const processedTrails = useMemo(() => {
    const pageViewEvents = analyticsData.filter(d => d.event_type === 'page_view' && d.user_phone);
    if (pageViewEvents.length === 0) {
      return {};
    }

    return pageViewEvents.reduce((acc, activity) => {
      const date = format(new Date(activity.created_at), 'yyyy-MM-dd');
      const userKey = `${activity.user_name || 'Unknown'} (${activity.user_phone})`;

      if (viewMode === 'day') {
        if (!acc[userKey]) acc[userKey] = [];
        acc[userKey].push(activity);
      } else { // month view
        if (monthlyViewType === 'date') {
          if (!acc[date]) acc[date] = {};
          if (!acc[date][userKey]) acc[date][userKey] = [];
          acc[date][userKey].push(activity);
        } else { // user-wise
          if (!acc[userKey]) acc[userKey] = {};
          if (!acc[userKey][date]) acc[userKey][date] = [];
          acc[userKey][date].push(activity);
        }
      }
      return acc;
    }, {} as any);
  }, [analyticsData, viewMode, monthlyViewType]);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!selectedDate) return;

      try {
        setLoading(true);
        let startDate, endDate;

        if (viewMode === 'month') {
          startDate = new Date(getYear(selectedDate), getMonth(selectedDate), 1).toISOString();
          endDate = new Date(getYear(selectedDate), getMonth(selectedDate) + 1, 1).toISOString();
        } else { // default to 'day' view
          startDate = new Date(getYear(selectedDate), getMonth(selectedDate), selectedDate.getDate()).toISOString();
          endDate = new Date(getYear(selectedDate), getMonth(selectedDate), selectedDate.getDate() + 1).toISOString();
        }

        const { data, error } = await supabase.from('analytics')
          .select('*')
          .gte('created_at', startDate)
          .lt('created_at', endDate)
          .order('created_at', { ascending: false });

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
  }, [selectedDate, viewMode]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-1">{label}</p>
          <p className="text-primary text-sm">
            Count: <span className="font-bold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const renderChart = (data: { name: string; value: number }[], title: string, barKey: string) => (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-foreground/80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
            <Bar
              dataKey={barKey}
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30 font-sans">
      <Header />
      <main className="flex-grow pt-24 pb-12 animate-fade-in">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Insights and activity overview for {format(selectedDate || new Date(), 'MMMM yyyy')}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
              <ToggleGroup type="single" value={viewMode} onValueChange={(value: 'day' | 'month') => value && setViewMode(value)}>
                <ToggleGroupItem value="day" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-sm px-3 py-1.5 h-auto rounded-md transition-all">Day View</ToggleGroupItem>
                <ToggleGroupItem value="month" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground text-sm px-3 py-1.5 h-auto rounded-md transition-all">Month View</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Calendar Section */}
            <Card className="lg:col-span-1 border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Select Date</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border shadow-sm p-4"
                />
              </CardContent>
            </Card>

            {/* User Activity Feed */}
            <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-[500px]">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <div>
                  <CardTitle className="text-lg font-medium">User Activity</CardTitle>
                  <CardDescription>Real-time user interactions</CardDescription>
                </div>
                {viewMode === 'month' && (
                  <ToggleGroup type="single" value={monthlyViewType} onValueChange={(value: 'date' | 'user') => value && setMonthlyViewType(value)}>
                    <ToggleGroupItem value="date" size="sm" className="h-8 text-xs">By Date</ToggleGroupItem>
                    <ToggleGroupItem value="user" size="sm" className="h-8 text-xs">By User</ToggleGroupItem>
                  </ToggleGroup>
                )}
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                {loading ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : (
                  <div className="overflow-y-auto h-full p-6 space-y-6 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {viewMode === 'day' && Object.keys(processedTrails).length === 0 && (
                      <div className="text-center text-muted-foreground py-10">No activity found for this day.</div>
                    )}

                    {viewMode === 'day' && Object.keys(processedTrails).map(user => (
                      <div key={user} className="animate-slide-in">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <h4 className="font-semibold text-sm">{user}</h4>
                        </div>
                        <div className="pl-10">
                          <Trail trail={processedTrails[user]} />
                        </div>
                      </div>
                    ))}

                    {viewMode === 'month' && monthlyViewType === 'date' && Object.keys(processedTrails).map(date => (
                      <div key={date} className="animate-slide-in">
                        <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white/95 backdrop-blur py-2 z-10 border-b">
                          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                          <h3 className="font-medium text-foreground">{format(new Date(date), 'PPP')}</h3>
                        </div>
                        <div className="space-y-6 pl-4 border-l-2 border-muted ml-2">
                          {Object.keys(processedTrails[date]).map(user => (
                            <div key={user}>
                              <div className="flex items-center gap-2 mb-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <h4 className="font-medium text-sm">{user}</h4>
                              </div>
                              <Trail trail={processedTrails[date][user]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {viewMode === 'month' && monthlyViewType === 'user' && Object.keys(processedTrails).map(user => (
                      <div key={user} className="animate-slide-in">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <h3 className="font-semibold text-foreground">{user}</h3>
                        </div>
                        <div className="space-y-4 pl-10">
                          {Object.keys(processedTrails[user]).map(date => (
                            <div key={date}>
                              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{format(new Date(date), 'MMM do')}</h4>
                              <Trail trail={processedTrails[user][date]} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {loading && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="border-none shadow-sm">
                  <CardHeader>
                    <Skeleton className="h-6 w-1/3" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-64 w-full rounded-lg" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg text-center">
              {error}
            </div>
          )}

          {!loading && !error && processedData && (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 animate-scale-in">
              {renderChart(processedData.pageViews, 'Page Views', 'value')}
              {renderChart(processedData.popularBlogPosts, 'Popular Blog Posts', 'value')}
              {renderChart(processedData.popularGuides, 'Popular Patient Guides', 'value')}
              {renderChart(processedData.medicineCartAdds, 'Top Medicines (Cart)', 'value')}
              {renderChart(processedData.testCartAdds, 'Top Tests (Cart)', 'value')}
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

const Trail = ({ trail }: { trail: any[] }) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    {trail.map((activity, index) => (
      <React.Fragment key={activity.created_at}>
        <div className="group relative flex items-center bg-muted/50 hover:bg-primary/5 border border-transparent hover:border-primary/20 rounded-full px-3 py-1 transition-colors duration-200">
          <span className="font-medium text-foreground/80 group-hover:text-primary transition-colors">{activity.path}</span>
          <span className="ml-2 text-[10px] text-muted-foreground group-hover:text-primary/70 border-l border-muted-foreground/20 pl-2">
            {format(new Date(activity.created_at), 'p')}
          </span>
        </div>
        {index < trail.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
      </React.Fragment>
    ))}
  </div>
);

export default AnalyticsPage;