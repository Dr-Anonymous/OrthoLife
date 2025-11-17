import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase';
import { useDebounce } from '@/hooks/useDebounce';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { format } from 'date-fns';

export const ConsultationSearchModal = ({ isOpen, onClose, onSelectConsultation }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedName = useDebounce(name, 300);
  const debouncedPhone = useDebounce(phone, 300);
  const debouncedKeyword = useDebounce(keyword, 300);

  useEffect(() => {
    const searchConsultations = async () => {
      if (!debouncedName && !debouncedPhone && !debouncedKeyword) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('search-consultations', {
        body: { name: debouncedName, phone: debouncedPhone, keyword: debouncedKeyword },
      });

      if (error) {
        console.error('Error searching consultations:', error);
        setResults([]);
      } else {
        setResults(data.results);
      }
      setIsLoading(false);
    };

    searchConsultations();
  }, [debouncedName, debouncedPhone, debouncedKeyword]);

  const handleSelect = (consultation) => {
    onSelectConsultation(consultation);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Search Consultations</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
          <Input placeholder="Search by name..." value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Search by phone..." value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="Search by keyword..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Accordion type="multiple" collapsible>
              {results.map((patient) => (
                <AccordionItem value={`patient-${patient.id}`} key={patient.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                      <span>{patient.name}</span>
                      <span className="text-sm text-gray-500">{patient.phone}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {patient.consultations.map(consultation => (
                      <div key={consultation.id} className="border-b p-3 mb-2 cursor-pointer hover:bg-gray-100" onClick={() => handleSelect(consultation)}>
                        <p className="font-semibold">{format(new Date(consultation.created_at), 'PPP')}</p>
                        {Object.entries(consultation.consultation_data || {}).map(([key, value]) => (
                          value && <div key={key} className="text-sm"><strong>{key}: </strong><span>{Array.isArray(value) ? value.map(i => i.name || i).join(', ') : String(value)}</span></div>
                        ))}
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
