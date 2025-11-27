import React from 'react';
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Phone, Mail, MapPin } from 'lucide-react';

const Doctors = () => {
    return (
        <section id="doctors" className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Meet Our Specialist</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Expert care from highly trained professionals dedicated to your recovery and well-being.
                    </p>
                </div>

                <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                        {/* Image Section */}
                        <div className="w-full md:w-2/5 relative bg-primary/5">
                            {/* Placeholder for Doctor's Image - using a generic medical placeholder if specific one isn't available */}
                            <div className="h-full min-h-[300px] flex items-center justify-center bg-gray-200">
                                <span className="text-gray-400 text-lg">Dr. Samuel Manoj Cherukuri</span>
                                {/* Ideally, we would use: <img src="/path/to/doctor.jpg" alt="Dr Samuel Manoj Cherukuri" className="w-full h-full object-cover" /> */}
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="w-full md:w-3/5 p-8 md:p-10">
                            <div className="flex flex-col h-full justify-between">
                                <div>
                                    <div className="mb-6">
                                        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Dr. Samuel Manoj Cherukuri</h3>
                                        <p className="text-primary font-medium text-lg">Orthopedic Surgeon</p>
                                        <p className="text-sm text-gray-500 mt-1">M.S (Ortho), KMC Manipal</p>
                                    </div>

                                    <p className="text-gray-700 mb-6 leading-relaxed">
                                        I'm an Orthopaedic surgeon (M.S) trained at the prestigious Kasturba Hospital (KMC), Manipal.
                                        I practice orthopaedics in and around the capital city of Kakinada district of Andhra Pradesh, India.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <h4 className="font-semibold text-gray-900 mb-1">Trauma Care</h4>
                                            <p className="text-xs text-gray-600">Fractures of limbs, spine and pelvis</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <h4 className="font-semibold text-gray-900 mb-1">Arthroscopy</h4>
                                            <p className="text-xs text-gray-600">Key hole surgeries of knee & shoulder</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <h4 className="font-semibold text-gray-900 mb-1">Arthroplasty</h4>
                                            <p className="text-xs text-gray-600">Joint replacement & preservation</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <h4 className="font-semibold text-gray-900 mb-1">Spine Surgery</h4>
                                            <p className="text-xs text-gray-600">Sciatica, disc problems & fractures</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex flex-wrap gap-4 mb-6">
                                        <a href="https://www.facebook.com/drsamuelcherukuri" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#1877F2] transition-colors">
                                            <Facebook className="w-6 h-6" />
                                        </a>
                                        <a href="https://wa.me/919866812555" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#25D366] transition-colors">
                                            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                            </svg>
                                        </a>
                                        <a href="https://www.instagram.com/cherukurisamuelmanoj/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#E4405F] transition-colors">
                                            <Instagram className="w-6 h-6" />
                                        </a>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            onClick={() => window.location.href = 'https://ortho.life/appointment'}
                                            className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                                        >
                                            Book Appointment
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => window.location.href = 'tel:+919866812555'}
                                            className="w-full sm:w-auto"
                                        >
                                            <Phone className="w-4 h-4 mr-2" />
                                            +91 98668 12555
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Doctors;
