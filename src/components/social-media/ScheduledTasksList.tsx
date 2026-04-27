import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCcw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchedulePopover } from '@/components/SchedulePopover';
import { Ban, Calendar as CalendarIcon, Trash2, Share2, MessageSquare } from 'lucide-react';
import { useConsultant } from '@/context/ConsultantContext';

interface ScheduledTask {
  id: string;
  task_type: string;
  payload: any;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

const ScheduledTasksList = () => {
  const { consultant, isMasterAdmin } = useConsultant();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('scheduled_tasks')
        .select('*');
      
      if (!isMasterAdmin) {
        query = query.eq('consultant_id', consultant?.id);
      }
      
      query = query.order('scheduled_for', { ascending: false });

      if (activeTab !== 'all') {
        query = query.eq('status', activeTab);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Failed to fetch tasks', err);
      toast.error('Failed to load scheduled tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeTab]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({
          status: 'pending',
          error: null,
          attempts: 0, // Reset attempts!
          scheduled_for: new Date().toISOString() // Retry immediately
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Task queued for immediate retry');
      fetchTasks();
    } catch (err: any) {
      toast.error('Failed to retry task');
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      toast.success('Task cancelled');
      fetchTasks();
    } catch (err: any) {
      toast.error('Failed to cancel task');
    }
  };

  const handleReschedule = async (id: string, date: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const newScheduledFor = new Date(date);
    newScheduledFor.setHours(hours, minutes, 0, 0);

    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({
          scheduled_for: newScheduledFor.toISOString(),
          status: 'pending',
          error: null,
          attempts: 0
        })
        .eq('id', id);
      if (error) throw error;
      toast.success('Task rescheduled');
      fetchTasks();
    } catch (err: any) {
      toast.error('Failed to reschedule task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this task record?")) return;
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Task record deleted');
      fetchTasks();
    } catch (err: any) {
      toast.error('Failed to delete task');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200"><Ban className="w-3 h-3 mr-1" /> Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTaskDescription = (task: ScheduledTask) => {
    if (task.task_type === 'whatsapp_message') {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm">WhatsApp to {task.payload.number}</span>
          <span className="text-xs text-muted-foreground truncate max-w-[250px]">{task.payload.message}</span>
        </div>
      );
    }
    if (task.task_type === 'social_post') {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-sm">Social Post ({task.payload.platforms.join(', ')})</span>
          <span className="text-xs text-muted-foreground truncate max-w-[250px]">{task.payload.content}</span>
        </div>
      );
    }
    return <span className="text-sm">Unknown Task</span>;
  };

  return (
    <Card className="w-full mx-auto shadow-sm border-gray-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold text-gray-800">Scheduled Tasks</CardTitle>
          <CardDescription>View and manage queued tasks for social posts and WhatsApp notifications.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchTasks} disabled={isLoading}>
            <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gray-100/50">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="completed">Sent</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center p-12 border rounded-lg bg-gray-50/50">
            <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No {activeTab !== 'all' ? activeTab : ''} scheduled tasks</h3>
            <p className="text-sm text-gray-500">Tasks you schedule will appear here.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheduled For</TableHead>
                  <TableHead>Task Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(task.scheduled_for), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {task.task_type === 'whatsapp_message' ? (
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                        ) : (
                          <Share2 className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                          {task.task_type === 'whatsapp_message' ? 'WhatsApp' : 'Social Post'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTaskDescription(task)}
                      {task.error && (
                        <p className="text-xs text-red-500 mt-1 max-w-[250px] truncate" title={task.error}>
                          Error: {task.error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(task.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {task.status === 'pending' && (
                          <>
                            <SchedulePopover
                              scheduledDate={new Date(task.scheduled_for)}
                              scheduledTime={format(new Date(task.scheduled_for), 'HH:mm')}
                              onDateChange={(date) => date && handleReschedule(task.id, date, format(new Date(task.scheduled_for), 'HH:mm'))}
                              onTimeChange={(time) => handleReschedule(task.id, new Date(task.scheduled_for), time)}
                              className="h-8 w-8"
                              trigger={
                                <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700" title="Reschedule">
                                  <CalendarIcon className="w-3 h-3" />
                                </Button>
                              }
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-yellow-600 hover:text-yellow-700"
                              onClick={() => handleCancel(task.id)}
                            >
                              <Ban className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {task.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleRetry(task.id)}
                            disabled={retryingId === task.id}
                          >
                            {retryingId === task.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCcw className="w-3 h-3 mr-1" />}
                            Retry
                          </Button>
                        )}
                        {(task.status === 'completed' || task.status === 'cancelled' || task.status === 'failed') && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleDelete(task.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduledTasksList;
