import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const UploadPrescriptionPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsUploading(true);
    
    // Simulate upload process
    setTimeout(() => {
      setIsUploading(false);
      setUploadStatus('success');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow bg-muted/50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-heading font-bold text-primary mb-4">
                Upload Prescription
              </h1>
              <p className="text-lg text-muted-foreground">
                Upload your prescription and get medicines delivered to your doorstep
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="text-primary" />
                  Prescription Details
                </CardTitle>
                <CardDescription>
                  Please upload clear images of your prescription and provide your contact details
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* File Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="prescription">Prescription Images *</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <Input
                        id="prescription"
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Label htmlFor="prescription" className="cursor-pointer">
                        <Button type="button" variant="outline" className="mb-2">
                          Choose Files
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Upload images or PDF files (Max 5MB each)
                        </p>
                      </Label>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Selected files:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {files.map((file, index) => (
                            <li key={index} className="flex items-center gap-2">
                              <FileText size={16} />
                              {file.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Patient Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Patient Name *</Label>
                      <Input id="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input id="phone" type="tel" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address *</Label>
                    <Textarea id="address" rows={3} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea 
                      id="notes" 
                      rows={2} 
                      placeholder="Any specific instructions or queries"
                    />
                  </div>

                  {/* Status Messages */}
                  {uploadStatus === 'success' && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="text-green-600" size={20} />
                      <span className="text-green-700">
                        Prescription uploaded successfully! We'll contact you shortly.
                      </span>
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="text-red-600" size={20} />
                      <span className="text-red-700">
                        Upload failed. Please try again.
                      </span>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isUploading || files.length === 0}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Prescription'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Help Section */}
            <Card className="mt-8">
              <CardHeader>
                <CardTitle>How it works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="text-primary" size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">1. Upload</h3>
                    <p className="text-sm text-muted-foreground">
                      Upload clear images of your prescription
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="text-primary" size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">2. Review</h3>
                    <p className="text-sm text-muted-foreground">
                      Our pharmacist will review your prescription
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="text-primary" size={20} />
                    </div>
                    <h3 className="font-semibold mb-2">3. Deliver</h3>
                    <p className="text-sm text-muted-foreground">
                      Medicines delivered to your doorstep
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default UploadPrescriptionPage;