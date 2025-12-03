import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Phone, MessageSquare, Home, Building, FlaskConical, User, Users, Clipboard, Link, Calendar, Folder, History, Search, Stethoscope, Pill, FileText, NotebookText, Undo2 } from 'lucide-react';
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

import { format, formatDistanceToNow } from 'date-fns';

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

declare global {
  interface Window {
    Android?: {
      isWhatsAppInstalled(): boolean;
      isWhatsAppBusinessInstalled(): boolean;
      getClipboardText(): string;
    };
    AndroidClipboard?: {
      getClipboardText(): string;
    };
  }
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
  const [isSmsMode, setIsSmsMode] = useState(false);
  const [recentCallsOpen, setRecentCallsOpen] = useState("");
  const [recentChatsOpen, setRecentChatsOpen] = useState("");

  const [hasWhatsApp, setHasWhatsApp] = useState(true);

  useEffect(() => {
    if (window.Android) {
      setHasWhatsApp(window.Android.isWhatsAppInstalled() || window.Android.isWhatsAppBusinessInstalled());
    }
  }, []);

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
    const digitsOnly = input.replace(/[^0-9]/g, '');
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


  const getMessageForType = (type: number) => {
    const header = "Dr Samuel Manoj Cherukuri\n98668 12555";
    switch (type) {
      case 2: // Clinic
        const isSunday = new Date().getDay() === 0;
        const time = isSunday ? "After 4 pm" : "After 7:30 pm";
        return `${header}\n\n${time} at  OrthoLife :\nRoad number 3,\nR R Nagar, near RTO office,\nKakinada\n\nLocation:\nhttps://g.co/kgs/6ZEukv`;
      case 3: // Laxmi
        return `${header}\n\n9-5 pm at:\nLaxmi Hospital,\nGudarigunta, Kakinada\n\nLocation:\nhttps://g.co/kgs/5Xkr4FU`;
      case 4: // Badam
        return `${header}\n\n5-7 pm at:\n Badam clinical laboratory \nhttps://g.co/kgs/eAgkp5S`;
      default:
        return "";
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

    const message = getMessageForType(e);

    // Check if WhatsApp is installed
    let isWhatsAppAvailable = false;
    if (isSmsMode) {
      isWhatsAppAvailable = false; // Force SMS if SMS mode is active
    } else if (window.Android) {
      isWhatsAppAvailable = window.Android.isWhatsAppInstalled() || window.Android.isWhatsAppBusinessInstalled();
    } else {
      // Fallback for non-Android environments
      isWhatsAppAvailable = true;
    }

    if (isWhatsAppAvailable) {
      // For WhatsApp, if message is empty (e.g. type 1), use %2F to just open chat
      const textParam = message ? encodeURIComponent(message) : "%2F";
      const finalUrl = (window.AndroidClipboard || window.Android)
        ? `whatsapp://send?phone=91${formattedPhone}&text=${textParam}`
        : `https://wa.me/91${formattedPhone}?text=${textParam}`;
      window.location.href = finalUrl;
    } else {
      // Send SMS
      // For SMS, if message is empty, we just open the SMS app for the number
      const encodedBody = encodeURIComponent(message);
      window.location.href = `sms:${formattedPhone}?body=${encodedBody}`;
    }
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
        address = `sms:+919983849838?body=${formattedPhone}`;
        break;
      default:
        address = "%2F";
    }

    window.location.href = address;
  };



  const handlePasteClick = async () => {
    setIsProcessing(true);
    let text;
    try {
      const clipboard = window.Android || window.AndroidClipboard;
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
                aria-label="Search"
              >
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading && <p>Loading...</p>}

        <div className="flex overflow-x-auto space-x-4 py-2">
          {prescription && (
            <Card className="min-w-[300px] flex-shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clipboard className="w-4 h-4" /> Prescription Details
                </CardTitle>
                {prescription.created_at && (
                  <CardDescription>
                    {format(new Date(prescription.created_at), 'PPP')}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <p><strong>Name:</strong> {prescription.name}</p>
                {[
                  { Icon: NotebookText, label: "Doctor's Personal Note", value: prescription.personalNote },
                  { Icon: Stethoscope, label: 'Complaints', value: prescription.complaints },
                  { Icon: FileText, label: 'Clinical Findings', value: prescription.findings },
                  { Icon: FileText, label: 'Investigations', value: prescription.investigations },
                  { Icon: Stethoscope, label: 'Diagnosis', value: prescription.diagnosis },
                  { Icon: Pill, label: 'Medications', value: prescription.medications },
                  { Icon: FileText, label: 'Advice', value: prescription.advice },
                  { Icon: Undo2, label: 'Follow-up', value: prescription.followup },
                ].map(({ Icon, label, value }, index) => {
                  if (!value || (Array.isArray(value) && value.length === 0)) return null;

                  const displayValue = Array.isArray(value)
                    ? value.map((med: any) => `${med.name}${med.duration ? ` - ${med.duration}` : ''}`).join(', ')
                    : value;

                  return (
                    <div key={index} className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">{label}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {displayValue}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {calendarEvents.map(event => (
            <Card key={event.start} className="min-w-[300px] flex-shrink-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4" /> Calendar Event
                </CardTitle>
                <CardDescription>{new Date(event.start).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: event.description.replace(/\n/g, '<br />') }} />
                {event.attachments && (
                  <div className="mt-2">
                    <a
                      href={event.attachments}
                      target="_blank"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Link className="w-4 h-4" />
                      View Attachment
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {recentCalls.length > 0 && (
          <Accordion type="single" collapsible value={recentCallsOpen} onValueChange={setRecentCallsOpen}>
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
                          setRecentCallsOpen("");
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
          <Accordion type="single" collapsible value={recentChatsOpen} onValueChange={setRecentChatsOpen}>
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
                          setRecentChatsOpen("");
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
            {hasWhatsApp && (
              <>
                <Button
                  variant={isSmsMode ? "default" : "outline"}
                  onClick={() => setIsSmsMode(!isSmsMode)}
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
              </>
            )}

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
              <span>OrthoLife</span>
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default WhatsAppMe;
