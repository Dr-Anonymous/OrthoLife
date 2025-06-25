import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, Home, Building, User, Users, Clipboard, Wifi, WifiOff } from 'lucide-react';

const WhatsAppMe = () => {
  const [phone, setPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState(null);

  // Register Service Worker for offline caching
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swCode = `
        const CACHE_NAME = 'whatsapp-comm-static-v1';
        
        self.addEventListener('install', function(event) {
          self.skipWaiting();
          event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
              return cache.addAll([
                '/',
                '/static/js/bundle.js',
                '/static/css/main.css',
                '/manifest.json'
              ]).catch(function() {
                // Ignore cache errors for non-existent files
                console.log('Some resources could not be cached');
              });
            })
          );
        });

        self.addEventListener('activate', function(event) {
          event.waitUntil(
            caches.keys().then(function(cacheNames) {
              return Promise.all(
                cacheNames.map(function(cacheName) {
                  if (cacheName !== CACHE_NAME) {
                    return caches.delete(cacheName);
                  }
                })
              );
            })
          );
        });

        self.addEventListener('fetch', function(event) {
          event.respondWith(
            caches.match(event.request).then(function(response) {
              return response || fetch(event.request).catch(function() {
                // Return cached version if fetch fails
                return caches.match('/');
              });
            })
          );
        });
      `;

      const blob = new Blob([swCode], { type: 'application/javascript' });
      const swUrl = URL.createObjectURL(blob);
      
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('ServiceWorker registered successfully');
          // Force immediate activation
          if (registration.waiting) {
            registration.waiting.postMessage({command: 'skipWaiting'});
          }
        })
        .catch(error => {
          console.log('ServiceWorker registration failed:', error);
        });
    }
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Toast system
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const formatPhoneNumber = (input) => {
    const digitsOnly = input.replace(/[^0-9]/g, '');
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly.slice(2);
    }
    return digitsOnly;
  };

  const process = (e) => {
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
        address = "_Dr%20Samuel%20Manoj%20Cherukuri_%0A%2A98668%2012555%2A%20%0A%0A9-5%20pm%20at%3A%0ALaxmi%20Hospital%2C%0AGudarigunta%2C%20Kakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F5Xkr4FU";
        break;
      case 3:
        address = "Dr%20Samuel%20Manoj%20Cherukuri%0A_98668%2012555_%0A%0AAfter%20%2A_7%3A30%20pm_%2A%20at%20%20%2AOrthoLife%2A%20%3A%0ARoad%20number%203%2C%0AR%20R%20Nagar%2C%20near%20RTO%20office%2C%0AKakinada%0A%0ALocation%3A%0Ahttps%3A%2F%2Fg.co%2Fkgs%2F6ZEukv";
        break;
      default:
        address = "%2F";
    }

    window.location.href = `https://wa.me/91${formattedPhone}?text=${address}`;
  };

  const inform = (e) => {
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
        address = `https://wa.me/917093551714?text=${formattedPhone}`;
        break;
      case 2:
        address = `https://wa.me/919652377616?text=${formattedPhone}`;
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
    try {
      const text = await navigator.clipboard.readText();
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

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
  };

  const showError = (message) => {
    setToast({ type: 'error', message });
  };

  const showSuccess = (message) => {
    setToast({ type: 'success', message });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-green-500 p-4">
      {/* Offline Indicator */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Offline Mode - App Cached</span>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform ${
          toast.type === 'error' 
            ? 'bg-red-50 border border-red-200 text-red-800' 
            : 'bg-green-50 border border-green-200 text-green-800'
        }`}>
          <div className="font-semibold text-sm">
            {toast.type === 'error' ? 'Error' : 'Success'}
          </div>
          <div className="text-sm mt-1">{toast.message}</div>
        </div>
      )}

      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Phone className="w-6 h-6" />
            <h1 className="text-xl font-bold">WhatsApp Communication</h1>
            {isOnline ? (
              <Wifi className="w-4 h-4 ml-auto opacity-75" />
            ) : (
              <WifiOff className="w-4 h-4 ml-auto opacity-75" />
            )}
          </div>
          <p className="text-green-100 text-sm">
            Quickly send messages or share contact information
            {!isOnline && " (Offline Ready!)"}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Phone Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                className="w-full h-12 px-4 pr-12 text-base border-2 border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-100 transition-all duration-200 outline-none"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Enter phone number"
              />
              <button
                onClick={handlePasteClick}
                disabled={isProcessing}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Send to number section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Send to this number
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={sms} 
                className="group bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <MessageSquare className="w-5 h-5 text-blue-600 group-hover:text-blue-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">SMS</span>
              </button>
              
              <button 
                onClick={() => process(1)} 
                className="group bg-white border-2 border-green-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <Phone className="w-5 h-5 text-green-600 group-hover:text-green-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">WhatsApp</span>
              </button>
              
              <button 
                onClick={() => process(3)} 
                className="group bg-white border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <Home className="w-5 h-5 text-orange-600 group-hover:text-orange-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-orange-700">Clinic</span>
              </button>
              
              <button 
                onClick={() => process(2)} 
                className="group bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <Building className="w-5 h-5 text-purple-600 group-hover:text-purple-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Laxmi</span>
              </button>
            </div>
          </div>

          {/* Share number section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Share this number with
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => inform(1)} 
                className="group bg-white border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <Users className="w-5 h-5 text-indigo-600 group-hover:text-indigo-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">Reception</span>
              </button>
              
              <button 
                onClick={() => inform(2)} 
                className="group bg-white border-2 border-pink-200 hover:border-pink-400 hover:bg-pink-50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1"
              >
                <User className="w-5 h-5 text-pink-600 group-hover:text-pink-700" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-pink-700">OP Room</span>
              </button>
            </div>
          </div>

          {/* Info box */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
            <Clipboard className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Click the clipboard icon to paste a phone number.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppMe;
