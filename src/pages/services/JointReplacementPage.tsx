
import React, { useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { CheckCircle, Phone, Calendar } from 'lucide-react';
import { applySeo, buildBreadcrumbJsonLd } from '@/utils/seo';

const JointReplacementPage = () => {
    useEffect(() => {
        applySeo({
            title: 'Joint Replacement Surgery in Kakinada | Knee & Hip Replacement | OrthoLife',
            description: 'Advanced knee and hip joint replacement surgery in Kakinada with minimally invasive techniques, faster recovery protocols, and personalized rehabilitation.',
            canonicalPath: '/services/joint-replacement',
            jsonLd: [
                {
                    '@context': 'https://schema.org',
                    '@type': 'MedicalWebPage',
                    name: 'Joint Replacement Surgery in Kakinada',
                    url: 'https://ortho.life/services/joint-replacement',
                    about: {
                        '@type': 'MedicalProcedure',
                        name: 'Joint Replacement Surgery',
                        bodyLocation: ['Knee', 'Hip']
                    },
                    provider: {
                        '@type': 'MedicalClinic',
                        name: 'OrthoLife',
                        url: 'https://ortho.life'
                    }
                },
                buildBreadcrumbJsonLd([
                    { name: 'Home', path: '/' },
                    { name: 'Joint Replacement', path: '/services/joint-replacement' }
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
                            Best Joint Replacement Surgeon in Kakinada
                        </h1>
                        <p className="text-xl text-gray-700 max-w-3xl mb-8">
                            Restore your mobility with advanced Total Knee & Hip Replacement surgeries.
                            We use minimally invasive techniques for rapid recovery and lasting results.
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
                            <div>
                                <img
                                    src="/images/joint-replacement.jpg"
                                    alt="Knee Replacement Surgery in Kakinada"
                                    className="rounded-2xl shadow-xl w-full object-cover h-[400px]"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";
                                    }}
                                />
                            </div>
                            <div>
                                <h2 className="text-3xl font-heading font-bold mb-6">Why Choose OrthoLife for Joint Replacement?</h2>
                                <ul className="space-y-4">
                                    {[
                                        "Expert Diagnosis: Accurate assessment to determine if you truly need surgery.",
                                        "Minimally Invasive: Smaller incisions, less pain, and faster return to normal life.",
                                        "Rapid Recovery Protocols: Walk within hours of surgery.",
                                        "Affordable Care: World-class treatment at a fraction of metro city costs.",
                                        "Personalized Rehab: Dedicated physiotherapy to ensure 100% mobility."
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle className="text-primary mt-1 shrink-0" size={20} />
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
                        <h2 className="text-3xl font-heading font-bold mb-8 text-center">Frequently Asked Questions</h2>
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg mb-2">How long is the recovery for Knee Replacement?</h3>
                                <p className="text-gray-600">Most patients walk with support the next day. Complete recovery typically takes 4-6 weeks with proper physiotherapy.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg mb-2">What is the cost of Joint Replacement in Kakinada?</h3>
                                <p className="text-gray-600">The cost varies based on the implant type and room choice. We offer transparent package pricing significantly lower than corporate hospitals.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg mb-2">Is robotic knee replacement available?</h3>
                                <p className="text-gray-600">Yes, we offer advanced surgical options including computer-assisted and robotic techniques for precise alignment.</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm">
                                <h3 className="font-bold text-lg mb-2">How long do the implants last?</h3>
                                <p className="text-gray-600">Modern joint implants are designed to last 20-25 years, allowing you to live an active life without worry.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
};

export default JointReplacementPage;
