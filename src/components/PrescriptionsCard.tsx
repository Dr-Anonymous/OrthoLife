import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const PrescriptionsCard = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    fetchRecords();
  }, [user]);

  return (
    <Card className="lg:col-span-1">
      <CardHeader className="flex flex-row items-center space-x-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <CardTitle>My Prescriptions and Records</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p>Loading records...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          records?.patientFolders?.length > 0 ? (
            <ul className="space-y-3">
              {records.patientFolders.map((record: any) => (
                <div key={record.id} className="p-4 bg-gray-100 rounded-lg">
                  <a href={`https://drive.google.com/drive/folders/${record.id}`} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 hover:underline">{record.name}</a>
                  {record.files && record.files.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {record.files.map((file: any) => (
                        <li key={file.id} className="text-sm text-gray-600 flex justify-between items-center">
                          <span>{file.name}</span>
                          <div className="flex items-center">
                            <span className="mr-4">{new Date(file.createdTime).toLocaleDateString()}</span>
                            <a
                              href={
                                file.mimeType === 'application/vnd.google-apps.document'
                                  ? `https://docs.google.com/document/d/${file.id}/export?format=pdf`
                                  : `https://drive.google.com/file/d/${file.id}/view`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No prescriptions/records found.</p>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionsCard;