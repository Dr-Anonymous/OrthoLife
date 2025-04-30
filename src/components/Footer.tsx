
import React from 'react';
import { Phone, MapPin, Mail, CheckCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-2xl font-heading font-bold mb-4">OrthoLife</h3>
            <p className="text-gray-300 mb-4">
              Providing specialized orthopaedic and general medical services with compassionate care for all patients.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/drsamuelcherukuri" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd"></path>
                </svg>
              </a>
              <a href="https://wa.me/919866812555" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <span className="sr-only">WhatsApp</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19.44 4.552A10.413 10.413 0 0 0 12.044 1.5C6.281 1.5 1.59 6.168 1.588 11.906a10.341 10.341 0 0 0 1.396 5.203L1.5 22.5l5.543 -1.447a10.481 10.481 0 0 0 4.997 1.266h0.004c5.762 0 10.453 -4.668 10.456 -10.406A10.321 10.321 0 0 0 19.44 4.552M12.044 20.562h-0.004a8.707 8.707 0 0 1 -4.423 -1.206l-0.317 -0.188 -3.289 0.859 0.878 -3.192 -0.207 -0.328A8.6 8.6 0 0 1 3.353 11.906c0 -4.769 3.9 -8.648 8.694 -8.648a8.672 8.672 0 0 1 8.687 8.655c-0.002 4.769 -3.9 8.649 -8.691 8.649m4.767 -6.478c-0.261 -0.13 -1.547 -0.759 -1.785 -0.846s-0.414 -0.13 -0.588 0.13 -0.675 0.844 -0.827 1.02 -0.305 0.195 -0.566 0.065 -1.103 -0.405 -2.101 -1.29c-0.777 -0.69 -1.301 -1.541 -1.453 -1.801s-0.016 -0.401 0.114 -0.531c0.118 -0.117 0.261 -0.304 0.392 -0.456s0.174 -0.261 0.261 -0.434 0.044 -0.325 -0.022 -0.455 -0.588 -1.41 -0.805 -1.931c-0.212 -0.507 -0.427 -0.438 -0.588 -0.446 -0.152 -0.007 -0.328 -0.009 -0.501 -0.009a0.962 0.962 0 0 0 -0.697 0.325c-0.24 0.261 -0.915 0.891 -0.915 2.169s0.938 2.516 1.067 2.69 1.842 2.8 4.463 3.926a15.141 15.141 0 0 0 1.49 0.547c0.626 0.198 1.195 0.17 1.645 0.103 0.502 -0.075 1.547 -0.629 1.764 -1.237s0.217 -1.128 0.152 -1.236 -0.24 -0.174 -0.501 -0.304" clip-rule="evenodd"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/cherukurisamuelmanoj/" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-primary transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd"></path>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="#home" className="hover:text-primary transition-colors">Home</a>
              </li>
              <li>
                <a href="#about" className="hover:text-primary transition-colors">About Us</a>
              </li>
              <li>
                <a href="#services" className="hover:text-primary transition-colors">Services</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Our Services</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-secondary" />
                <span>Orthopaedic Surgery</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-secondary" />
                <span>Sports Medicine</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-secondary" />
                <span>General Consultation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={16} className="text-secondary" />
                <span>Spine Surgery</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">Contact Info</h3>
            <ul className="space-y-4">
              <li onClick={(e) => {e.preventDefault();window.location.href='tel:+919866812555';}} className="flex items-center gap-3">
                <Phone size={18} className="text-secondary" />
                <span>9866812555</span>
              </li>
              <li onClick={(e) => {e.preventDefault();window.location.href='https://g.page/orthosam/';}} className="flex items-start gap-3">
                <MapPin size={18} className="text-secondary mt-1" />
                <span>70-17-18/2b, Road 3, R R Nagar, Kakinada- 03</span>
              </li>
              <li onClick={(e) => {e.preventDefault();window.location.href='mailto:info@ortho.life';}} className="flex items-center gap-3">
                <Mail size={18} className="text-secondary" />
                <span>info@ortho.life</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8">
          <p className="text-center text-gray-400">
            &copy; {new Date().getFullYear()} OrthoLife Clinic. All rights reserved. | <a href="https://ortho.life" className="hover:text-primary">ortho.life</a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
