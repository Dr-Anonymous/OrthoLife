import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2, RefreshCcw, Clock, CheckCircle2, XCircle,
  AlertCircle, Share2, MessageSquare, Calendar as CalendarIcon,
  Trash2, Ban, MoreHorizontal, History, Edit2, Image as ImageIcon
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SchedulePopover } from '@/components/SchedulePopover';
import { useConsultant } from '@/context/ConsultantContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const [editForm, setEditForm] = useState({ content: '', number: '' });

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('scheduled_tasks').select('*');

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
          attempts: 0,
          scheduled_for: new Date().toISOString()
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

  const handleEditClick = (task: ScheduledTask) => {
    setEditingTask(task);
    if (task.task_type === 'whatsapp_message') {
      setEditForm({
        content: task.payload.message || '',
        number: task.payload.number || ''
      });
    } else {
      setEditForm({
        content: task.payload.content || '',
        number: ''
      });
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      const newPayload = { ...editingTask.payload };
      if (editingTask.task_type === 'whatsapp_message') {
        newPayload.message = editForm.content;
        newPayload.number = editForm.number;
      } else {
        newPayload.content = editForm.content;
      }
      
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ payload: newPayload })
        .eq('id', editingTask.id);
        
      if (error) throw error;
      toast.success('Task updated successfully');
      setEditingTask(null);
      fetchTasks();
    } catch (err: any) {
      toast.error('Failed to update task');
    }
  };

  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: ScheduledTask[] } = {};

    tasks.forEach(task => {
      const date = new Date(task.scheduled_for);
      let groupKey = '';

      if (isToday(date)) groupKey = 'Today';
      else if (isTomorrow(date)) groupKey = 'Tomorrow';
      else if (isPast(date) && !isToday(date)) groupKey = 'Past';
      else groupKey = format(date, 'MMMM d, yyyy');

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(task);
    });

    return groups;
  }, [tasks]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-amber-50 text-amber-700 border-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.1)]";
      case 'processing':
        return "bg-blue-50 text-blue-700 border-blue-200 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.1)]";
      case 'completed':
        return "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-[0_0_8px_rgba(16,185,129,0.1)]";
      case 'failed':
        return "bg-rose-50 text-rose-700 border-rose-200 shadow-[0_0_8px_rgba(244,63,94,0.1)]";
      case 'cancelled':
        return "bg-slate-50 text-slate-600 border-slate-200 shadow-[0_0_8px_rgba(71,85,105,0.1)]";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5 mr-1.5" />;
      case 'processing': return <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 mr-1.5" />;
      case 'cancelled': return <Ban className="w-3.5 h-3.5 mr-1.5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Schedule Queue
            </CardTitle>
            <CardDescription className="text-gray-500 mt-1">
              Manage your automated communications and social media presence.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTasks}
              disabled={isLoading}
              className="rounded-full bg-white shadow-sm border-gray-200 hover:border-primary/50 transition-all duration-300"
            >
              <RefreshCcw className={cn("w-4 h-4 mr-2 text-primary", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-gray-200/60 p-1 h-11 rounded-full shadow-sm w-fit">
              <TabsTrigger value="all" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">All</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Pending</TabsTrigger>
              <TabsTrigger value="processing" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Processing</TabsTrigger>
              <TabsTrigger value="completed" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Sent</TabsTrigger>
              <TabsTrigger value="failed" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Failed</TabsTrigger>
              <TabsTrigger value="cancelled" className="rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Cancelled</TabsTrigger>
            </TabsList>
          </div>

          {isLoading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
              </div>
              <p className="mt-4 text-gray-500 font-medium">Scanning the queue...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 px-6 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <History className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No tasks found</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                There are no {activeTab !== 'all' ? activeTab : ''} tasks in the queue. New tasks you schedule will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in duration-500">
              {Object.entries(groupedTasks).map(([dateLabel, dateTasks]) => (
                <div key={dateLabel} className="relative">
                  <div className="flex items-center gap-4 mb-6">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400 bg-gray-50 px-3 py-1 rounded-md">
                      {dateLabel}
                    </h4>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-gray-200 to-transparent"></div>
                  </div>

                  <div className="grid gap-4">
                    {dateTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group relative bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col md:flex-row md:items-center gap-4 overflow-hidden"
                      >
                        {/* Status Accent Bar */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          task.status === 'completed' ? "bg-emerald-500" :
                            task.status === 'failed' ? "bg-rose-500" :
                              task.status === 'processing' ? "bg-blue-500" :
                                task.status === 'pending' ? "bg-amber-500" : "bg-slate-300"
                        )}></div>

                        {/* Time & Type Icon */}
                        <div className="flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-1 min-w-[100px]">
                          <span className="text-lg font-bold text-gray-900 leading-none">
                            {format(new Date(task.scheduled_for), 'HH:mm')}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            {format(new Date(task.scheduled_for), 'MMM d')}
                          </span>
                        </div>

                        {/* Task Type Avatar */}
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform duration-300 group-hover:scale-110",
                          task.task_type === 'whatsapp_message' ? "bg-green-50 text-green-600" : "bg-blue-50 text-blue-600"
                        )}>
                          {task.task_type === 'whatsapp_message' ? <MessageSquare className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}
                        </div>

                        {/* Content Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {task.task_type === 'whatsapp_message' ? 'Direct WhatsApp' : 'Social Media Post'}
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] font-medium h-5 border px-2 rounded-full", getStatusStyle(task.status))}>
                              {getStatusIcon(task.status)}
                              {task.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xl group-hover:text-gray-700 transition-colors">
                            {task.task_type === 'whatsapp_message' ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-700">To: {task.payload.number}</span>
                                <span className="text-gray-300">•</span>
                                <span>{task.payload.message}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-700">Platforms: {task.payload.platforms.join(', ')}</span>
                                <span className="text-gray-300">•</span>
                                <span>{task.payload.content}</span>
                              </div>
                            )}
                          </div>

                          {/* Media Preview Section */}
                          {(task.payload.media_url || (task.payload.mediaUrls && task.payload.mediaUrls.length > 0)) && (
                            <div className="mt-3 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                              {task.payload.media_url ? (
                                <a 
                                  href={task.payload.media_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="relative group/media w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100 hover:ring-primary/30 transition-all"
                                >
                                  <img src={task.payload.media_url} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/5 group-hover/media:bg-transparent transition-colors" />
                                </a>
                              ) : (
                                task.payload.mediaUrls?.map((url: string, i: number) => (
                                  <a 
                                    key={i}
                                    href={url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="relative group/media w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm ring-1 ring-gray-100 hover:ring-primary/30 transition-all"
                                  >
                                    <img src={url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/5 group-hover/media:bg-transparent transition-colors" />
                                  </a>
                                ))
                              )}
                            </div>
                          )}
                          {task.error && (
                            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-500 bg-rose-50/50 w-fit px-2 py-0.5 rounded-md border border-rose-100">
                              <AlertCircle className="w-3 h-3" />
                              <span className="truncate max-w-[300px]">{task.error}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 justify-end">
                          {task.status === 'pending' && (
                            <>
                              <SchedulePopover
                                scheduledDate={new Date(task.scheduled_for)}
                                scheduledTime={format(new Date(task.scheduled_for), 'HH:mm')}
                                onDateChange={() => {}}
                                onTimeChange={() => {}}
                                onConfirm={(date, time) => handleReschedule(task.id, date, time)}
                                className="h-9 w-9 rounded-xl border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-blue-600 transition-all shadow-sm"
                                trigger={
                                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" title="Reschedule">
                                    <CalendarIcon className="w-4 h-4" />
                                  </Button>
                                }
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl border-gray-200 hover:border-blue-200 hover:bg-blue-50 text-blue-600 transition-all shadow-sm"
                                onClick={() => handleEditClick(task)}
                                title="Edit Task"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl border-gray-200 hover:border-amber-200 hover:bg-amber-50 text-amber-600 transition-all shadow-sm"
                                onClick={() => handleCancel(task.id)}
                                title="Cancel Task"
                              >
                                <Ban className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {task.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-xl border-gray-200 hover:border-emerald-200 hover:bg-emerald-50 text-emerald-600 font-semibold px-3 transition-all shadow-sm"
                              onClick={() => handleRetry(task.id)}
                              disabled={retryingId === task.id}
                            >
                              {retryingId === task.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
                              Retry
                            </Button>
                          )}

                          {task.status !== 'pending' && task.status !== 'processing' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-gray-100">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-xl border-gray-100">
                                <DropdownMenuItem
                                  className="rounded-lg text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                                  onClick={() => handleDelete(task.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Record
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs>
      </Card>

      <EditTaskDialog 
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        form={editForm}
        setForm={setEditForm}
        onSave={handleUpdateTask}
      />
    </div>
  );
};

const EditTaskDialog = ({ 
  isOpen, 
  onClose, 
  task, 
  form, 
  setForm, 
  onSave 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  task: ScheduledTask | null; 
  form: { content: string; number: string };
  setForm: (form: { content: string; number: string }) => void;
  onSave: () => void;
}) => {
  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit2 className="w-5 h-5 text-primary" />
            Edit Scheduled Task
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {task.task_type === 'whatsapp_message' && (
            <div className="space-y-2">
              <Label htmlFor="number">Phone Number</Label>
              <Input 
                id="number" 
                value={form.number} 
                onChange={(e) => setForm({ ...form, number: e.target.value })}
                className="rounded-xl"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="content">
              {task.task_type === 'whatsapp_message' ? 'Message' : 'Post Content'}
            </Label>
            <Textarea 
              id="content" 
              value={form.content} 
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="min-h-[150px] rounded-xl resize-none"
            />
          </div>

          {(task.payload.media_url || (task.payload.mediaUrls && task.payload.mediaUrls.length > 0)) && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-gray-400">
                <ImageIcon className="w-4 h-4" /> Attached Media
              </Label>
              <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                {task.payload.media_url ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-white shadow-sm">
                    <img src={task.payload.media_url} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  task.payload.mediaUrls?.map((url: string, i: number) => (
                    <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-white shadow-sm">
                      <img src={url} className="w-full h-full object-cover" />
                    </div>
                  ))
                )}
              </div>
              <p className="text-[10px] text-gray-400 italic">Media cannot be changed here. To change media, cancel this task and create a new one.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button onClick={onSave} className="rounded-xl px-8">Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduledTasksList;
