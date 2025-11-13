import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ConsultationContext } from '@/context/ConsultationContext';

export const useConsultationForm = () => {
    const { state, dispatch } = React.useContext(ConsultationContext);
    const {
        selectedConsultation,
        editablePatientDetails,
        extraData,
        isFormDirty,
        nextConsultation,
        initialPatientDetails,
        initialExtraData,
    } = state;

    const handleSelectConsultation = (consultation: any) => {
        if (isFormDirty) {
            dispatch({ type: 'SET_NEXT_CONSULTATION', payload: consultation });
            dispatch({ type: 'SET_IS_UNSAVED_MODAL_OPEN', payload: true });
        } else {
            dispatch({ type: 'SET_SELECTED_CONSULTATION', payload: consultation });
        }
    };

    const handleConfirmSave = async () => {
        const success = await saveChanges();
        if (success) {
            dispatch({ type: 'SET_IS_UNSAVED_MODAL_OPEN', payload: false });
            if (nextConsultation) {
                dispatch({ type: 'SET_SELECTED_CONSULTATION', payload: nextConsultation });
            }
        }
    };

    const handleDiscardChanges = () => {
        dispatch({ type: 'SET_IS_UNSAVED_MODAL_OPEN', payload: false });
        if (nextConsultation) {
            dispatch({ type: 'SET_SELECTED_CONSULTATION', payload: nextConsultation });
        }
    };

    const saveChanges = async (options: { markAsCompleted?: boolean } = {}) => {
        if (!selectedConsultation || !editablePatientDetails) {
            toast({ variant: 'destructive', title: 'Error', description: 'No consultation selected.' });
            return false;
        }

        const patientDetailsChanged = JSON.stringify(editablePatientDetails) !== JSON.stringify(initialPatientDetails);
        const extraDataChanged = JSON.stringify(extraData) !== JSON.stringify(initialExtraData);

        const shouldAttemptToComplete = options.markAsCompleted &&
            (extraData.medications.length > 0 || (extraData.followup && extraData.followup.trim() !== ''));

        const newStatus = shouldAttemptToComplete ? 'completed' : selectedConsultation.status;
        const statusChanged = newStatus !== selectedConsultation.status;

        if (!patientDetailsChanged && !extraDataChanged && !statusChanged) {
            toast({ title: 'No Changes', description: 'No new changes to save.' });
            return true;
        }

        try {
            if (patientDetailsChanged) {
                const { error: patientUpdateError } = await supabase
                    .from('patients')
                    .update({
                        name: editablePatientDetails.name,
                        dob: editablePatientDetails.dob,
                        sex: editablePatientDetails.sex,
                        phone: editablePatientDetails.phone,
                    })
                    .eq('id', editablePatientDetails.id);
                if (patientUpdateError) throw new Error(`Failed to update patient details: ${patientUpdateError.message}`);
            }

            const consultationUpdatePayload: { consultation_data?: any, status?: string } = {};

            if (extraDataChanged) {
                consultationUpdatePayload.consultation_data = { ...extraData, language: 'en' };
            }
            if (statusChanged) {
                consultationUpdatePayload.status = newStatus;
            }

            if (Object.keys(consultationUpdatePayload).length > 0) {
                const { error: updateError } = await supabase
                    .from('consultations')
                    .update(consultationUpdatePayload)
                    .eq('id', selectedConsultation.id);
                if (updateError) throw new Error(`Failed to save consultation data: ${updateError.message}`);
            }

            toast({ title: 'Success', description: 'Your changes have been saved.' });

            const updatedConsultation = {
                ...selectedConsultation,
                patient: { ...editablePatientDetails },
                consultation_data: { ...extraData, language: 'en' },
                status: newStatus as 'pending' | 'completed',
            };

            dispatch({ type: 'SET_SELECTED_CONSULTATION', payload: updatedConsultation });
            dispatch({ type: 'SET_INITIAL_FORM_STATE', payload: { patient: editablePatientDetails, extraData } });
            dispatch({ type: 'UPDATE_CONSULTATION_IN_LIST', payload: updatedConsultation });

            return true;
        } catch (error) {
            console.error('Error saving changes:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save changes. Please try again.' });
            return false;
        }
    };

    return {
        handleSelectConsultation,
        handleConfirmSave,
        handleDiscardChanges,
        saveChanges,
    };
};
