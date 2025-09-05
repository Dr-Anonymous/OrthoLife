import React, { useState } from 'react';
import Header from '@/components/Header';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

import { FileText, Shield, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const LegalPoliciesPage = () => {
  const [activeTab, setActiveTab] = useState('terms');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section id="legal" className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
         <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Legal Information
            </h1>
            <p className="text-lg text-gray-600">
              Terms of Service, Privacy Policy, and Cancellation Information
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex w-full mb-8 overflow-x-auto pb-2 no-scrollbar gap-2">
              <TabsTrigger 
                value="terms" 
                className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <FileText size={14} className="hidden xs:block" />
                <span className="truncate">Terms{window.innerWidth >= 640 ? ' of Service' : ''}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="privacy" 
                className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <Shield size={14} className="hidden xs:block" />
                <span className="truncate">Privacy{window.innerWidth >= 640 ? ' Policy' : ''}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="refund" 
                className="flex-shrink-0 flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm"
              >
                <RefreshCw size={14} className="hidden xs:block" />
                <span className="truncate">Refund{window.innerWidth >= 640 ? ' & Cancellation' : ''}</span>
              </TabsTrigger>
            </TabsList>

            {/* Terms of Service */}
            <TabsContent value="terms">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={24} />
                    Terms of Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      Thank you for accessing our medical services at <strong>ortho.life</strong>. This site is owned by <strong>Dr. Samuel Manoj Cherukuri</strong>. By accessing and using our services, you indicate your unconditional acceptance of these terms and conditions.
                    </p>

                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-blue-800 font-semibold">Important Notice</p>
                      <p className="text-blue-700 text-sm mt-1">
                        We reserve the right to update these terms at any time. Continued use constitutes acceptance of changes.
                      </p>
                    </div>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Eligibility and Medical Services</h3>
                      <p className="text-gray-700 mb-2">
                        Our medical services are available to individuals who can legally enter into contracts under applicable laws. By using our services, you confirm that:
                      </p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>You are at least 18 years old or have parental/guardian consent</li>
                        <li>You have the legal capacity to enter into this agreement</li>
                        <li>You will provide accurate and complete medical information</li>
                        <li>You understand these are professional medical services</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">2. Medical Professional Relationship</h3>
                      <p className="text-gray-700">
                        Dr. Samuel Manoj Cherukuri is a licensed medical professional. When you book an appointment, you are entering into a doctor-patient relationship governed by medical ethics and applicable healthcare laws. All consultations and treatments are provided in accordance with established medical standards.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">3. Appointment Booking and Communication</h3>
                      <p className="text-gray-700 mb-2">
                        When you use our appointment booking system or communicate with us electronically:
                      </p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>You consent to receive communications electronically</li>
                        <li>You agree to provide accurate contact and medical information</li>
                        <li>You understand that appointment confirmation constitutes a binding commitment</li>
                        <li>Emergency medical situations should not be communicated through our website</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">4. Medical Information Accuracy</h3>
                      <p className="text-gray-700">
                        While we strive to provide accurate medical information on our website, this content is for informational purposes only and should not replace professional medical advice. Always consult with Dr. Samuel Manoj Cherukuri in-person for specific medical concerns.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">5. Limitation of Liability</h3>
                      <p className="text-gray-700">
                        Our liability is limited to the scope of professional medical practice. This agreement does not limit your rights under applicable healthcare and consumer protection laws.
                      </p>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Policy */}
            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="text-green-600" size={24} />
                    Privacy Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="space-y-6">
                    <p className="text-gray-700 leading-relaxed">
                      We respect and are committed to protecting your privacy and medical confidentiality. This privacy policy applies to all services provided through <strong>ortho.life</strong> and our medical practice.
                    </p>

                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                      <p className="text-green-800 font-semibold">HIPAA Compliance</p>
                      <p className="text-green-700 text-sm mt-1">
                        We don't comply with HIPAA regulations but maintain the highest standards of medical privacy protection.
                      </p>
                    </div>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Medical Information We Collect</h3>
                      <p className="text-gray-700 mb-2">We collect information necessary to provide quality medical care:</p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Personal identification information (name, contact details, insurance information)</li>
                        <li>Medical history and current health conditions</li>
                        <li>Appointment preferences and scheduling information</li>
                        <li>Treatment records and clinical observations</li>
                        <li>Payment and billing information</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">How We Use Your Information</h3>
                      <p className="text-gray-700 mb-2">Your medical information is used exclusively for:</p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Providing medical diagnosis, treatment, and care</li>
                        <li>Scheduling and managing appointments</li>
                        <li>Processing insurance claims and billing</li>
                        <li>Communicating about your healthcare</li>
                        <li>Maintaining accurate medical records</li>
                        <li>Complying with legal and regulatory requirements</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Information Security</h3>
                      <p className="text-gray-700">
                        We implement appropriate physical, electronic, and administrative safeguards to protect your medical information. Our systems are designed to meet or exceed healthcare industry security standards, including encryption of sensitive data and secure access controls.
                      </p>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Information Sharing</h3>
                      <p className="text-gray-700 mb-2">We do not sell or rent your personal medical information. We may share information only when:</p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Required for your medical treatment or care coordination</li>
                        <li>Necessary for insurance processing and healthcare operations</li>
                        <li>Required by law or legal process</li>
                        <li>You have provided explicit written consent</li>
                        <li>Necessary to prevent serious harm to health or safety</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Your Rights</h3>
                      <p className="text-gray-700 mb-2">You have the right to:</p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Access and review your medical records</li>
                        <li>Request corrections to your medical information</li>
                        <li>Request restrictions on use of your information</li>
                        <li>Receive a detailed privacy practices notice</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Website Cookies and Analytics</h3>
                      <p className="text-gray-700">
                        Our website uses essential cookies for functionality and analytics cookies to improve user experience. We do not use advertising cookies. You can adjust your browser settings to control cookie preferences, though this may affect website functionality.
                      </p>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Refund & Cancellation */}
            <TabsContent value="refund">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="text-orange-600" size={24} />
                    Refund & Cancellation Policy
                  </CardTitle>
                </CardHeader>
                <CardContent className="prose max-w-none">
                  <div className="space-y-6">
                    <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                      <p className="text-orange-800 font-semibold">Important Policy Information</p>
                      <p className="text-orange-700 text-sm mt-1">
                        Please read our cancellation and refund policies carefully before booking appointments.
                      </p>
                    </div>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Appointment Cancellation Policy</h3>
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <p className="text-blue-800 font-semibold">2-Hour Cancellation Rule</p>
                        <p className="text-blue-700 text-sm mt-1">
                          Appointments can be cancelled or rescheduled up to 2 hours before the scheduled time.
                        </p>
                      </div>
                      
                      <ul className="list-disc pl-6 text-gray-700 space-y-2">
                        <li><strong>More than 2 hours notice:</strong> Full refund or free rescheduling available</li>
                        <li><strong>Less than 2 hours notice:</strong> Cancellation fee may apply (50% of consultation fee)</li>
                        <li><strong>No-show appointments:</strong> Full consultation fee will be charged</li>
                        <li><strong>Same-day emergencies:</strong> Medical emergencies are exempt from cancellation fees</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Refund Policy</h3>
                      
                      <div className="space-y-4">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Consultation Fees</h4>
                          <ul className="list-disc pl-6 text-gray-700 space-y-1">
                            <li>Refundable if cancelled 2+ hours in advance</li>
                            <li>50% refundable if cancelled with less than 2 hours notice</li>
                            <li>Non-refundable for no-show appointments</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Treatment Packages</h4>
                          <ul className="list-disc pl-6 text-gray-700 space-y-1">
                            <li>Refundable before treatment begins (minus administrative fee)</li>
                            <li>Partial refunds available for unused portions of treatment plans</li>
                            <li>No refunds once treatment has commenced, except for medical reasons</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Medical Procedures</h4>
                          <p className="text-gray-700">
                            Due to the nature of medical services, procedures and treatments are generally non-refundable once performed. However, we will work with patients on a case-by-case basis for genuine medical concerns or complications.
                          </p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Cancel or Request Refunds</h3>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-gray-700 mb-3">To cancel appointments or request refunds:</p>
                        <ul className="list-disc pl-6 text-gray-700 space-y-1">
                          <li>Call our office during business hours</li>
                          <li>Email us with your appointment details</li>
                          <li>Provide at least 24 hours notice when possible</li>
                        </ul>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Refund Processing</h3>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Refunds are processed within 2 business days</li>
                        <li>Refunds are issued to the original payment method</li>
                        <li>Administrative fees may apply for processing</li>
                        <li>Bank processing times may vary</li>
                      </ul>
                    </section>

                    <section>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Special Circumstances</h3>
                      <p className="text-gray-700 mb-2">We understand that medical situations can be unpredictable. We may waive fees for:</p>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        <li>Documented medical emergencies</li>
                        <li>Hospitalization or serious illness</li>
                        <li>Natural disasters or unforeseen circumstances</li>
                        <li>Doctor-initiated cancellations or rescheduling</li>
                      </ul>
                    </section>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
           
        </div>
        <Contact />
       </section>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPoliciesPage;
