import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

const AppointmentsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchAppointments = async () => {
    if (user?.phoneNumber) {
      try {
        setLoading(true);
        const phoneNumber = user.phoneNumber.slice(-10);
        const { data, error } = await supabase.functions.invoke('search-whatsappme-records', {
          body: { phoneNumber },
        });

        if (error) throw new Error(`Error fetching appointments: ${error.message}`);

        const sortedAppointments = (data?.calendarEvents || []).sort(
          (a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        setAppointments(sortedAppointments);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user]);

  const handleCancelAppointment = async (eventId: string) => {
    setIsCancelling(true);
    try {
      const { error } = await supabase.functions.invoke('cancel-appointment', {
        body: { eventId },
      });
      if (error) throw new Error(`Error cancelling appointment: ${error.message}`);
      await fetchAppointments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatAppointmentDescription = (description: string) => {
    if (!description) return '';
    const cutoff = description.indexOf('WhatsApp:');
    const truncatedDesc = cutoff !== -1 ? description.substring(0, cutoff) : description;
    return truncatedDesc.replace(/\n/g, '<br />');
  };
  
  const bookAppointment = () => {
    navigate('/appointment');
  };
  
  const now = new Date();
  const upcomingAppointments = appointments.filter(event => new Date(event.start) >= now);
  const pastAppointments = appointments.filter(event => new Date(event.start) < now).reverse();

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center space-x-3">
        <Calendar className="h-6 w-6 text-primary" />
        <CardTitle>My Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading appointments...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          appointments.length > 0 ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Upcoming Appointments</h3>
                {upcomingAppointments.length > 0 ? (
                  <ul className="space-y-3">
                    {upcomingAppointments.map((event: any, index: number) => (
                      <li key={index} className="p-4 bg-gray-100 rounded-lg">
                        <p className="font-semibold text-gray-800">{new Date(event.start).toLocaleString()}</p>
                        <div
                          className="text-gray-600 mt-1"
                          dangerouslySetInnerHTML={{ __html: formatAppointmentDescription(event.description) }}
                        />
                        {event.attachments && <a href={event.attachments} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">View Attachment</a>}
                        <div className="flex space-x-2 mt-4">
                          <Button variant="outline" size="sm" onClick={() => navigate(`/appointment?reschedule=true&eventId=${event.id}&start=${event.start}&description=${encodeURIComponent(event.description)}`)}>
                            Reschedule
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">Cancel</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Are you sure?</DialogTitle>
                                <DialogDescription>
                                  This action cannot be undone. This will permanently cancel your appointment.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Back</Button>
                                </DialogClose>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleCancelAppointment(event.id)}
                                  disabled={isCancelling}
                                >
                                  {isCancelling ? 'Cancelling...' : 'Confirm'}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No upcoming appointments.</p>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Past Appointments</h3>
                {pastAppointments.length > 0 ? (
                  <ul className="space-y-3">
                    {pastAppointments.map((event: any, index: number) => (
                      <li key={index} className="p-4 bg-gray-100 rounded-lg">
                        <p className="font-semibold text-gray-800">{new Date(event.start).toLocaleString()}</p>
                        <div
                          className="text-gray-600 mt-1"
                          dangerouslySetInnerHTML={{ __html: formatAppointmentDescription(event.description) }}
                        />
                        {event.attachments && <a href={event.attachments} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline mt-2 inline-block">View Attachment</a>}
                      </li>
                    ))}
                  </ul>
                ) : (
                   <p className="text-gray-500">No past appointments.</p>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-500">No appointments found.</p>
              <Button onClick={bookAppointment} className="w-full mt-4">
                Book an Appointment
              </Button>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsCard;