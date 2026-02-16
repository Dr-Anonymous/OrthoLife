
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import About from '@/components/About';
import Doctors from '@/components/Doctors';
import PatientReviews from '@/components/PatientReviews';
import Contact from '@/components/Contact';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import { applySeo } from '@/utils/seo';

const Index = () => {
  useEffect(() => {
    applySeo({
      title: 'Orthopaedic Clinic in Kakinada | Joint Replacement, Arthroscopy, Fracture Care | OrthoLife',
      description: 'OrthoLife offers expert orthopaedic care in Kakinada for joint replacement, arthroscopy, fracture and trauma care, spine problems, and sports injuries.',
      canonicalPath: '/'
    });
  }, []);

  useEffect(() => {
    // Handle hash navigation on page load
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Hero />
        <Services />
        <About />
        <Doctors />
        <PatientReviews />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
