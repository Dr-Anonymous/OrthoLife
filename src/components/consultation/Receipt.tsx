
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

// --- Interfaces ---

interface Patient {
  id: string;
  name: string;
  sex: string;
}

export interface ReceiptData {
  amountPaid: number;
  serviceName: string;
}

interface ReceiptProps {
  patient: Patient;
  receiptData: ReceiptData;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptData) => void;
  patientName: string;
}

// --- Receipt Component (Print Layout) ---

/**
 * Receipt Component
 * 
 * Renders the printable Payment Receipt.
 * Features:
 * - Displays Amount Paid and Service Name.
 * - Includes clinic header and footer.
 */
export const Receipt: React.FC<ReceiptProps> = ({ patient, receiptData }) => {
  const { amountPaid, serviceName } = receiptData;
  const patientPrefix = patient.sex === 'M' ? 'Mr.' : 'Mrs.';

  const backgroundPattern = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23dbeafe' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

  return (
    <div className="bg-white text-black font-sans p-8">
      <div className="w-[210mm] h-[297mm] p-8 flex flex-col">
        <header
          className="flex justify-between items-center pb-4 border-b-2 border-primary-light rounded-t-lg"
          style={{ backgroundImage: backgroundPattern }}
        >
          <div className="flex items-center">
            <img src="/images/logos/logo.png" alt="Clinic Logo" className="h-20 w-auto" />
          </div>
          <div className="text-right">
            <h2 className="text-xl font-heading font-bold text-primary" style={{ fontFamily: 'var(--font-heading)' }}>Dr Samuel Manoj Cherukuri</h2>
            <p className="text-muted-foreground">MBBS, MS Ortho (Manipal)</p>
            <p className="text-muted-foreground">Orthopaedic Surgeon</p>
            <p className="mt-2 text-gray-700">
              <span className="font-semibold">📞 98668 12555</span>
              <span className="mx-2">|</span>
              <span className="font-semibold">📧 info@ortho.life</span>
            </p>
          </div>
        </header>

        <div className="text-right py-2 text-muted-foreground">
          {format(new Date(), 'dd/MM/yyyy')}
        </div>

        <main className="flex-grow">
          <h2 className="text-2xl font-bold text-center underline mb-12">
            Receipt
          </h2>
          <div className="text-lg leading-relaxed space-y-6">
            <p>
              Received with thanks from {patientPrefix} <strong>{patient.name}</strong>, bearing ID No.: <strong>{patient.id}</strong> an amount of ₹ <strong>{amountPaid}</strong> towards {serviceName}.
            </p>
          </div>
        </main>

        <footer className="mt-auto">
          <div className="flex justify-between items-end">
            <div></div>
            <div className="text-center">
              <img src="/images/assets/sign.png" alt="Doctor's Signature" className="h-20" />
              <div className="relative">
                <img src="/images/assets/seal.png" alt="Doctor's Seal" className="h-24 absolute -top-16 left-1/2 -translate-x-1/2 opacity-50" />
              </div>
            </div>
          </div>
          <div className="border-t-2 border-blue-600 pt-4 mt-8 text-center text-sm">
            <p>OrthoLife</p>
            <p>📍 Road No. 3, RR Nagar, Kakinada-03.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

// --- ReceiptModal Component (Data Entry) ---

/**
 * ReceiptModal Component
 * 
 * Form to input details for generating a Payment Receipt.
 * Features:
 * - Inputs for Amount and Service Name.
 * - Default service name "OP consultation charges".
 */
export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, onSubmit, patientName }) => {
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [serviceName, setServiceName] = useState('OP consultation charges');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!amountPaid) {
      // Basic validation
      return;
    }
    setIsSubmitting(true);
    onSubmit({
      amountPaid: Number(amountPaid),
      serviceName,
    });
    // The parent component will handle closing the modal on success
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Generate Receipt</DialogTitle>
          <DialogDescription>
            Enter the required details for {patientName}'s receipt.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount-paid" className="text-right">
              Amount Paid (₹)
            </Label>
            <Input
              id="amount-paid"
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="service-name" className="text-right">
              Service Name
            </Label>
            <Input
              id="service-name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
