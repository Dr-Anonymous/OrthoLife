import { useState } from 'react';
import { calculateAge } from '@/lib/age';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, formatDistanceToNow } from 'date-fns';
import { Pill, FileText, NotebookText, Undo2, Calendar, Stethoscope, MapPin } from 'lucide-react';

const ConsultationSearchResultItem = ({ consultation, highlightKeyword }) => {
  const {
    personalNote,
    complaints,
    findings,
    investigations,
    diagnosis,
    medications,
    advice,
    followup,
  } = consultation.consultation_data || {};

  const renderField = (Icon, label, value) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    const displayValue = Array.isArray(value)
      ? value.map(med => `${med.name}${med.duration ? ` - ${med.duration}` : ''}`).join(', ')
      : value;

    return (
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
        <div>
          <h4 className="font-semibold">{label}</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightKeyword(displayValue) }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderField(NotebookText, "Doctor's Personal Note", personalNote)}
      {renderField(Stethoscope, 'Complaints', complaints)}
      {renderField(FileText, 'Clinical Findings', findings)}
      {renderField(FileText, 'Investigations', investigations)}
      {renderField(Stethoscope, 'Diagnosis', diagnosis)}
      {renderField(Pill, 'Medications', medications)}
      {renderField(FileText, 'Advice', advice)}
      {renderField(Undo2, 'Follow-up', followup)}
    </div>
  );
};


export const ConsultationSearchModal = ({ isOpen, onClose, onSelectConsultation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!name && !phone && !keyword) {
      setResults([]);
      return;
    }

    const sanitizedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';

    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('search-consultations', {
      body: { name, phone: sanitizedPhone, keyword },
    });

    if (error) {
      console.error('Error searching consultations:', error);
      setResults([]);
    } else {
      setResults(data.results || []);
    }
    setIsLoading(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelect = (consultation, patient) => {
    const { consultations, ...patientData } = patient;
    const reconstructedConsultation = {
      ...consultation,
      patient: patientData,
    };
    onSelectConsultation(reconstructedConsultation);
    onClose();
  };

  const highlightKeyword = (text: string) => {
    if (!keyword || !text) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.replace(regex, '<strong class="bg-yellow-200">$1</strong>');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Search Consultations</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          <Input placeholder="Search by name..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={handleKeyDown} />
          <Input placeholder="Search by phone..." value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={handleKeyDown} />
          <Input placeholder="Search by keyword..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
        <div className="px-4 pb-4">
          <Button onClick={handleSearch} className="w-full">Search</Button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Accordion type="multiple" collapsible>
              {results.map((patient) => (
                <AccordionItem value={`patient-${patient.id}`} key={patient.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <div className="flex items-baseline gap-2">
                        <span>{patient.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {calculateAge(new Date(patient.dob))}/{patient.sex}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">{patient.phone}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {patient.consultations.map(consultation => (
                      <div key={consultation.id} className="border-b last:border-b-0 p-3 mb-2 cursor-pointer hover:bg-muted/50 rounded-md" onClick={() => handleSelect(consultation, patient)}>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <p className="font-semibold">
                              {formatDistanceToNow(new Date(consultation.created_at), { addSuffix: true })} ({format(new Date(consultation.created_at), 'PPP')})
                            </p>
                          </div>
                          {(consultation.location || consultation.visit_type) && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                {consultation.location}
                                {consultation.location && consultation.visit_type && ' - '}
                                {consultation.visit_type}
                              </p>
                            </div>
                          )}
                        </div>
                        <ConsultationSearchResultItem consultation={consultation} highlightKeyword={highlightKeyword} />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
