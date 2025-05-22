import { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Ensure react-router-dom is installed and used
import { Button } from "../ui/button";

const Hero = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="min-h-screen flex items-center pt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent to-background -z-10" />

      <div className="absolute inset-0 overflow-hidden -z-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-primary/10 animate-float"
            style={{
              width: `${Math.random() * 400 + 100}px`,
              height: `${Math.random() * 400 + 100}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-2">
              <div
                className={`inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium transition-all duration-700 transform ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                Welcome to Ideovent Technologies
              </div>
              <h1
                className={`transition-all duration-700 delay-100 transform ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                Digital Solutions <br />
                <span className="text-primary">for Businesses</span>
              </h1>
              <p
                className={`text-lg text-muted-foreground md:text-xl max-w-2xl transition-all duration-700 delay-200 transform ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              >
                We craft innovative digital experiences that transform businesses
                and drive growth through cutting-edge technology and design.
              </p>
            </div>

            <div
              className={`flex flex-wrap gap-4 transition-all duration-700 delay-300 transform ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <Link to="/contact">
                <Button size="lg" className="rounded-full shadow-lg shadow-primary/20">
                  Get a Free Consultation
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="lg" className="rounded-full">
                  View Our Services
                </Button>
              </Link>
            </div>

            <div
              className={`flex items-center gap-6 transition-all duration-700 delay-400 transform ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
            >
              <div className="flex -space-x-4">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
                  alt="Client"
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80"
                  alt="Client"
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80"
                  alt="Client"
                  className="w-10 h-10 rounded-full border-2 border-white object-cover"
                />
              </div>
              <div>
                <div className="font-medium">Your Trusted Partner</div>
                <div className="text-sm text-muted-foreground">in Digital Innovation</div>
              </div>
            </div>
          </div>

          <div
            className={`aspect-square max-w-md mx-auto lg:max-w-none transition-all duration-1000 transform ${
              isVisible ? "opacity-100 translate-y-0 rotate-0" : "opacity-0 translate-y-20 rotate-12"
            }`}
          >
            <div className="relative w-full h-full">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-3xl transform rotate-6 animate-pulse-soft" />
              <img
                src="https://i.postimg.cc/nLvCH4X2/hero-Sectio.jpg"
                alt="Digital Solutions"
                className="rounded-3xl object-cover w-full h-full shadow-2xl"
              />
              <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl">
                <div className="text-sm font-medium">Client Satisfaction</div>
                <div className="text-2xl font-bold text-primary">98%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
