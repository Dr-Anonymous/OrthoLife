
import React from 'react';
import { Stethoscope, Syringe, Bone, PersonStanding, Microscope, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ServiceCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link?: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ icon, title, description, link }) => {
  const CardContentWrapper = (
    <Card className={`border-none shadow-md hover:shadow-xl transition-shadow group ${link ? 'cursor-pointer' : ''}`}>
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

  if (link) {
    return (
      <a href={link} className="block h-full">
        {CardContentWrapper}
      </a>
    );
  }

  return CardContentWrapper;
};

const Services = () => {
  const services = [
    {
      icon: <Bone size={24} />,
      title: "Fracture & Trauma Care",
      description: "Expert management of complex trauma, limbs, spine, and pelvic fractures by the best orthopedic surgeon in Kakinada.",
      link: "/services/fracture-care"
    },
    {
      icon: <Microscope size={24} />,
      title: "Arthroscopy & Sports Medicine",
      description: "Advanced keyhole surgeries for knee and shoulder injuries (ACL, meniscus, rotator cuff) to get athletes back in the game.",
      link: "/services/arthroscopy"
    },
    {
      icon: <PersonStanding size={24} />,
      title: "Spine Surgery",
      description: "Specialized care for sciatica, disc prolapse, and spinal fractures with a focus on minimally invasive techniques."
    },
    {
      icon: <Syringe size={24} />,
      title: "Joint Replacement",
      description: "Total Knee & Hip Replacement using modern techniques for rapid recovery. Expert in complex revision arthroplasty.",
      link: "/services/joint-replacement"
    },
    {
      icon: <Stethoscope size={24} />,
      title: "General Orthopedics",
      description: "Comprehensive consultation for bone and joint pain, arthritis management, and osteoporosis care."
    },
    {
      icon: <Heart size={24} />,
      title: "Chronic Pain Management",
      description: "Non-surgical solutions for chronic back and joint pain, utilizing advanced imaging for precise, lasting relief."
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
              link={service.link}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
