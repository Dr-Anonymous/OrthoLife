
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Phone, Calendar } from 'lucide-react';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';

const ArthroscopyPage = () => {
    useEffect(() => {
        applySeo({
            title: 'Arthroscopy Surgery in Kakinada | ACL, Meniscus & Shoulder | OrthoLife',
            description: 'Minimally invasive arthroscopy in Kakinada for ACL tears, meniscus injuries, and rotator cuff problems with faster recovery and sports rehab guidance.',
            canonicalPath: '/services/arthroscopy',
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'MedicalWebPage',
                    name: 'Arthroscopy & Sports Medicine in Kakinada',
                    url: 'https://ortho.life/services/arthroscopy',
                    about: {
                        '@type': 'MedicalProcedure',
                        name: 'Arthroscopy',
                        bodyLocation: ['Knee', 'Shoulder']
                    },
                    provider: {
                        '@type': 'MedicalClinic',
                        name: 'OrthoLife',
                        url: 'https://ortho.life'
                    }
                },
                buildBreadcrumbJsonLd([
                    { name: 'Home', path: '/' },
                    { name: 'Arthroscopy', path: '/services/arthroscopy' }
                ])
            ]
        });
    }, []);

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow pt-20">
                <section className="bg-primary/5 py-16 md:py-24">
                    <div className="container mx-auto px-4 md:px-6">
                        <h1 className="text-4xl md:text-5xl font-heading font-bold text-gray-900 mb-6">
                            Advanced Arthroscopy & Sports Medicine in Kakinada
                        </h1>
                        <p className="text-xl text-gray-700 max-w-3xl mb-8">
                            Get back in the game with minimally invasive keyhole surgery for Knee (ACL, Meniscus) and Shoulder (Rotator Cuff) injuries.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button size="lg" className="text-lg px-8" onClick={() => window.location.href = 'https://ortho.life/appointment'}>
                                <Calendar className="mr-2 h-5 w-5" /> Book Consultation
                            </Button>
                            <Button variant="outline" size="lg" className="text-lg px-8" onClick={() => window.location.href = 'tel:+919983849838'}>
                                <Phone className="mr-2 h-5 w-5" /> Call 99 838 49 838
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="py-16">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1">
                                <h2 className="text-3xl font-heading font-bold mb-6">Why Choose Arthroscopic Surgery?</h2>
                                <ul className="space-y-4">
                                    {[
                                        "Minimally Invasive: Tiny incisions mean less scarring and lower infection risk.",
                                        "Faster Recovery: Most patients return to desk jobs in a few days and sports in a few months.",
                                        "Less Pain: Significantly reduced post-operative pain compared to open surgery.",
                                        "Day Care Procedure: Many surgeries allow you to go home the same day.",
                                        "Surgical Precision: High-definition cameras allow for exact repair of damaged tissues."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle className="text-primary mt-1 shrink-0" size={20} />
                                            <span className="text-lg text-gray-700">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="order-1 md:order-2">
                                <img
                                    src="/images/arthroscopy.jpg"
                                    alt="Arthroscopy Surgery in Kakinada"
                                    className="rounded-2xl shadow-xl w-full object-cover h-[400px]"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-gray-50 py-16">
                    <div className="container mx-auto px-4 md:px-6">
                        <h2 className="text-3xl font-heading font-bold mb-8 text-center">Common Sports Injuries We Treat</h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                                <h3 className="font-bold text-xl mb-3 text-primary">ACL Tear</h3>
                                <p className="text-gray-600">Reconstruction of the Anterior Cruciate Ligament using advanced graft techniques for stability.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                                <h3 className="font-bold text-xl mb-3 text-primary">Meniscus Repair</h3>
                                <p className="text-gray-600">Preserving the knee's shock absorber through specialized repair or trimming techniques.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                                <h3 className="font-bold text-xl mb-3 text-primary">Rotator Cuff</h3>
                                <p className="text-gray-600">Fixing shoulder tendon tears to restore overhead movement and eliminate night pain.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default ArthroscopyPage;
