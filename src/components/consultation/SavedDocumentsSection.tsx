import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Receipt, Trash2, Printer, Edit, History } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { CertificateData, ReceiptData } from '@/types/consultation';
import { cn } from '@/lib/utils';

interface SavedDocumentsSectionProps {
  certificates: CertificateData[];
  receipts: ReceiptData[];
  onEditCertificate: (index: number) => void;
  onDeleteCertificate: (index: number) => void;
  onEditReceipt: (index: number) => void;
  onDeleteReceipt: (index: number) => void;
  className?: string;
}

export const SavedDocumentsSection: React.FC<SavedDocumentsSectionProps> = ({
  certificates,
  receipts,
  onEditCertificate,
  onDeleteCertificate,
  onEditReceipt,
  onDeleteReceipt,
  className
}) => {
  const hasDocuments = (certificates && certificates.length > 0) || (receipts && receipts.length > 0);

  if (!hasDocuments) return null;

  return (
    <Card className={cn("border-primary/10 bg-primary/5 shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
          <History className="w-4 h-4" />
          Saved Documents & Receipts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Certificates */}
        {certificates && certificates.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Medical Certificates
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {certificates.map((cert, idx) => (
                <div key={`cert-${idx}`} className="flex items-center justify-between p-2 rounded-md bg-background border border-primary/10 hover:border-primary/30 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">
                      {cert.restPeriodDays} Days Rest
                    </span>
                    <span className="text-[10px] text-muted-foreground flex flex-col">
                      <span>Cert Date: {format(new Date(cert.certificateDate), 'PP')}</span>
                      {cert.restPeriodStartDate && (
                        <span>Rest: {format(new Date(cert.restPeriodStartDate), 'PP')} to {format(addDays(new Date(cert.restPeriodStartDate), cert.restPeriodDays - 1), 'PP')}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => onEditCertificate(idx)}
                      title="View / Print"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteCertificate(idx)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts */}
        {receipts && receipts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Receipt className="w-3 h-3" />
              Receipts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {receipts.map((receipt, idx) => (
                <div key={`receipt-${idx}`} className="flex items-center justify-between p-2 rounded-md bg-background border border-primary/10 hover:border-primary/30 transition-colors group">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">
                      ₹{receipt.amountPaid}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {receipt.created_at ? format(new Date(receipt.created_at), 'PP h:mm a') : 'Unsaved'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-primary hover:bg-primary/10"
                      onClick={() => onEditReceipt(idx)}
                      title="View / Print"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => onDeleteReceipt(idx)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
