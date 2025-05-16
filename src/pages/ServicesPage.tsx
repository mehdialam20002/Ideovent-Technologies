
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ParallaxSection from '../components/ui/ParallaxSection';
import {Button} from '../components/ui/button';
import { Code, PenTool, Globe, ShoppingCart, Monitor, ArrowUpRight, Smartphone, Database, Server } from 'lucide-react';

const ServicesPage = () => {
  const [activeSection, setActiveSection] = useState('web');
  const servicesRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Our Services - Ideovent Technologies";
  }, []);

  const services = {
    web: [
      {
        icon: <Code className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "Website Development",
        description: "Custom websites built with React.js, WordPress, or other technologies tailored to your needs. We focus on creating fast, responsive, and user-friendly websites that drive results.",
        features: ["Responsive Web Design", "E-commerce Solutions", "Progressive Web Apps", "CMS Integration", "Performance Optimization"]
      },
      {
        icon: <Server className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "Web Application Development",
        description: "Powerful web applications that solve complex business problems and streamline operations. We use modern frameworks and technologies to build scalable solutions.",
        features: ["Custom Dashboard Development", "Real-time Applications", "Enterprise Solutions", "Database Design & Integration", "API Development"]
      },
      {
        icon: <Database className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "CMS Development",
        description: "Custom content management systems that make it easy to update and manage your website. We build solutions that are tailored to your specific needs.",
        features: ["WordPress Development", "Headless CMS Solutions", "Custom CMS Development", "CMS Migration", "Content Strategy"]
      }
    ],
    design: [
      {
        icon: <PenTool className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "UI/UX Design",
        description: "User-centered design that enhances user experience and engagement with your brand. We create intuitive interfaces that keep users coming back.",
        features: ["User Research", "Wireframing & Prototyping", "Interface Design", "Usability Testing", "Design Systems"]
      },
      {
        icon: <Monitor className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "Brand Identity",
        description: "Comprehensive brand identity design that helps you stand out in the market. We create cohesive brand experiences across all customer touchpoints.",
        features: ["Logo Design", "Visual Identity", "Brand Guidelines", "Marketing Collateral", "Brand Strategy"]
      }
    ],
    marketing: [
      {
        icon: <Globe className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "SEO & Digital Marketing",
        description: "Optimize your online presence and reach your target audience effectively. We help you get found by the right people at the right time.",
        features: ["Search Engine Optimization", "Content Marketing", "Social Media Strategy", "Email Marketing", "Analytics & Reporting"]
      },
      {
        icon: <ShoppingCart className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "E-Commerce Marketing",
        description: "Specialized marketing strategies for online stores that drive traffic and increase conversions. We help you sell more products online.",
        features: ["Conversion Rate Optimization", "Product Listing Optimization", "Shopping Feed Management", "Abandoned Cart Recovery", "Customer Retention"]
      }
    ],
    mobile: [
      {
        icon: <Smartphone className="w-12 h-12 text-primary transition-all duration-300 group-hover:text-white" />,
        title: "Mobile App Development",
        description: "Native and cross-platform mobile applications that provide seamless experiences on iOS and Android devices. We build apps that users love.",
        features: ["iOS & Android Development", "React Native Apps", "Mobile UI/UX Design", "App Store Optimization", "App Maintenance & Support"]
      }
    ]
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <ParallaxSection
          bgImage="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
          className="flex items-center justify-center text-white"
          height="min-h-[60vh]"
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="container relative z-10 text-center py-20">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              Our Services
            </div>
            <h1 className="mb-4">What We Offer</h1>
            <p className="max-w-3xl mx-auto text-lg">
              Comprehensive digital solutions to help your business thrive in the digital world.
            </p>
          </div>
        </ParallaxSection>

        {/* Services Tabs */}
        <section ref={servicesRef} className="section bg-white">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Our Expertise
              </div>
              <h2>Elevate Your Business With Our <span className="text-primary">Services</span></h2>
              <p className="text-lg text-muted-foreground mt-4">
                We offer a wide range of digital solutions tailored to your specific needs.
              </p>
            </div>

            {/* Service Categories */}
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {[
                { id: 'web', label: 'Web Development' },
                { id: 'design', label: 'Design' },
                { id: 'marketing', label: 'Marketing' },
                { id: 'mobile', label: 'Mobile Apps' }
              ].map((category) => (
                <button
                  key={category.id}
                  className={`px-6 py-3 rounded-full transition-all ${
                    activeSection === category.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveSection(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services[activeSection as keyof typeof services].map((service, index) => (
                <div 
                  key={index} 
                  className="group bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-all duration-300">
                      {service.icon}
                    </div>
                    <h3 className="text-2xl font-semibold mb-4">{service.title}</h3>
                    <p className="text-muted-foreground mb-6">{service.description}</p>
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature, i) => (
                        <div key={i} className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-100">
                      <a href="#" className="inline-flex items-center text-primary font-medium">
                        Learn More
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="bg-accent py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-semibold mb-6">Ready to Start Your Project?</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Get in touch with our team to discuss how we can help bring your vision to life.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button to="/contact" size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  Get a Free Consultation
                </Button>
                <Button href="tel:+15551234567" variant="outline" size="lg" className="rounded-full">
                  Call Us Now
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="section bg-white">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Our Process
              </div>
              <h2>How We <span className="text-primary">Work</span></h2>
              <p className="text-lg text-muted-foreground mt-4">
                Our proven approach ensures we deliver high-quality solutions that meet your needs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Discovery",
                  description: "We start by understanding your business, goals, and requirements in detail."
                },
                {
                  step: "02",
                  title: "Planning",
                  description: "We create a comprehensive plan outlining the scope, timeline, and deliverables."
                },
                {
                  step: "03",
                  title: "Execution",
                  description: "Our team works diligently to bring your project to life with regular updates."
                },
                {
                  step: "04",
                  title: "Delivery & Support",
                  description: "We launch your project and provide ongoing support to ensure its success."
                }
              ].map((step, index) => (
                <div key={index} className="relative group">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 h-full group-hover:-translate-y-2 transition-transform duration-300">
                    <div className="text-5xl font-bold text-primary/20 mb-4">{step.step}</div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                  {index < 3 && (
                    <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/40">
                        <path d="m5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ServicesPage;
