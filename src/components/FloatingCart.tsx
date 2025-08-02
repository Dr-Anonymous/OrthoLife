import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Calendar } from 'lucide-react';

interface FloatingCartProps {
  itemCount: number;
  total: number;
  onCheckout: () => void;
  type: 'pharmacy' | 'diagnostics';
}

const FloatingCart: React.FC<FloatingCartProps> = ({ itemCount, total, onCheckout, type }) => {
  if (itemCount === 0) return null;

  const icon = type === 'pharmacy' ? ShoppingCart : Calendar;
  const text = type === 'pharmacy' ? 'Checkout' : 'Book Tests';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={onCheckout}
        size="lg"
        className="relative shadow-lg hover:shadow-xl transition-all duration-200 min-w-[140px]"
      >
        <div className="flex items-center gap-2">
          {React.createElement(icon, { className: "h-5 w-5" })}
          <span className="hidden sm:inline">{text}</span>
          <div className="flex flex-col items-end">
            <Badge variant="secondary" className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground">
              {itemCount}
            </Badge>
          </div>
        </div>
        <div className="absolute -bottom-1 left-0 right-0 text-xs opacity-90">
          ₹{total}
        </div>
      </Button>
    </div>
  );
};

export default FloatingCart;