
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ParallaxSection from '../components/ui/ParallaxSection';
import AnimatedText from '../components/ui/AnimatedText';
import  { CardHeader, CardContent } from '../components/ui/card';
import { Card } from '../components/ui/card';
// import * from '../components/ui/Card'
const About = () => {
  const [isVisible, setIsVisible] = useState({
    team: false,
    timeline: false
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "About Us - Ideovent Technologies";

    const observerOptions = {
      rootMargin: '0px',
      threshold: 0.1
    };

    const teamObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(prev => ({ ...prev, team: true }));
        teamObserver.disconnect();
      }
    }, observerOptions);

    const timelineObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(prev => ({ ...prev, timeline: true }));
        timelineObserver.disconnect();
      }
    }, observerOptions);

    const teamSection = document.getElementById('team-section');
    const timelineSection = document.getElementById('timeline-section');

    if (teamSection) teamObserver.observe(teamSection);
    if (timelineSection) timelineObserver.observe(timelineSection);

    return () => {
      if (teamSection) teamObserver.disconnect();
      if (timelineSection) timelineObserver.disconnect();
    };
  }, []);

  const teamMembers = [
    {
      name: "Abhishek Tiwari ",
      role: "Director & Founder",
      bio: "Abhishek is a visionary entrepreneur and strategic leader driving innovation and growth at Ideovent Technologies.",
      image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwgT2eHovk83Kd0D870HAoiPDi4IQLN9jQjg&s"
    },
    {
      name: "Animesh Raturi",
      role: "Co-Founder & CEO",
      bio: "With over 5 years of experience in software development and business leadership.",
      image: "animeshprofile.jpeg"
    },
    {
      name: "Abhilasha Kumari",
      role: "Co-Founder & CTO",
      bio: "Full-stack developer specializing in React.js and modern web technologies.",
      image: "https://img.freepik.com/premium-vector/avatar-profile-icon-flat-style-female-user-profile-vector-illustration-isolated-background-women-profile-sign-business-concept_157943-38866.jpg?semt=ais_hybrid"
    },
    
   
    // {
    //   name: "Sarah Wilson",
    //   role: "Marketing Specialist",
    //   bio: "Digital marketing expert with a focus on SEO, content strategy, and analytics.",
    //   image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80"
    // }
  ];

  const milestones = [
    {
      year: "2024",
      title: "Company Founded",
      description: "Ideovent Technologies was established with a vision to provide innovative digital solutions."
    },
    {
      year: "2025",
      title: "First Major Client",
      description: "Secured our first enterprise client and expanded the team to 5 employees."
    },
    {
      year: "2025",
      title: "International Expansion",
      description: "Expanded our presence to serve a growing global client base with innovative digital solutions."
    },
    // {
    //   year: "2021",
    //   title: "Award-winning Projects",
    //   description: "Received multiple industry awards for our innovative web and mobile applications."
    // },
    // {
    //   year: "2025",
    //   title: "Technology Innovation",
    //   description: "Launched our proprietary AI-driven development framework to accelerate project delivery."
    // }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <ParallaxSection
          bgImage="https://i.postimg.cc/rwTpfdnt/vision.jpg"
          className="flex items-center justify-center text-white"
          height="min-h-[60vh]"
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="container relative z-10 text-center py-20">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              About Us
            </div>
            <h1 className="mb-4">Our Story & Mission</h1>
            <p className="max-w-3xl mx-auto text-lg">
              We're a team of passionate designers, developers, and digital strategists dedicated to transforming businesses through technology.
            </p>
          </div>
        </ParallaxSection>

        {/* Company Overview */}
        <section id="about-section" className="section bg-white">
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              Our Journey
            </div>
            <h2>
              Transforming Ideas Into <span className="text-primary">Digital Reality</span>
            </h2>
            <div className="space-y-4 mt-6">
              <AnimatedText
                text="Founded in 2024, Ideovent Technologies began with a simple vision: to help businesses thrive in the digital world through innovative technology solutions."
                className={`text-lg transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}
              />
              <AnimatedText
                text="Over the years, we've grown from a small startup to a global digital agency, serving clients across various industries and continents. Our team of experts combines technical expertise with creative thinking to deliver results that exceed expectations."
                className={`text-lg transition-opacity duration-1000 delay-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
              />
              <AnimatedText
                text="What sets us apart is our commitment to understanding each client's unique needs and challenges. We don't just build websites or apps; we create digital experiences that drive business growth and user engagement."
                className={`text-lg transition-opacity duration-1000 delay-400 ${isVisible ? "opacity-100" : "opacity-0"}`}
              />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -top-6 -left-6 w-40 h-40 bg-primary/10 rounded-2xl -z-10" />
            <img
              src="https://i.postimg.cc/brbzT81T/digital-Reality.jpg"
              alt="Our team"
              className="rounded-xl shadow-xl transition-transform duration-1000 transform scale-90"
            />
            <div className="absolute -bottom-6 -right-6 w-40 h-40 bg-secondary/10 rounded-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
        {/* Team Members */}
        <section id="team-section" className="section bg-accent">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Our Team
              </div>
              <h2>Meet The <span className="text-primary">Experts</span></h2>
              <p className="text-lg text-muted-foreground mt-4">
                Our diverse team brings together the best talent from across the industry.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <div 
                  key={index}
                  className={`transition-all duration-700 transform ${
                    isVisible.team 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-20'
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="group h-full">
                  <div className="bg-white rounded-lg shadow-md overflow-hidden h-full transform transition-transform duration-500 group-hover:scale-[0.97] relative">

                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={member.image} 
                          alt={member.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-semibold">{member.name}</h3>
                        <p className="text-primary font-medium mb-2">{member.role}</p>
                        <p className="text-muted-foreground">{member.bio}</p>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-6">
                        <div className="flex space-x-4 text-white">
                          <a href="#" className="hover:text-primary transition-colors">
                            {/* <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                              <rect x="2" y="9" width="4" height="12"></rect>
                              <circle cx="4" cy="4" r="2"></circle>
                            </svg>
                          </a>
                          <a href="#" className="hover:text-primary transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                            </svg> */}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Milestones Timeline */}
        <section id="timeline-section" className="section bg-white relative">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Our Journey
              </div>
              <h2>Key <span className="text-primary">Milestones</span></h2>
              <p className="text-lg text-muted-foreground mt-4">
                Our growth story over the years.
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              {/* Timeline Line */}
              <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-0.5 bg-primary/20" />
              
              {milestones.map((milestone, index) => (
                <div 
                  key={index}
                  className={`relative z-10 mb-12 transition-all duration-700 transform ${
                    isVisible.timeline
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-20'
                  }`}
                  style={{ transitionDelay: `${index * 200}ms` }}
                >
                  <div className={`flex items-center ${index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className="w-1/2" />
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-lg z-20">
                      {milestone.year.slice(-2)}
                    </div>
                    <div className="w-1/2" />
                  </div>
                  
                  <div className={`mt-4 flex ${index % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <Card
                      variant={index % 2 === 0 ? "default" : "glass"} 
                      className={`max-w-md ${index % 2 === 0 ? 'text-right' : 'text-left'}`}
                    >
                      <CardHeader>
                        <div className="text-sm font-semibold text-primary">{milestone.year}</div>
                        <h3 className="text-xl font-semibold">{milestone.title}</h3>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{milestone.description}</p>
                      </CardContent>
                    </Card>
                  </div>
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

export default About;
