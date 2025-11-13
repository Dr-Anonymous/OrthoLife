import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, BarChart, ChevronDown, Calendar as CalendarIcon } from 'lucide-react';
import ConsultationTimer from './ConsultationTimer';
import { ConsultationContext } from '@/context/ConsultationContext';
import { useConsultationForm } from '@/hooks/consultation/useConsultationForm';

interface Consultation {
  id: string;
  patient: any;
  consultation_data: any;
  status: 'pending' | 'completed';
}

interface ConsultationsSidebarProps {
  formattedTime: string;
  isTimerVisible: boolean;
  toggleTimerVisibility: () => void;
}

const ConsultationsSidebar: React.FC<ConsultationsSidebarProps> = ({
  formattedTime,
  isTimerVisible,
  toggleTimerVisibility,
}) => {
  const { state, dispatch } = React.useContext(ConsultationContext);
  const { selectedConsultation, allConsultations, pendingConsultations, completedConsultations } = state;
  const { handleSelectConsultation } = useConsultationForm();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [isFetchingConsultations, setIsFetchingConsultations] = useState(false);
  const [isConsultationDatePickerOpen, setIsConsultationDatePickerOpen] = useState(false);

  const fetchConsultations = async (date: Date) => {
    setIsFetchingConsultations(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-consultations-by-date', {
        body: { date: format(date, 'yyyy-MM-dd') },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const consultations = data.consultations || [];
      dispatch({ type: 'SET_ALL_CONSULTATIONS', payload: consultations });
    } catch (error) {
      console.error('Error fetching consultations:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching consultations',
        description: (error as Error).message,
      });
    } finally {
      setIsFetchingConsultations(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchConsultations(selectedDate);
    }
  }, [selectedDate]);

  const handleConsultationDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsConsultationDatePickerOpen(false);
  };

  return (
    <div className="lg:col-span-1 space-y-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Consultation Date</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => selectedDate && fetchConsultations(selectedDate)}
              disabled={isFetchingConsultations}
            >
              {isFetchingConsultations ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="sr-only">Refresh</span>
            </Button>
            <Link to="/consultation-stats">
              <BarChart className="w-5 h-5 text-primary hover:text-primary/80" />
            </Link>
          </div>
        </div>
        <Popover open={isConsultationDatePickerOpen} onOpenChange={setIsConsultationDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !selectedDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleConsultationDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="space-y-4">
        <div className="font-semibold">
          Total Consultations: {allConsultations.length}
        </div>
        <div>
          <Label>Pending Consultations: {pendingConsultations.length}</Label>
          {isFetchingConsultations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
              {pendingConsultations.map(c => (
                <Button
                  key={c.id}
                  variant={selectedConsultation?.id === c.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleSelectConsultation(c)}
                >
                  {c.patient.name}
                </Button>
              ))}
              {pendingConsultations.length === 0 && <p className="text-sm text-muted-foreground">No pending consultations.</p>}
            </div>
          )}
        </div>
        <div>
          <Button
            variant="ghost"
            className="w-full justify-between px-0 hover:bg-transparent"
            onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
          >
            <Label className="cursor-pointer">Completed Consultations: {completedConsultations.length}</Label>
            <ChevronDown className={cn('w-4 h-4 transition-transform', !isCompletedCollapsed && 'rotate-180')} />
          </Button>
          {isFetchingConsultations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className={cn('space-y-2 mt-2 transition-all overflow-y-auto', isCompletedCollapsed ? 'max-h-0' : 'max-h-60')}>
              {completedConsultations.map(c => (
                <Button
                  key={c.id}
                  variant={selectedConsultation?.id === c.id ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => handleSelectConsultation(c)}
                >
                  {c.patient.name}
                </Button>
              ))}
              {completedConsultations.length === 0 && <p className="text-sm text-muted-foreground">No completed consultations.</p>}
            </div>
          )}
        </div>
        <ConsultationTimer
          formattedTime={formattedTime}
          isTimerVisible={isTimerVisible}
          toggleTimerVisibility={toggleTimerVisibility}
        />
      </div>
    </div>
  );
};

export default ConsultationsSidebar;
