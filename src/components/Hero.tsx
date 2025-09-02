
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section id="home" className="pt-24 md:pt-32 pb-16 md:pb-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 z-[-1]"></div>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="w-full md:w-1/2 mb-10 md:mb-0">
            <div className="max-w-xl space-y-6 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-gray-900 leading-tight">
                Specialized Care For Your <span className="text-primary">Orthopaedic</span> Needs
              </h1>
              <p className="text-lg text-gray-700">
                OrthoLife offers expert orthopaedic care for all conditions from fractures and sports injuries to spine, joint, and orthobiologic treatments. Get <i>Back to health</i>, doing what you love—stronger, faster, pain-free.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" onClick={(e) => {e.preventDefault();window.location.href='/appointment';}}>
                  Book an Appointment
                </Button>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={(e) => {e.preventDefault();window.location.href='#services';}}>
                  Our Services
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6">
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-primary">5+</span>
                  <span className="text-gray-600">Years Experience</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-primary">5k+</span>
                  <span className="text-gray-600">Happy Patients</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-3xl font-bold text-primary">99%</span>
                  <span className="text-gray-600">Patient Satisfaction</span>
                </div>
              </div>
            </div>
          </div>
          <div className="w-full md:w-1/2 animate-fade-in" style={{animationDelay: '0.3s'}}>
            <div className="relative">
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-secondary/20 rounded-full"></div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 rounded-full"></div>
              <div className="relative rounded-lg overflow-hidden shadow-xl">
                <img 
                  src="https://vqskeanwpnvuyxorymib.supabase.co/storage/v1/object/public/post_images/landing%20pics/cover.jpeg" 
                  alt="Medical professional with patient" 
                  className="w-full h-auto object-cover aspect-[4/3]"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
