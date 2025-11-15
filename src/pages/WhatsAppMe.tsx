import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Phone, MessageSquare, Home, Building, FlaskConical, User, Users, Clipboard, Link, Calendar, Folder, History, Search } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PatientFolder {
  id: string;
  name: string;
  files: any[];
}

interface CalendarEvent {
  start: string;
  description: string;
  attachments?: string;
}

import { formatDistanceToNow } from 'date-fns';

interface RecentCall {
  number: string;
  name: string;
  timestamp: number;
}

interface RecentChat {
  number: string;
  name: string;
  timestamp: number;
}

const WhatsAppMe = () => {
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nameFromUrl, setNameFromUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [patientFolders, setPatientFolders] = useState<PatientFolder[]>([]);
  const [prescription, setPrescription] = useState<any>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);

  const getRecentChats = (): RecentChat[] => {
    const chats = localStorage.getItem('recentChats');
    return chats ? JSON.parse(chats) : [];
  };

  const addRecentChat = (chat: RecentChat) => {
    const chats = getRecentChats();
    const updatedChats = [chat, ...chats.filter(c => c.number !== chat.number)].slice(0, 5);
    localStorage.setItem('recentChats', JSON.stringify(updatedChats));
  };

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/[^0-9]/g, '');
    
    // If number starts with 91 and is 12 digits, remove the 91
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.slice(2);
    }
    return digitsOnly;
  };

  useEffect(() => {
    setRecentChats(getRecentChats());
    const params = new URLSearchParams(window.location.search);
    const numbers = params.getAll('numbers[]');
    const names = params.getAll('names[]');
    const timestamps = params.getAll('timestamps[]');
    const nameFromUrl = params.get('name');

    if (nameFromUrl) {
      setNameFromUrl(nameFromUrl);
    }

    if (numbers.length > 0) {
      const calls = numbers.map((number, index) => ({
        number: formatPhoneNumber(number),
        name: names[index] || `Number ${index + 1}`,
        timestamp: parseInt(timestamps[index], 10),
      }));
      setRecentCalls(calls);
      if (calls.length > 0) {
        setPhone(calls[0].number);
        setDisplayName(calls[0].name);
      }
    } else {
      const numberFromURL = params.get('number');
      if (numberFromURL) {
        setPhone(formatPhoneNumber(numberFromURL));
        if (nameFromUrl) {
          setDisplayName(nameFromUrl);
        }
      }
    }
  }, []);

  const searchRecords = async () => {
    if (phone.length === 10) {
      setIsLoading(true);
      setPatientFolders([]);
      setCalendarEvents([]);
      setPrescription(null);
      try {
        // 1. Search for patients/prescriptions
        const { data: patientData, error: patientError } = await supabase.functions.invoke('search-patients', {
          body: { searchTerm: phone, searchType: 'phone' },
        });
        if (patientError) throw patientError;

        // 1. Search for patients/prescriptions and calendar events concurrently
        const [patientResult, eventResult] = await Promise.all([
          supabase.functions.invoke('search-patients', {
            body: { searchTerm: phone, searchType: 'phone' },
          }),
          supabase.functions.invoke('search-calendar-events', {
            body: { phoneNumber: phone },
          }),
        ]);

        if (patientResult.error) throw patientResult.error;
        if (eventResult.error) throw eventResult.error;

        if (patientResult.data && patientResult.data.length > 0) {
          setPrescription(patientResult.data[0]);
        }
        setCalendarEvents(eventResult.data.calendarEvents || []);
      } catch (error) {
        console.error('Error searching records:', error);
        showError('Failed to search for records.');
      } finally {
        setIsLoading(false);
      }
    } else {
      showError('Please enter a valid 10-digit phone number.');
    }
  };

  const process = (e: number) => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    addRecentChat({
      number: phone,
      name: displayName || nameFromUrl || phone,
      timestamp: Date.now(),
    });
    setRecentChats(getRecentChats());

    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    let address;
    switch (e) {
      case 2:
        address = new Date().getDay() === 0 ? "Dr%20Samuel%20Manoj%20Cherukuri%0A_98668%2012555_%0A%0AAfter%20%2A_4%20pm_%2A%20at%20%20%2AOrthoLife%2A%20%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%0AKakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv" : "Dr%20Samuel%20Manoj%20Cherukuri%0A_98668%2012555_%0A%0AAfter%20%2A_7%3A30%20pm_%2A%20at%20%20%2AOrthoLife%2A%20%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%0AKakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv";
        break;
      case 3:
        address = "_Dr%20Samuel%20Manoj%20Cherukuri_%0A%2A98668%2012555%2A%20%0A%0A9-5%20pm%20at%3A%0ALaxmi%20Hospital%2C%0AGudarigunta%2C%20Kakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F5Xkr4FU";
        break;
      case 4:
        address = "_Dr%20Samuel%20Manoj%20Cherukuri_%20%0A9866812555%0A%0A%20%2A5-7%20pm%2A%20at%3A%0A%20_Badam%20clinical%20laboratory_%20%0Ahttps%3A%2F%2Fg.co%2Fkgs%2FeAgkp5S";
        break;
      default:
        address = "%2F";
    }
    
    const finalUrl = (window as { AndroidClipboard?: unknown }).AndroidClipboard ? `whatsapp://send?phone=91${formattedPhone}&text=${address}` : `https://wa.me/91${formattedPhone}?text=${address}`;
    window.location.href = finalUrl;
  };

  const inform = (e: number) => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    let address;
    switch (e) {
      case 1:
        address = (window as { AndroidClipboard?: unknown }).AndroidClipboard ? `whatsapp://send?phone=917093551714&text=${formattedPhone}` : `https://wa.me/917093551714?text=${formattedPhone}`;
        break;
      case 2:
        address = (window as { AndroidClipboard?: unknown }).AndroidClipboard ? `whatsapp://send?phone=919652377616&text=${formattedPhone}` : `https://wa.me/919652377616?text=${formattedPhone}`;        
        break;
      default:
        address = "%2F";
    }

    window.location.href = address;
  };

  const sms = () => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    window.location.href = `sms:${formattedPhone}?body=Dr%20Samuel%20Manoj%20Cherukuri%0A098668%2012555%0A%0A9-5pm%20at%3A%0ALaxmi%20Hospital%2C%20Gudarigunta%2C%20Kakinada%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F5Xkr4FU%0A%0AAfter%207pm%20at%20%28clinic%20address%29%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%20Kakinada%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv`;
  };

  const handlePasteClick = async () => {
    setIsProcessing(true);
    let text;
    try {
      const clipboard = (window as { AndroidClipboard?: { getClipboardText: () => string } }).AndroidClipboard;
      if (clipboard && clipboard.getClipboardText) { 
        text = clipboard.getClipboardText();
      } else {
        text = await navigator.clipboard.readText();
      }
      const formattedNumber = formatPhoneNumber(text);
      setDisplayName('');
      setPhone(formattedNumber);
      showSuccess('Phone number pasted from clipboard');
    } catch (error) {
      showError('Failed to read clipboard. Please paste manually.');
      console.error('Clipboard error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
    setDisplayName('');
  };

  const showError = (message: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  };

  const showSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="w-5 h-5 text-blue-600" />
          WhatsApp Communication
        </CardTitle>
        <CardDescription>
          Quickly send messages or share contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="tel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={displayName || phone}
              onChange={handlePhoneChange}
              placeholder="Enter phone number"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePasteClick}
                disabled={isProcessing}
                className="h-7 px-2"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={searchRecords}
                disabled={isLoading}
                className="h-7 px-2"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading && <p>Loading...</p>}

        {prescription && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clipboard className="w-4 h-4" /> Prescription Details
            </h3>
            <Card className="p-4">
              <p><strong>Name:</strong> {prescription.name}</p>
              {prescription.complaints && <p><strong>Complaints:</strong> {prescription.complaints}</p>}
              {prescription.medications && (
                <div>
                  <strong>Medications:</strong>
                  <ul className="list-disc pl-5">
                    {prescription.medications.map((med: any, index: number) => (
                      <li key={index}>{med.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>
        )}

        {calendarEvents.length > 0 && !prescription && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Calendar Events
            </h3>
            <div className="space-y-4">
              {calendarEvents.map(event => (
                <Card key={event.start} className="p-4">
                  <p className="font-semibold">{new Date(event.start).toLocaleString()}</p>
                  <div className="text-sm mt-2" dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br />') }} />
                  {event.attachments && (
                    <div className="mt-2">
                      <a
                        href={event.attachments}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Link className="w-4 h-4" />
                        View Attachment
                      </a>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {recentCalls.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="recent-calls">
              <AccordionTrigger>
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Calls
                </h3>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {recentCalls.map(call => (
                    <Card key={call.number} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{call.name}</p>
                        <p className="text-sm text-gray-500">{call.number}</p>
                      </div>
                      <div className="text-right">
                        <Button onClick={() => {
                          setPhone(call.number);
                          setDisplayName(call.name);
                        }} className="mb-1">
                          Select
                        </Button>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(call.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {recentChats.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="recent-chats">
              <AccordionTrigger>
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Chats
                </h3>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {recentChats.map(chat => (
                    <Card key={chat.number} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{chat.name}</p>
                        <p className="text-sm text-gray-500">{chat.number}</p>
                      </div>
                      <div className="text-right">
                        <Button onClick={() => {
                          setPhone(chat.number);
                          setDisplayName(chat.name);
                        }} className="mb-1">
                          Select
                        </Button>
                        <p className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(chat.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Send this address-
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={sms} 
              className="h-auto py-2 flex-col gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span>SMS</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => process(1)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => process(2)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Home className="w-4 h-4" />
              <span>Clinic</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => process(3)}
              className="h-auto py-2 flex-col gap-1"
            >
              <Building className="w-4 h-4" />
              <span>Laxmi</span>
            </Button>
            <Button
              variant="outline" 
              onClick={() => process(4)}
              className="h-auto py-2 flex-col gap-1"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Badam</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Share this number with-
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => inform(1)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Users className="w-4 h-4" />
              <span>Reception</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => inform(2)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <User className="w-4 h-4" />
              <span>OP Room</span>
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default WhatsAppMe;
