import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Stethoscope, Plus } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import SortableMedicationItem, { Medication } from './MedicationItem';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ConsultationContext } from '@/context/ConsultationContext';
import { useTranslation } from 'react-i18next';
import { useTextShortcuts } from '@/hooks/consultation/useTextShortcuts';

interface MedicalInformationFormProps {
  medicationNameInputRef: React.RefObject<HTMLInputElement | null>;
  fetchSavedMedications: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

const MedicalInformationForm: React.FC<MedicalInformationFormProps> = ({
  medicationNameInputRef,
  fetchSavedMedications,
  handleDragEnd,
}) => {
  const { state, dispatch } = React.useContext(ConsultationContext);
  const { i18n } = useTranslation();
  const { expandShortcut } = useTextShortcuts();

  const {
    extraData,
    suggestedInvestigations,
    suggestedAdvice,
    suggestedMedications,
    savedMedications,
    suggestedFollowup,
  } = state;

  const handleInvestigationSuggestionClick = (investigation: string) => {
    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field: 'investigations', value: [extraData.investigations, investigation].filter(Boolean).join('\n') } });
    dispatch({ type: 'SET_SUGGESTED_INVESTIGATIONS', payload: suggestedInvestigations.filter(item => item !== investigation) });
  };

  const handleAdviceSuggestionClick = (advice: string) => {
    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field: 'advice', value: [extraData.advice, advice].filter(Boolean).join('\n') } });
    dispatch({ type: 'SET_SUGGESTED_ADVICE', payload: suggestedAdvice.filter(item => item !== advice) });
  };

  const handleMedicationSuggestionClick = (med: Medication) => {
    const medToAdd = i18n.language === 'te' ? {
      ...med,
      instructions: med.instructions_te || med.instructions,
      frequency: med.frequency_te || med.frequency,
      notes: med.notes_te || med.notes,
    } : med;

    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field: 'medications', value: [...extraData.medications, medToAdd] } });
    dispatch({ type: 'SET_SUGGESTED_MEDICATIONS', payload: suggestedMedications.filter((item: Medication) => item.id !== med.id) });
  };

  const handleFollowupSuggestionClick = (followup: string) => {
    dispatch({ type: 'UPDATE_EXTRA_DATA_FIELD', payload: { field: 'followup', value: [extraData.followup, followup].filter(Boolean).join('\n') } });
    dispatch({ type: 'SET_SUGGESTED_FOLLOWUP', payload: suggestedFollowup.filter(item => item !== followup) });
  };

  const handleMedChange = (index: number, field: keyof Medication, value: string | boolean) => {
    dispatch({ type: 'UPDATE_MEDICATION', payload: { index, field, value } });
  };

  const removeMedication = (index: number) => {
    dispatch({ type: 'REMOVE_MEDICATION', payload: index });
  };

  const addMedication = () => {
    dispatch({ type: 'ADD_MEDICATION' });
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Medical Information</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complaints" className="text-sm font-medium">Complaints</Label>
            <Textarea id="complaints" value={extraData.complaints} onChange={e => expandShortcut('complaints', e.target.value)} placeholder="Patient complaints..." className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="findings" className="text-sm font-medium">Clinical Findings</Label>
            <Textarea id="findings" value={extraData.findings} onChange={e => expandShortcut('findings', e.target.value)} placeholder="Clinical findings..." className="min-h-[100px]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 flex-wrap">
                <Label htmlFor="investigations" className="text-sm font-medium">Investigations</Label>
                {suggestedInvestigations.map((investigation) => (
                  <Button key={investigation} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleInvestigationSuggestionClick(investigation)}>
                    {investigation}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea id="investigations" value={extraData.investigations} onChange={e => expandShortcut('investigations', e.target.value)} placeholder="Investigations required..." className="min-h-[100px]" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="text-sm font-medium">Diagnosis</Label>
            <Textarea id="diagnosis" value={extraData.diagnosis} onChange={e => expandShortcut('diagnosis', e.target.value)} placeholder="Clinical diagnosis..." className="min-h-[100px]" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor="advice" className="text-sm font-medium">Medical Advice</Label>
            <LanguageSwitcher />
            {suggestedAdvice.map((advice) => (
              <Button key={advice} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleAdviceSuggestionClick(advice)}>
                {advice}
              </Button>
            ))}
          </div>
          <Textarea id="advice" value={extraData.advice} onChange={e => expandShortcut('advice', e.target.value)} placeholder="Medical advice..." className="min-h-[80px]" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Medications</h3>
            </div>
            {suggestedMedications.map((med) => (
              <Button key={med.id} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleMedicationSuggestionClick(med)}>
                {med.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pl-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={extraData.medications.map((m: Medication) => m.id)} strategy={verticalListSortingStrategy}>
              {extraData.medications.map((med: Medication, index: number) => (
                <SortableMedicationItem
                  key={med.id}
                  med={med}
                  index={index}
                  handleMedChange={handleMedChange}
                  removeMedication={removeMedication}
                  savedMedications={savedMedications}
                  medicationNameInputRef={index === extraData.medications.length - 1 ? medicationNameInputRef : null}
                  fetchSavedMedications={fetchSavedMedications}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end items-center gap-2">
          <Button type="button" onClick={addMedication} variant="outline" size="icon" className="rounded-full">
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add Medication</span>
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Label htmlFor="followup" className="text-sm font-medium">Follow-up</Label>
            {suggestedFollowup.map((followup) => (
              <Button key={followup} type="button" size="sm" variant="outline" className="h-auto px-2 py-1 text-xs" onClick={() => handleFollowupSuggestionClick(followup)}>
                {followup}
              </Button>
            ))}
          </div>
          <Textarea id="followup" value={extraData.followup} onChange={e => expandShortcut('followup', e.target.value)} placeholder="Follow-up instructions..." className="min-h-[80px]" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="personalNote" className="text-sm font-medium">Doctor's Personal Note</Label>
          <Textarea id="personalNote" value={extraData.personalNote} onChange={e => expandShortcut('personalNote', e.target.value)} placeholder="e.g., Patient seemed anxious, follow up on test results..." className="min-h-[80px]" />
        </div>
      </div>
    </>
  );
};

export default MedicalInformationForm;
