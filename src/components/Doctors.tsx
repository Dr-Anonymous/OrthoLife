import React from 'react';
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Phone, Mail, MapPin, Globe } from 'lucide-react';

interface Doctor {
    name: string;
    title: string;
    qualifications: string;
    bio: string;
    image?: string;
    specialties?: { title: string; description: string }[];
    socials: {
        facebook?: string;
        whatsapp?: string;
        instagram?: string;
        email?: string;
        google?: string;
    };
    contact: {
        phone: string;
        phoneDisplay: string;
        appointmentUrl: string;
    };
}

const doctors: Doctor[] = [
    {
        name: "Dr. Samuel Manoj Cherukuri",
        title: "Orthopedic Surgeon",
        qualifications: "M.S Ortho (KMC Manipal)",
        bio: "I'm an Orthopaedic surgeon (M.S) trained at the prestigious Kasturba Hospital (KMC), Manipal. I practice orthopaedics in and around the capital city of Kakinada district of Andhra Pradesh, India.",
        image: "/images/doctors/manoj.jpg",
        specialties: [
            { title: "Trauma Care", description: "Fractures of limbs, spine and pelvis" },
            { title: "Arthroscopy", description: "Key hole surgeries of knee & shoulder" },
            { title: "Arthroplasty", description: "Joint replacement & preservation" },
            { title: "Spine Surgery", description: "Sciatica, disc problems & fractures" }
        ],
        socials: {
            facebook: "https://www.facebook.com/drsamuelcherukuri",
            whatsapp: "https://wa.me/919866812555",
            instagram: "https://www.instagram.com/cherukurisamuelmanoj/"
        },
        contact: {
            phone: "+919866812555",
            phoneDisplay: "+91 98668 12555",
            appointmentUrl: "https://ortho.life/appointment"
        }
    },
    {
        name: "Dr. Shalima Pinnamaneni",
        title: "General Physician",
        qualifications: "MBBS, MD (Internal Medicine)",
        bio: "I'm a general physician practicing in Kakinada, India. I've been trained at Dr.PSIMS & RF, Andhra. Following that I've worked at AIG, Hyderabad in their IBD team. Currently I'm heading the Internal Medicine department at The Team Hospital, Kakinada.",
        image: "/images/doctors/shalima.jpg",
        specialties: [
            { title: "General Internal Medicine", description: "Comprehensive care for acute & chronic illnesses (Diabetes, Hypertension)" },
            { title: "Gastroenterology", description: "Management of digestive disorders & IBD" },
            { title: "Diabetology & Endocrinology", description: "Management of diabetes & thyroid disorders" },
            { title: "Infectious Diseases", description: "Diagnosis & treatment of complex infections" }
        ],
        socials: {
            whatsapp: "https://wa.me/919177434455?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today",
            email: "mailto:shalima.pinnamaneni@gmail.com",
            google: "https://g.page/drshalima"
        },
        contact: {
            phone: "+919177434455",
            phoneDisplay: "91774 34455",
            appointmentUrl: "https://wa.me/919177434455?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today"
        }
    }
];

const Doctors = () => {
    return (
        <section id="doctors" className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Meet Our Specialists</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Expert care from highly trained professionals dedicated to your recovery and well-being.
                    </p>
                </div>

                <div className="space-y-12">
                    {doctors.map((doctor, index) => (
                        <div key={index} className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                {/* Image Section */}
                                <div className="w-full md:w-2/5 relative bg-primary/5">
                                    {doctor.image ? (
                                        <img
                                            src={doctor.image}
                                            alt={doctor.name}
                                            className="w-full h-full object-cover min-h-[300px]"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-200">
                                            <span className="text-gray-400 text-lg px-4 text-center">{doctor.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content Section */}
                                <div className="w-full md:w-3/5 p-8 md:p-10">
                                    <div className="flex flex-col h-full justify-between">
                                        <div>
                                            <div className="mb-6">
                                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{doctor.name}</h3>
                                                <p className="text-primary font-medium text-lg">{doctor.title}</p>
                                                <p className="text-sm text-gray-500 mt-1">{doctor.qualifications}</p>
                                            </div>

                                            <p className="text-gray-700 mb-6 leading-relaxed">
                                                {doctor.bio}
                                            </p>

                                            {doctor.specialties && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                                    {doctor.specialties.map((specialty, idx) => (
                                                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                            <h4 className="font-semibold text-gray-900 mb-1">{specialty.title}</h4>
                                                            <p className="text-xs text-gray-600">{specialty.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex flex-wrap gap-4 mb-6">
                                                {doctor.socials.facebook && (
                                                    <a href={doctor.socials.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#1877F2] transition-colors">
                                                        <Facebook className="w-6 h-6" />
                                                    </a>
                                                )}
                                                {doctor.socials.whatsapp && (
                                                    <a href={doctor.socials.whatsapp} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#25D366] transition-colors">
                                                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                        </svg>
                                                    </a>
                                                )}
                                                {doctor.socials.instagram && (
                                                    <a href={doctor.socials.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#E4405F] transition-colors">
                                                        <Instagram className="w-6 h-6" />
                                                    </a>
                                                )}
                                                {doctor.socials.email && (
                                                    <a href={doctor.socials.email} className="text-gray-500 hover:text-primary transition-colors">
                                                        <Mail className="w-6 h-6" />
                                                    </a>
                                                )}
                                                {doctor.socials.google && (
                                                    <a href={doctor.socials.google} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-500 transition-colors">
                                                        <Globe className="w-6 h-6" />
                                                    </a>
                                                )}
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <Button
                                                    onClick={() => window.location.href = doctor.contact.appointmentUrl}
                                                    className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                                                >
                                                    Book Appointment
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => window.location.href = `tel:${doctor.contact.phone}`}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    {doctor.contact.phoneDisplay}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Doctors;
