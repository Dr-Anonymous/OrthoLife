
import React from 'react';
import { Stethoscope, Syringe, Bone, PersonStanding, Microscope, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description }) => {
  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-shadow group">
      <CardHeader className="pb-2">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
          {icon}
        </div>
        <CardTitle className="text-xl font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-gray-600">{description}</CardDescription>
      </CardContent>
    </Card>
  );
};

const Services = () => {
  const services = [
    {
      icon: <Bone size={24} />,
      title: "Fracture Care",
      description: "Surgical and non-surgical management of fractures of limbs, spine and pelvis."
    },
    {
      icon: <Microscope size={24} />,
      title: "Arthroscopy",
      description: "Key hole surgeries for knee and shoulder ailments- ACL, PCL, meniscus, rotator cuff and bankarts."
    },
    {
      icon: <PersonStanding size={24} />,
      title: "Spine surgery",
      description: "For sciatica/ disc problems and spine fractures."
    },
    {
      icon: <Syringe size={24} />,
      title: "Joint preservation/replacement",
      description: "PRP, viscosupplements and stem cell injections (orthobiologics) for early stage arthritis. Partial and total replacement of hip/knee joints."
    },
    {
      icon: <Stethoscope size={24} />,
      title: "Physician Consultation",
      description: "Comprehensive health assessments and medical consultations for various health concerns."
    },
    {
      icon: <Heart size={24} />,
      title: "Chronic Pain Care",
      description: "Non-surgical solutions for chronic pain, guided by advanced imaging for pinpoint accuracy and lasting relief."
    },
  ];

  return (
    <section id="services" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Our Services</h2>
          <p className="text-gray-600">
            Expert orthopaedic care for joints, spine, and sports injuries—personalized to get you <i>Back to Health</i>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <ServiceCard 
              key={index} 
              icon={service.icon} 
              title={service.title} 
              description={service.description} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
