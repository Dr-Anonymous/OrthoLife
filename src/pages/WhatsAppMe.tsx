import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Phone, MessageSquare, Home, Building, FlaskConical, User, Users, Clipboard } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';


const WhatsAppMe = () => {
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPhoneNumber = (input: string) => {
    // Remove all non-digit characters
    const digitsOnly = input.replace(/[^0-9]/g, '');
    
    // If number starts with 91 and is 12 digits, remove the 91
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.slice(2);
    }
    return digitsOnly;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const numberFromURL = params.get('number');
    if (numberFromURL) {
      setPhone(formatPhoneNumber(numberFromURL));
    }
  }, []);
  
  const process = (e: number) => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    let address;
    switch (e) {
      case 2:
        address = "Dr%20Samuel%20Manoj%20Cherukuri%0A_98668%2012555_%0A%0AAfter%20%2A_7%3A30%20pm_%2A%20at%20%20%2AOrthoLife%2A%20%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%0AKakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv";
        break;
      case 3:
        address = "_Dr%20Samuel%20Manoj%20Cherukuri_%0A%2A98668%2012555%2A%20%0A%0A9-5%20pm%20at%3A%0ALaxmi%20Hospital%2C%0AGudarigunta%2C%20Kakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F5Xkr4FU";
        break;
      case 4:
        address = "_Dr%20Samuel%20Manoj%20Cherukuri_%20%0A9866812555%0A%0A%20%2A5-7%20pm%2A%20at%3A%0A%20_Badam%20clinical%20laboratory_%20%0Ahttps%3A%2F%2Fg.co%2Fkgs%2FeAgkp5S";
        break;
      default:
        address = "%2F";
    }
    
    const finalUrl = (window as any).AndroidClipboard ? `whatsapp://send?phone=91${formattedPhone}&text=${address}` : `https://wa.me/91${formattedPhone}?text=${address}`;
    window.location.href = finalUrl;
  };

  const inform = (e: number) => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    let address;
    switch (e) {
      case 1:
        address = (window as any).AndroidClipboard ? `whatsapp://send?phone=917093551714&text=${formattedPhone}` : `https://wa.me/917093551714?text=${formattedPhone}`;
        break;
      case 2:
        address = (window as any).AndroidClipboard ? `whatsapp://send?phone=919652377616&text=${formattedPhone}` : `https://wa.me/919652377616?text=${formattedPhone}`;        
        break;
      default:
        address = "%2F";
    }

    window.location.href = address;
  };

  const sms = () => {
    if (!phone) {
      showError('Please enter a phone number');
      return;
    }
    
    const formattedPhone = formatPhoneNumber(phone);
    if (!formattedPhone) {
      showError('Please enter a valid phone number');
      return;
    }

    window.location.href = `sms:${formattedPhone}?body=Dr%20Samuel%20Manoj%20Cherukuri%0A098668%2012555%0A%0A9-5pm%20at%3A%0ALaxmi%20Hospital%2C%20Gudarigunta%2C%20Kakinada%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F5Xkr4FU%0A%0AAfter%207pm%20at%20%28clinic%20address%29%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%20Kakinada%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv`;
  };

  const handlePasteClick = async () => {
    setIsProcessing(true);
    var text;
    try {
      if ((window as any).AndroidClipboard && (window as any).AndroidClipboard.getClipboardText) { 
        text = (window as any).AndroidClipboard.getClipboardText();
      } else {
        text = await navigator.clipboard.readText();
      }
      const formattedNumber = formatPhoneNumber(text);
      setPhone(formattedNumber);
      showSuccess('Phone number pasted from clipboard');
    } catch (error) {
      showError('Failed to read clipboard. Please paste manually.');
      console.error('Clipboard error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value);
  };

  const showError = (message: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  };

  const showSuccess = (message: string) => {
    toast({
      title: 'Success',
      description: message,
    });
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Phone className="w-5 h-5 text-blue-600" />
          WhatsApp Communication
        </CardTitle>
        <CardDescription>
          Quickly send messages or share contact information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="relative">
            <input
              type="tel"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="Enter phone number"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteClick}
              disabled={isProcessing}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 px-2"
            >
              <Clipboard className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Send to this number
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={sms} 
              className="h-auto py-2 flex-col gap-1"
            >
              <MessageSquare className="w-4 h-4" />
              <span>SMS</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => process(1)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Phone className="w-4 h-4" />
              <span>WhatsApp</span>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => process(2)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Home className="w-4 h-4" />
              <span>Clinic</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => process(3)}
              className="h-auto py-2 flex-col gap-1"
            >
              <Building className="w-4 h-4" />
              <span>Laxmi</span>
            </Button>
            <Button
              variant="outline" 
              onClick={() => process(4)}
              className="h-auto py-2 flex-col gap-1"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Badam</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Share this number with
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={() => inform(1)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <Users className="w-4 h-4" />
              <span>Reception</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => inform(2)} 
              className="h-auto py-2 flex-col gap-1"
            >
              <User className="w-4 h-4" />
              <span>OP Room</span>
            </Button>
          </div>
        </div>

        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
          <Clipboard className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>Click the clipboard icon to paste a phone number</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppMe;
