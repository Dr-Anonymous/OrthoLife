
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Services from '@/components/Services';
import About from '@/components/About';
import PatientReviews from '@/components/PatientReviews';
import Contact from '@/components/Contact';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import { useSEO, OrganizationSchema, WebsiteSchema } from '@/components/SEO';

const Index = () => {
  // SEO optimization for homepage
  useSEO({
    title: 'OrthoLife - Expert Orthopaedic Care | Fractures, Sports Injuries & Joint Treatment',
    description: 'OrthoLife offers specialized orthopaedic care for fractures, sports injuries, spine, joint, and orthobiologic treatments. Get back to health, doing what you love—stronger, faster, pain-free.',
    keywords: 'orthopaedic care, orthopedic doctor, fracture treatment, sports injury, spine treatment, joint replacement, physiotherapy, bone specialist, orthobiologic treatment',
    url: 'https://ortho.life',
    type: 'website'
  });

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
      {/* Structured Data */}
      <OrganizationSchema />
      <WebsiteSchema />
      
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

export default Index;
