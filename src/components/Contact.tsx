
import { Phone, MapPin, Mail, Clock } from "lucide-react";

const Contact = () => {
  return (
    <section id="contact" className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">Get in Touch</h2>
          <p className="text-gray-600">
            Have questions or want to schedule an appointment? Feel free to reach out to us any time.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Phone Number</h3>
              <p href= "tel:+919866812555" className="text-gray-700">9866812555</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Location</h3>
              <p className="text-gray-700">70-17-18/2b, Road 3, R R Nagar, Kakinada- 03</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Mail size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Email</h3>
              <p className="text-gray-700">info@ortho.life</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Working Hours</h3>
              <p className="text-gray-700">Monday - Saturday: 9:00 AM - 9:00 PM</p>
              <p className="text-gray-700">Sunday: 4:00 PM - 6:00 PM</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
