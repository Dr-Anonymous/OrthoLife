import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PrescriptionsCard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [records, setRecords] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = async () => {
    if (user?.phoneNumber) {
      try {
        setLoading(true);
        const phoneNumber = user.phoneNumber.slice(-10);
        const { data, error } = await supabase.functions.invoke('search-whatsappme-records', {
          body: { phoneNumber },
        });

        if (error) throw new Error(`Error fetching records: ${error.message}`);
        setRecords(data);
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
  }, [user]);

  const handleFileUpload = async () => {
    if (!selectedFile || !user?.phoneNumber) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onloadend = async () => {
      try {
        const fileContent = reader.result as string;
        const { error } = await supabase.functions.invoke('upload-file-to-drive', {
            body: {
                phoneNumber: user.phoneNumber.slice(-10),
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
        setError(err.message);
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
        {!loading && !error && (
          records?.patientFolders?.length > 0 ? (
            <ul className="space-y-3">
              {records.patientFolders.map((record: any) => (
                <div key={record.id} className="p-4 bg-gray-100 rounded-lg">
                  <a href={`https://drive.google.com/drive/folders/${record.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 hover:underline">{record.name}</a>
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
                                          rel="noopener noreferrer"
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
                                  rel="noopener noreferrer"
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
          ) : (
            <p className="text-gray-500">{t('prescriptionsCard.noRecords')}</p>
          )
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
      </CardContent>
    </Card>
  );
};

export default PrescriptionsCard;
