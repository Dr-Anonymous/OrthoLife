import React from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import About from '@/components/About';
import PatientReviews from '@/components/PatientReviews';
import Contact from '@/components/Contact';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

function Page() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <About />
        <PatientReviews />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Page;
