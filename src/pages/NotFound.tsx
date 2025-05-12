
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import {Button} from '../components/ui/button';

const NotFound = () => {
  useEffect(() => {
    document.title = "Page Not Found - Ideovent Technologies";
  }, []);
//k
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-20">
        <div className="container">
          <div className="max-w-lg mx-auto text-center">
            <div className="text-primary text-9xl font-bold mb-6">404</div>
            <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
            <p className="text-lg text-muted-foreground mb-8">
              The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <Button to="/" className="rounded-full px-8">
              Back to Home
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
