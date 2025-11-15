
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceiptData) => void;
  patientName: string;
}

export interface ReceiptData {
  amountPaid: number;
  serviceName: string;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, onSubmit, patientName }) => {
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
