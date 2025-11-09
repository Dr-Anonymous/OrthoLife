import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface PrescriptionsCardProps {
  patientName: string;
  fetchPrescription: () => void;
}

const PrescriptionsCard: React.FC<PrescriptionsCardProps> = ({ patientName, fetchPrescription }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [key, setKey] = useState(Date.now());

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
        
        toast.success(t('prescriptionsCard.uploadSuccess'));
        setSelectedFile(null);
        setKey(Date.now());
        fetchPrescription(); // Refresh the data in the parent component
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.onerror = () => {
        toast.error('Failed to read file.');
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
        {patientName ? (
          <div className="p-4 bg-gray-100 rounded-lg">
            <p className="font-medium text-gray-800">{patientName}</p>
          </div>
        ) : (
          <p className="text-gray-500">{t('prescriptionsCard.noRecords')}</p>
        )}

        <div className="mt-4 pt-4 border-t">
          <h3 className="text-lg font-medium text-gray-800 mb-2">{t('prescriptionsCard.uploadTitle')}</h3>
          <div className="flex items-center space-x-2">
            <Input
              key={key}
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
