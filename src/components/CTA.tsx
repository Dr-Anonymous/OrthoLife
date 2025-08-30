
import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/10 z-[-1]"></div>
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-heading font-bold">Get <i>Back to Health</i> with <i>Orthopaedic Excellence</i></h2>
          <p className="text-lg text-gray-700">
            Take the first step towards better health by booking an appointment with our specialists. We're here to help you live pain-free and get back to doing what you love.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white" onClick={(e) => {e.preventDefault();window.location.href='/appointment';}}>
              Book an Appointment
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={(e) => {e.preventDefault();window.location.href='https://wa.me/919866812555?text=Hi.%20I%27d%20like%20to%20book%20an%20appointment%20today';}}>
              WhatsApp
            </Button>
            <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={(e) => {e.preventDefault();window.location.href='#contact';}}>
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
