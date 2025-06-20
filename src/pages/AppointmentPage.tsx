
import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import AppointmentBookingSection from '@/components/AppointmentBookingSection';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

const AppointmentPage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <AppointmentBookingSection />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default AppointmentPage;
