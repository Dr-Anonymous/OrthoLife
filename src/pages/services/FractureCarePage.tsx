
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Phone, Clock, Activity } from 'lucide-react';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';

const FractureCarePage = () => {
    useEffect(() => {
        applySeo({
            title: 'Fracture & Trauma Care in Kakinada | Emergency Orthopaedics | OrthoLife',
            description: '24/7 fracture and trauma care in Kakinada for complex fractures, dislocations, sports injuries, and emergency orthopaedic treatment.',
            canonicalPath: '/services/fracture-care',
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'MedicalWebPage',
                    name: 'Fracture and Trauma Care in Kakinada',
                    url: 'https://ortho.life/services/fracture-care',
                    about: {
                        '@type': 'MedicalProcedure',
                        name: 'Fracture Treatment',
                        bodyLocation: ['Upper Limb', 'Lower Limb', 'Spine', 'Pelvis']
                    },
                    provider: {
                        '@type': 'MedicalClinic',
                        name: 'OrthoLife',
                        url: 'https://ortho.life'
                    }
                },
                buildBreadcrumbJsonLd([
                    { name: 'Home', path: '/' },
                    { name: 'Fracture Care', path: '/services/fracture-care' }
                ])
            ]
        });
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pt-20">
                <section className="bg-red-50 py-16 md:py-24">
                    <div className="container mx-auto px-4 md:px-6">
                        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-6">
                            24/7 Fracture & Trauma Care in Kakinada
                        </h1>
                        <p className="text-xl text-gray-700 max-w-3xl mb-8">
                            Immediate, expert care for complex fractures, dislocations, and sports injuries.
                            We prioritize saving limbs and restoring full function.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button size="lg" className="text-lg px-8 bg-red-600 hover:bg-red-700 text-white" onClick={() => window.location.href = 'tel:+919983849838'}>
                                <Phone className="mr-2 h-5 w-5" /> Emergency: 99 838 49 838
                            </Button>
                            <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => window.location.href = 'https://ortho.life/#contact'}>
                                <ShieldAlert className="mr-2 h-5 w-5" /> Visit Hospital
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="py-16">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <img
                                    src="/images/fracture-care.jpg"
                                    alt="Fracture Treatment Hospital Kakinada"
                                    className="rounded-2xl shadow-xl w-full object-cover h-[400px]"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://images.unsplash.com/photo-1579154204601-01588f351e67?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                                    }}
                                />
                            </div>
                            <div>
                                <h2 className="text-3xl font-heading font-bold mb-6">Expertise in Complex Trauma</h2>
                                <ul className="space-y-4">
                                    {[
                                        "Compound Fractures: Expert management of open wounds to prevent infection.",
                                        "Pelvic & Acetabular Surgery: Highly specialized care for hip and pelvic fractures.",
                                        "Pediatric Trauma: Gentle, specialized care for children's broken bones.",
                                        "Geriatric Fractures: Rapid surgery for hip fractures in the elderly to get them moving quickly.",
                                        "Neglected Trauma: Corrective surgeries for old, malunited, or non-united fractures."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <Activity className="text-red-600 mt-1 shrink-0" size={20} />
                                            <span className="text-lg text-gray-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-gray-50 py-16">
                    <div className="container mx-auto px-4 md:px-6">
                        <h2 className="text-3xl font-heading font-bold mb-8 text-center">When to Seek Help?</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500">
                                <h3 className="font-bold text-xl mb-3">Visible Deformity</h3>
                                <p className="text-gray-600">If the limb looks bent or twisted, seek immediate medical attention.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500">
                                <h3 className="font-bold text-xl mb-3">Inability to Move</h3>
                                <p className="text-gray-600">Difficulty moving the limb or inability to bear weight suggests a fracture.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500">
                                <h3 className="font-bold text-xl mb-3">Severe Pain & Swelling</h3>
                                <p className="text-gray-600">Immediate swelling and intense pain that doesn't subside with rest.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default FractureCarePage;
