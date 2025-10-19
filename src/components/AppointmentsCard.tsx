import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const AppointmentsCard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (user?.phoneNumber) {
        try {
          setLoading(true);
          const phoneNumber = user.phoneNumber.slice(-10);
          const { data, error } = await supabase.functions.invoke('search-whatsappme-records', {
            body: { phoneNumber },
          });

          if (error) throw new Error(`Error fetching appointments: ${error.message}`);
          setAppointments(data?.calendarEvents || []);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [user]);

  const formatAppointmentDescription = (description: string) => {
    if (!description) return '';
    const cutoff = description.indexOf('WhatsApp:');
    const truncatedDesc = cutoff !== -1 ? description.substring(0, cutoff) : description;
    return truncatedDesc.replace(/\n/g, '<br />');
  };
  
  const bookAppointment = () => {
    navigate('/appointment');
  };
  
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
            <ul className="space-y-3">
              {appointments.map((event: any, index: number) => (
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
            <p className="text-gray-500">No appointments found.</p>
            <Button onClick={bookAppointment} className="w-full mt-4">
              Book an Appointment
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default AppointmentsCard;