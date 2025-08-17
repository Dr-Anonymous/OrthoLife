
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <section id="about" className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/2">
            <div className="relative">
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/10 rounded-full"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-secondary/20 rounded-full"></div>
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <img 
                  src="https://images.unsplash.com/photo-1579154491781-5e199df316aa?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1964&q=80" 
                  alt="Medical team at OrthoLife clinic" 
                  className="w-full h-auto object-cover aspect-[4/3]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 space-y-6">
            <h2 className="text-3xl md:text-4xl font-heading font-bold">About OrthoLife</h2>
            <p className="text-gray-700">
              At OrthoLife, we are dedicated to helping you move better, feel stronger, and live pain-free. Our experienced team of orthopaedic specialists offers a full spectrum of services, from diagnosis and non-surgical treatments to advanced interventions like arthroscopy, spine surgery, joint replacement, and cutting-edge orthobiologic treatments.
            </p>
            <p className="text-gray-700">
              Whether you're an athlete recovering from an injury, someone seeking relief from chronic back or joint pain, or exploring non-surgical regenerative options, our team is here to guide you with compassion, precision, and innovation. At OrthoLife, we are committed to guiding you every step of the way — <i>Back to Health</i>.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700">Expert Specialists</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700">Modern Techniques</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700">Personalized Care</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="rounded-full bg-primary/10 p-1">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-gray-700">Evidence-Based Treatment</span>
              </div>
            </div>
            
            <Button onClick={(e) => {e.preventDefault();window.location.href='https://orthosam.com';}} className="bg-primary hover:bg-primary/90 mt-4">Our Team</Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
