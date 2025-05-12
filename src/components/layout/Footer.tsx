
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Linkedin, Twitter, Facebook, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground pt-16 pb-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link to="/" className="text-2xl font-semibold flex items-center">
              <div className="mr-2 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                I
              </div>
              <span>Ideovent</span>
            </Link>
            <p className="text-secondary-foreground/80 max-w-xs">
              Creating innovative digital solutions for businesses around the globe.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.linkedin.com/in/ideovent-technologies-a16648356?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://www.instagram.com/ideovent_official?igsh=cTkzaGFibWRod3Ju&utm_source=qr" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                <Instagram size={20} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-secondary-foreground/80 hover:text-primary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Services</h3>
            <ul className="space-y-2">
              <li className="text-secondary-foreground/80 hover:text-primary transition-colors">
                Website Development
              </li>
              <li className="text-secondary-foreground/80 hover:text-primary transition-colors">
                UI/UX Design
              </li>
              <li className="text-secondary-foreground/80 hover:text-primary transition-colors">
                SEO & Digital Marketing
              </li>
              <li className="text-secondary-foreground/80 hover:text-primary transition-colors">
                E-Commerce Development
              </li>
              <li className="text-secondary-foreground/80 hover:text-primary transition-colors">
                Mobile App Development
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Contact Info</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin size={20} className="mr-3 mt-1 text-primary" />
                <span className="text-secondary-foreground/80">
                 Salempur, Deoria, Uttar Pradesh, 274509
                </span>
              </li>
              <li className="flex items-center">
                <Phone size={20} className="mr-3 text-primary" />
                <span className="text-secondary-foreground/80">+91 9410707967</span>
              </li>
              <li className="flex items-center">
                <Mail size={20} className="mr-3 text-primary" />
                <span className="text-secondary-foreground/80">contact@ideovent.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/10 mt-12 pt-8 text-center text-secondary-foreground/70">
          <p>© {new Date().getFullYear()} Ideovent Technologies. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
