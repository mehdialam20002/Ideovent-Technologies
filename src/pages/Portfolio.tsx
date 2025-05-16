
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ParallaxSection from '../components/ui/ParallaxSection';
// import {Button} from '../components/ui/Button';

import { Button } from '../components/ui/Button';
import { X } from 'lucide-react';

const Portfolio = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Portfolio - Ideovent Technologies";
    
    // Disable body scroll when modal is open
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isModalOpen]);
  
  // Example project data
  interface ProjectType {
    id: number;
    title: string;
    category: string;
    image: string;
    description: string;
    client: string;
    technologies: string[];
    challenge: string;
    solution: string;
    results: string;
    link: string;
  }
  
  const projects: ProjectType[] = [
    {
      id: 1,
      title: "EcoStore E-Commerce Platform",
      category: "e-commerce",
      image: "https://images.unsplash.com/photo-1557821552-17105176677c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A comprehensive e-commerce platform for sustainable products with advanced filtering and payment integration.",
      client: "EcoStore Inc.",
      technologies: ["React.js", "Node.js", "MongoDB", "Stripe API"],
      challenge: "Create a user-friendly e-commerce platform with advanced filtering options and secure payment processing.",
      solution: "We developed a custom e-commerce solution with a React.js frontend and Node.js backend, integrating Stripe for secure payments and implementing a sophisticated filtering system.",
      results: "The platform achieved a 45% increase in conversion rates and a 30% reduction in cart abandonment within the first three months.",
      link: "#"
    },
    {
      id: 2,
      title: "HealthTrack Mobile App",
      category: "mobile",
      image: "https://images.unsplash.com/photo-1509395062183-67c5ad6faff9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A comprehensive health tracking application for iOS and Android with real-time data visualization.",
      client: "HealthPlus Medical",
      technologies: ["React Native", "Firebase", "D3.js", "HealthKit API"],
      challenge: "Develop a cross-platform mobile app that allows users to track various health metrics and visualize their progress over time.",
      solution: "We created a React Native app with seamless integration with device health sensors, Firebase for real-time data sync, and D3.js for interactive data visualization.",
      results: "The app has gained over 100,000 downloads with a 4.8-star rating across app stores and has been featured in several health tech publications.",
      link: "#"
    },
    {
      id: 3,
      title: "FinTech Dashboard",
      category: "web",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A comprehensive financial analytics dashboard for investment professionals with real-time data integration.",
      client: "InvestPro Financial",
      technologies: ["React.js", "TypeScript", "GraphQL", "Recharts"],
      challenge: "Create a high-performance dashboard that processes and visualizes large financial datasets in real-time.",
      solution: "We built a responsive dashboard using React.js with TypeScript for type safety, GraphQL for efficient data fetching, and Recharts for dynamic data visualization.",
      results: "The dashboard has helped clients reduce data analysis time by 60% and improve investment decision-making efficiency by 40%.",
      link: "#"
    },
    {
      id: 4,
      title: "Travel Booking Platform",
      category: "web",
      image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A comprehensive travel booking platform with personalized recommendations and real-time availability.",
      client: "GlobeTravel Tours",
      technologies: ["React.js", "Node.js", "MongoDB", "AWS"],
      challenge: "Develop a travel booking platform that integrates with multiple service providers and offers personalized recommendations.",
      solution: "We created a scalable platform with a microservices architecture, real-time availability checking, and a recommendation engine based on user preferences and behavior.",
      results: "The platform has achieved a 35% increase in bookings and a 50% increase in customer satisfaction scores since launch.",
      link: "#"
    },
    {
      id: 5,
      title: "Corporate Brand Redesign",
      category: "design",
      image: "https://images.unsplash.com/photo-1523726491678-bf852e717f6a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A complete brand identity redesign for a global technology company, including logo, visual identity, and guidelines.",
      client: "TechGlobal Corporation",
      technologies: ["Brand Strategy", "Visual Design", "UI/UX", "Marketing Collateral"],
      challenge: "Refresh an outdated brand identity to reflect the company's innovative spirit while maintaining brand recognition.",
      solution: "We conducted comprehensive market research and stakeholder interviews to inform a modern brand identity that balanced innovation with heritage.",
      results: "The rebrand resulted in a 25% increase in brand recognition and helped the company attract a younger demographic while retaining existing customers.",
      link: "#"
    },
    {
      id: 6,
      title: "E-Learning Platform",
      category: "web",
      image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80",
      description: "A comprehensive e-learning platform with interactive courses, assessments, and progress tracking.",
      client: "EduTech Solutions",
      technologies: ["React.js", "Node.js", "MongoDB", "WebRTC"],
      challenge: "Create an engaging e-learning platform that supports various content types and provides meaningful progress tracking.",
      solution: "We developed a feature-rich platform with interactive lessons, real-time video sessions, automated assessments, and detailed analytics for learners and instructors.",
      results: "The platform has been adopted by multiple educational institutions, resulting in a 40% improvement in student engagement and a 25% increase in completion rates.",
      link: "#"
    }
  ];

  const filteredProjects = activeFilter === 'all' 
    ? projects 
    : projects.filter(project => project.category === activeFilter);

  const openProjectModal = (project: ProjectType) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const closeProjectModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProject(null), 300);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <ParallaxSection
          bgImage="https://images.unsplash.com/photo-1498050108023-c5249f4df085?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
          className="flex items-center justify-center text-white"
          height="min-h-[60vh]"
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="container relative z-10 text-center py-20">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              Our Work
            </div>
            <h1 className="mb-4">Portfolio</h1>
            <p className="max-w-3xl mx-auto text-lg">
              Explore our latest projects and see how we've helped businesses achieve their goals.
            </p>
          </div>
        </ParallaxSection>

        {/* Portfolio Filter */}
        <section className="section bg-white">
          <div className="container">
            <div className="text-center max-w-xl mx-auto mb-12">
              <div className="inline-block bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                Our Projects
              </div>
              <h2>Featured <span className="text-primary">Work</span></h2>
              <p className="text-lg text-muted-foreground mt-4">
                Browse our portfolio of successful projects across various industries.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {[
                { id: 'all', label: 'All Projects' },
                { id: 'web', label: 'Web Development' },
                { id: 'mobile', label: 'Mobile Apps' },
                { id: 'e-commerce', label: 'E-Commerce' },
                { id: 'design', label: 'Design' }
              ].map((category) => (
                <button
                  key={category.id}
                  className={`px-6 py-3 rounded-full transition-all ${
                    activeFilter === category.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveFilter(category.id)}
                >
                  {category.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProjects.map((project) => (
                <div key={project.id} className="group cursor-pointer" onClick={() => openProjectModal(project)}>
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm h-full transition-all duration-300 hover:shadow-lg group-hover:-translate-y-2">
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={project.image} 
                        alt={project.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                        <div className="p-6 text-white">
                          <span className="text-xs uppercase tracking-wider bg-primary/80 px-2 py-1 rounded-full">
                            {project.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">{project.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.slice(0, 3).map((tech, index) => (
                          <span key={index} className="text-xs bg-accent px-2 py-1 rounded-full">
                            {tech}
                          </span>
                        ))}
                        {project.technologies.length > 3 && (
                          <span className="text-xs bg-accent px-2 py-1 rounded-full">
                            +{project.technologies.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredProjects.length === 0 && (
              <div className="text-center py-16">
                <h3 className="text-xl mb-2">No projects found</h3>
                <p className="text-muted-foreground">Try selecting a different category</p>
              </div>
            )}
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
              <Button to="/contact" size="lg" className="rounded-full shadow-lg shadow-primary/20">
                Get a Free Consultation
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Project Detail Modal */}
      {selectedProject && (
        <div 
          className={`fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 transition-opacity duration-300 ${
            isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={closeProjectModal}
        >
          <div 
            className={`bg-white rounded-xl overflow-hidden max-w-5xl w-full max-h-[90vh] overflow-y-auto transition-transform duration-300 ${
              isModalOpen ? 'scale-100' : 'scale-95'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video">
              <img 
                src={selectedProject.image} 
                alt={selectedProject.title} 
                className="w-full h-full object-cover"
              />
              <button 
                className="absolute top-4 right-4 bg-white rounded-full p-2 shadow-md text-gray-700 hover:text-primary transition-colors"
                onClick={closeProjectModal}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-semibold">{selectedProject.title}</h2>
                <span className="text-xs uppercase tracking-wider bg-primary/10 text-primary px-3 py-1 rounded-full">
                  {selectedProject.category}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-medium mb-2">Client</h3>
                  <p className="text-muted-foreground">{selectedProject.client}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium mb-2">Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.technologies.map((tech, index) => (
                      <span key={index} className="text-sm bg-accent px-3 py-1 rounded-full">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 mb-8">
                <div>
                  <h3 className="text-xl font-medium mb-2">Challenge</h3>
                  <p className="text-muted-foreground">{selectedProject.challenge}</p>
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-2">Solution</h3>
                  <p className="text-muted-foreground">{selectedProject.solution}</p>
                </div>
                <div>
                  <h3 className="text-xl font-medium mb-2">Results</h3>
                  <p className="text-muted-foreground">{selectedProject.results}</p>
                </div>
              </div>
              
              <a 
                href={selectedProject.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center bg-primary text-white px-6 py-3 rounded-lg font-medium transition-colors hover:bg-primary/90"
              >
                View Live Project
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
