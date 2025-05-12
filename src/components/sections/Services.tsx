
import { useState, useEffect, useRef } from 'react';
import { Code, PenTool, Globe, ShoppingCart } from 'lucide-react';
import {Button} from '../ui/Button';
import {Card,  CardHeader, CardTitle, CardContent } from '../ui/Card';

const Services = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.unobserve(sectionRef.current!);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const services = [
    {
      title: "Website Development",
      description: "Custom websites built with React.js, WordPress, or other technologies tailored to your needs.",
      icon: <Code className="w-10 h-10 text-primary" />
    },
    {
      title: "UI/UX Design",
      description: "User-centered design that enhances user experience and engagement with your brand.",
      icon: <PenTool className="w-10 h-10 text-primary" />
    },
    {
      title: "SEO & Digital Marketing",
      description: "Optimize your online presence and reach your target audience effectively.",
      icon: <Globe className="w-10 h-10 text-primary" />
    },
    {
      title: "E-Commerce Development",
      description: "Powerful online stores that drive sales and provide excellent customer experiences.",
      icon: <ShoppingCart className="w-10 h-10 text-primary" />
    }
  ];

  return (
    <section ref={sectionRef} className="section bg-accent relative overflow-hidden">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Our Services
          </div>
          <h2>Transforming Ideas into <span className="text-primary">Digital Reality</span></h2>
          <p className="text-lg text-muted-foreground mt-4">
            We offer comprehensive digital solutions tailored to your business needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <Card 
              key={index} 
              hover 
              variant="glass"
              className={`h-full transition-all duration-700 transform ${
                isVisible 
                  ? 'opacity-100 translate-y-0' 
                  : 'opacity-0 translate-y-20'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="mb-4">{service.icon}</div>
                <CardTitle>{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button to="/services" variant="outline" className="rounded-full">
            View All Services
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;
