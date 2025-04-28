
import React from 'react';
import { Stethoscope, Medkit, Hospital, Ambulance, Wheelchair, Heart } from "lucide-react";
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
      icon: <Stethoscope size={24} />,
      title: "General Consultation",
      description: "Comprehensive health assessments and medical consultations for various health concerns."
    },
    {
      icon: <Hospital size={24} />,
      title: "Orthopaedic Surgery",
      description: "Specialized surgical procedures for bone, joint, and muscle conditions."
    },
    {
      icon: <Wheelchair size={24} />,
      title: "Physiotherapy",
      description: "Rehabilitation services to restore movement and function affected by injury or disability."
    },
    {
      icon: <Ambulance size={24} />,
      title: "Emergency Care",
      description: "Immediate medical attention for acute injuries and urgent orthopaedic conditions."
    },
    {
      icon: <Medkit size={24} />,
      title: "Sports Medicine",
      description: "Specialized care for athletes and sports-related injuries to enhance performance."
    },
    {
      icon: <Heart size={24} />,
      title: "Chronic Care",
      description: "Ongoing treatment and management of chronic orthopaedic conditions."
    },
  ];

  return (
    <section id="services" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Our Medical Services</h2>
          <p className="text-gray-600">
            We provide comprehensive orthopaedic and general medical services to ensure optimal health outcomes for our patients.
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
