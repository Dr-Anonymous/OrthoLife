import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Download, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { Prescription } from '@/components/Prescription';
import { format } from 'date-fns';
import { HOSPITALS } from '@/config/constants';
import { useToast } from '@/components/ui/use-toast';
import { cleanConsultationData } from '@/lib/utils';

interface PrescriptionsCardProps {
  patientId: string | undefined;
  patientPhone: string | undefined;
}

const PrescriptionsCard: React.FC<PrescriptionsCardProps> = ({ patientId, patientPhone }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [driveRecords, setDriveRecords] = useState<any>(null);
  const [userUploads, setUserUploads] = useState<any[]>([]);
  const [dbConsultations, setDbConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [printingConsultation, setPrintingConsultation] = useState<any>(null);
  const printRef = useRef(null);

  const fetchRecords = async () => {
    if (patientId) {
      try {
        setLoading(true);
        // 1. Fetch from database
        const { data: dbData, error: dbError } = await supabase.functions.invoke('get-consultations', {
          body: { patientId },
        });
        if (dbError) throw new Error(`Error fetching database records: ${dbError.message}`);

        if (dbData.consultations && dbData.consultations.length > 0) {
          setDbConsultations(dbData.consultations);
          setDriveRecords(null);
        } else {
          // 2. Fallback to Google Drive
          if (patientPhone) {
            const { data: driveData, error: driveError } = await supabase.functions.invoke('get-patient-drive-files', {
              body: { phoneNumber: patientPhone },
            });
            if (driveError) throw new Error(`Error fetching drive records: ${driveError.message}`);
            setDriveRecords(driveData);
            setDbConsultations([]);
          }
        }

        // 3. Fetch user uploads
        const { data: uploadsData, error: uploadsError } = await supabase.functions.invoke('get-patient-uploads', {
          body: { patientId },
        });
        if (uploadsError) throw new Error(`Error fetching user uploads: ${uploadsError.message}`);
        setUserUploads(uploadsData || []);

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
    fetchRecords();
  }, [patientId, patientPhone]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setPrintingConsultation(null),
  });

  useEffect(() => {
    if (printingConsultation) {
      handlePrint();
    }
  }, [printingConsultation, handlePrint]);

  const handleFileUpload = async (retryCount = 1) => {
    if (!selectedFile || !patientId) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      try {
        const fileContent = reader.result as string;
        const { error } = await supabase.functions.invoke('upload-file-to-drive', {
          body: {
            patientId,
            fileName: selectedFile.name,
            fileContent,
            mimeType: selectedFile.type
          },
        });

        if (error) throw new Error(`Upload failed: ${error.message}`);

        setSelectedFile(null);
        await fetchRecords();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }

      } catch (err: any) {
        if (retryCount > 0) {
          handleFileUpload(retryCount - 1);
        } else {
          toast({
            title: "Upload Failed",
            description: "Please try again later.",
            variant: "destructive",
          });
          setError(err.message);
        }
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setUploading(false);
    };
  };

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center space-x-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <CardTitle>{t('prescriptionsCard.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p>{t('prescriptionsCard.loading')}</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && !error && dbConsultations.length > 0 && (
          <ul className="space-y-3 max-h-60 overflow-y-auto">
            {dbConsultations.map((consultation: any) => (
              <li key={consultation.id} className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">Consultation</p>
                  <p className="text-sm text-gray-600">{format(new Date(consultation.created_at), 'PPP')}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPrintingConsultation(consultation)}>
                  <Download className="mr-2 h-4 w-4" />
                  {t('prescriptionsCard.download')}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {!loading && !error && dbConsultations.length === 0 && driveRecords?.patientFolders?.length > 0 && (
          <ul className="space-y-3">
            {driveRecords.patientFolders.map((record: any) => (
              <div key={record.id} className="p-4 bg-gray-100 rounded-lg">
                <p className="font-medium text-gray-800">{record.name}</p>
                {record.files && record.files.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {record.files.map((file: any) => {
                      if (file.name === 'uploads' && file.mimeType === 'application/vnd.google-apps.folder') {
                        return (
                          <li key={file.id} className="text-sm text-gray-600">
                            <span className='font-medium'>{file.name}</span>
                            {file.files && file.files.length > 0 && (
                              <ul className="ml-4 mt-1 space-y-1">
                                {file.files.map((subFile: any) => (
                                  <li key={subFile.id} className="flex justify-between items-center">
                                    <span>{subFile.name}</span>
                                    <div className="flex items-center">
                                      <span className="mr-4">{new Date(subFile.createdTime).toLocaleDateString()}</span>
                                      <a
                                        href={
                                          subFile.mimeType === 'application/vnd.google-apps.document'
                                            ? `https://docs.google.com/document/d/${subFile.id}/export?format=pdf`
                                            : subFile.mimeType === 'application/vnd.google-apps.folder'
                                              ? `https://drive.google.com/drive/folders/${subFile.id}`
                                              : `https://drive.google.com/file/d/${subFile.id}/view`
                                        }
                                        target="_blank"
                                        className="text-blue-600 hover:underline"
                                      >
                                        {t('prescriptionsCard.view')}
                                      </a>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      } else {
                        return (
                          <li key={file.id} className="text-sm text-gray-600 flex justify-between items-center">
                            <span>{file.name}</span>
                            <div className="flex items-center">
                              <span className="mr-4">{new Date(file.createdTime).toLocaleDateString()}</span>
                              <a
                                href={
                                  file.mimeType === 'application/vnd.google-apps.document'
                                    ? `https://docs.google.com/document/d/${file.id}/export?format=pdf`
                                    : file.mimeType === 'application/vnd.google-apps.folder'
                                      ? `https://drive.google.com/drive/folders/${file.id}`
                                      : `https://drive.google.com/file/d/${file.id}/view`
                                }
                                target="_blank"

                                className="text-blue-600 hover:underline"
                              >
                                {t('prescriptionsCard.view')}
                              </a>
                            </div>
                          </li>
                        );
                      }
                    })}
                  </ul>
                )}
              </div>
            ))}
          </ul>
        )}

        {!loading && !error && dbConsultations.length === 0 && (!driveRecords?.patientFolders || driveRecords.patientFolders.length === 0) && (
          <p className="text-gray-500">{t('prescriptionsCard.noRecords')}</p>
        )}

        {userUploads.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h3 className="text-lg font-medium text-gray-800 mb-2">{t('prescriptionsCard.userUploadsTitle')}</h3>
            <ul className="space-y-3 max-h-60 overflow-y-auto">
              {userUploads.map((file: any) => (
                <li key={file.id} className="p-3 bg-gray-100 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-sm text-gray-600">{format(new Date(file.createdTime), 'PPP')}</p>
                  </div>
                  <a
                    href={`https://drive.google.com/file/d/${file.id}/view`}
                    target="_blank"

                    className="text-blue-600 hover:underline"
                  >
                    {t('prescriptionsCard.view')}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 pt-4 border-t">
          <h3 className="text-lg font-medium text-gray-800 mb-2">{t('prescriptionsCard.uploadTitle')}</h3>
          <div className="flex items-center space-x-2">
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
              className="flex-grow"
            />
            <Button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? t('prescriptionsCard.uploading') : t('prescriptionsCard.upload')}
            </Button>
          </div>
        </div>
        <div style={{ position: 'absolute', left: '-9999px' }}>
          <div ref={printRef}>
            {printingConsultation && (
              <Prescription
                patient={printingConsultation.patient}
                consultation={cleanConsultationData(printingConsultation.consultation_data)}
                consultationDate={new Date(printingConsultation.created_at)}
                age={printingConsultation.patient.dob ? Math.floor((new Date() - new Date(printingConsultation.patient.dob)) / 31557600000) : ''}
                language={i18n.language}
                logoUrl={HOSPITALS.find(h => h.name === 'OrthoLife')?.logoUrl}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrescriptionsCard;
