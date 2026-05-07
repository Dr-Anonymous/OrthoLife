import { useState, useEffect, type ReactNode } from 'react';
import { calculateAge } from '@/lib/age';
import { supabase } from '@/integrations/supabase/client';
import { normalizeSearchText, createNormalizationRegex } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ConsultationCard from './ConsultationCard';

/**
 * ConsultationSearchModal Component
 * 
 * Advanced search interface for all consultations.
 * Features:
 * - Multi-field search (Name, Phone, Keyword in notes).
 * - Accordion view of results grouped by Patient.
 * - Keyword highlighting in results.
 * - Selection triggers consultation load in main page.
 * - Dynamic resolution of consultant names and mapping for display.
 */
export const ConsultationSearchModal = ({ isOpen, onClose, onSelectConsultation }) => {
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // Caches all consultant IDs to their human-readable name string to avoid extra DB queries.
  const [consultantsMap, setConsultantsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchConsultants = async () => {
      const { data } = await supabase.from('consultants').select('id, name');
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(c => {
          let nameStr = '';
          if (typeof c.name === 'object' && c.name !== null) {
            nameStr = (c.name as any).en || (c.name as any).te || '';
          } else {
            nameStr = c.name || '';
          }
          map[c.id] = nameStr;
        });
        setConsultantsMap(map);
      }
    };
    if (isOpen) {
      fetchConsultants();
    }
  }, [isOpen]);

  const handleSearch = async () => {
    const trimmedKeyword = keyword.trim();
    const trimmedSearch = search.trim();
    if (!trimmedSearch && !trimmedKeyword) {
      setResults([]);
      return;
    }

    // Heuristic: if it looks like a phone number (mostly digits), search by phone.
    // Otherwise, search by name.
    const isPhoneNumber = /^[0-9+\-\s()]{5,}$/.test(trimmedSearch) && trimmedSearch.replace(/\D/g, '').length >= 5;
    const sanitizedPhone = isPhoneNumber ? trimmedSearch.replace(/\D/g, '') : '';
    const searchName = isPhoneNumber ? '' : trimmedSearch;

    setIsLoading(true);
    const { data, error } = await supabase.functions.invoke('search-consultations', {
      body: { name: searchName, phone: sanitizedPhone, keyword: trimmedKeyword },
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
      patient_id: patient.id,
      patient: patientData,
    };
    onSelectConsultation(reconstructedConsultation);
    onClose();
  };

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const highlightKeyword = (text: string): ReactNode => {
    const trimmed = keyword.trim();
    if (!trimmed || !text) return text;
    
    const fuzzyRegex = createNormalizationRegex(trimmed);
    if (!fuzzyRegex) return text;

    // Wrap the pattern in capturing parentheses to keep matches in split result
    const regex = new RegExp(`(${fuzzyRegex.source})`, 'gi');
    const parts = text.split(regex);

    const normalizedTrimmed = normalizeSearchText(trimmed);

    return parts.map((part, index) => {
      if (normalizeSearchText(part) === normalizedTrimmed && normalizedTrimmed.length > 0) {
        return (
          <mark key={index} className="bg-yellow-200 rounded-sm px-0.5">
            {part}
          </mark>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Search Consultations</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
          <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={handleKeyDown} />
          <Input placeholder="Search by keyword, hometown or occupation..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
        <div className="px-4 pb-4">
          <Button onClick={handleSearch} className="w-full">Search</Button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Accordion type="multiple">
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
                      <div className="flex flex-col items-end text-sm text-gray-500">
                        <span>{patient.phone}</span>
                        {patient.secondary_phone && <span>(Alt: {patient.secondary_phone})</span>}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {patient.consultations.map(consultation => (
                      <div key={consultation.id} className="border-b last:border-b-0 p-3 mb-2 cursor-pointer hover:bg-muted/50 rounded-md" onClick={() => handleSelect(consultation, patient)}>
                        <ConsultationCard
                          data={{
                            ...consultation.consultation_data,
                            referred_by: consultation.referred_by,
                            created_at: consultation.created_at,
                            location: consultation.location,
                            visit_type: consultation.visit_type,
                            status: consultation.status,
                            name: patient.name,
                            phone: patient.phone,
                            occupation: patient.occupation,
                            hometown: patient.hometown,
                            blood_group: patient.blood_group,
                            allergies: patient.allergies,
                            sex: patient.sex,
                            dob: patient.dob,
                            consultant_name: consultantsMap[consultation.consultant_id] || (consultation.consultant?.name && typeof consultation.consultant.name === 'object'
                              ? (consultation.consultant.name as any).en
                              : (consultation.consultant?.name || consultation.consultant_name || ''))
                          }}
                          highlightKeyword={highlightKeyword}
                        />
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
