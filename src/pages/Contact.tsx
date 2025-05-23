
import { useEffect, useState } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import ParallaxSection from '../components/ui/ParallaxSection';
import ContactForm from '../components/sections/ContactForm';
import { Mail, Phone, MapPin, MessageSquare, X } from 'lucide-react';

const Contact = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'bot', text: string }[]>([
    { sender: 'bot', text: 'Hi there! 👋 Welcome to Ideovent Technologies. How can I help you today?' }
  ]);
  const [userInput, setUserInput] = useState('');
  
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Contact Us - Ideovent Technologies";
  }, []);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;
     
    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: userInput }]);
    
    // Simulate bot response after a delay
    setTimeout(() => {
      let botResponse = "Thanks for your message! One of our team members will get back to you soon.";
      
      // Simple keyword-based responses
      if (userInput.toLowerCase().includes('pricing')) {
        botResponse = "Our pricing varies based on project requirements. We'd be happy to provide a custom quote after learning more about your needs. Would you like to schedule a consultation?";
      } else if (userInput.toLowerCase().includes('service')) {
        botResponse = "We offer a range of services including web development, UI/UX design, mobile app development, and digital marketing. Is there a specific service you're interested in?";
      } else if (userInput.toLowerCase().includes('time') || userInput.toLowerCase().includes('long')) {
        botResponse = "Project timelines vary depending on complexity and scope. Typically, website projects take 4-8 weeks, while larger applications may take 2-4 months. We can provide a more accurate estimate during a consultation.";
      }
      
      setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 1000);
    
    setUserInput('');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <ParallaxSection
          bgImage="https://i.postimg.cc/XqLPwWbZ/contact.jpg"
          className="flex items-center justify-center text-white"
          height="min-h-[60vh]"
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="container relative z-10 text-center py-20">
            <div className="inline-block bg-primary text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              Get In Touch
            </div>
            <h1 className="mb-4">Contact Us</h1>
            <p className="max-w-3xl mx-auto text-lg">
              We'd love to hear from you. Get in touch with our team to discuss your project.
            </p>
          </div>
        </ParallaxSection>

        {/* Contact Form and Info */}
        <ContactForm />

        {/* Map Section */}
        <section className="bg-white py-12">
          <div className="container">
            <div className="bg-accent rounded-xl overflow-hidden shadow-sm">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d3569.998677510084!2d83.7725!3d26.520167!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3993cab19c24aee5%3A0x7288725fbb4e3302!2sSalempur%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1743593662444!5m2!1sen!2sin" 
                width="100%" 
                height="450" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="Office Location"
              ></iframe>
            </div>
          </div>
        </section>

        {/* Quick Contact Cards */}
        <section className="section bg-white">
          <div className="container">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Call Us</h3>
                <p className="text-muted-foreground mb-4">Mon-Fri from 8am to 5pm</p>
                <a href="tel:+919410707967" className="text-primary font-medium hover:underline">
                +91 9410707967
                </a>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Email Us</h3>
                <p className="text-muted-foreground mb-4">We'll respond within 24 hours</p>
                <a href="mailto:info@ideovent.com" className="text-primary font-medium hover:underline">
                  contact@ideovent.com
                </a>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Visit Us</h3>
                <p className="text-muted-foreground mb-4">Come say hello at our office</p>
                <address className="not-italic text-primary font-medium">
                  Salempur, Deoria<br />
                 Uttar Pradesh, 274509
                </address>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />

      {/* Chatbot */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-4 transition-all duration-300 ease-in-out ${
        isChatOpen ? 'h-[500px]' : 'h-auto'
      }`}>
        {/* Chat button */}
        <button 
          className="w-16 h-16 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors flex items-center justify-center"
          onClick={() => setIsChatOpen(!isChatOpen)}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
        </button>
        
        {/* Chat window */}
        <div 
          className={`w-80 sm:w-96 bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-bounce-in ${
            isChatOpen ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 pointer-events-none'
          }`}
        >
          {/* Chat header */}
          <div className="bg-primary text-white p-4">
            <h3 className="font-medium">Ideovent Chat Support</h3>
            <p className="text-sm text-white/70">We typically reply within minutes</p>
          </div>
          
          {/* Chat messages */}
          <div className="h-80 overflow-y-auto p-4 bg-gray-50">
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`mb-4 ${
                  message.sender === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div 
                  className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                    message.sender === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-white shadow-sm border border-gray-100'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
          
          {/* Chat input */}
          <form onSubmit={handleChatSubmit} className="p-3 border-t border-gray-100">
            <div className="flex">
              <input 
                type="text" 
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your message..." 
                className="flex-grow px-4 py-2 bg-gray-100 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button 
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-r-lg hover:bg-primary/90 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
