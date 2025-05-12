import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <>
      <style>
        {`
          .custom-navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 50;
            transition: all 0.3s ease-in-out;
            padding: 12px 30px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: transparent;
          }

          .custom-navbar.scrolled {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.2);
          }

          .custom-container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }

          .custom-logo {
            height: 55px;
            display: flex;
            align-items: center;
          }

          .custom-logo img {
            height: 90px;
            max-height: 100px;
            object-fit: contain;
          }

          .custom-nav-links {
            display: flex;
            gap: 20px;
            align-items: center;
          }

          .custom-nav-link {
            text-decoration: none;
            font-size: 16px;
            font-weight: 500;
            color: black;
            transition: color 0.3s ease-in-out;
          }

          .custom-nav-link:hover,
          .custom-nav-link.active {
            color: #007bff;
          }

          .custom-get-started {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            text-decoration: none;
            transition: background 0.3s ease-in-out;
          }

          .custom-get-started:hover {
            background: #0056b3;
          }

          /* Mobile Menu */
          .custom-menu-button {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: black;
            display: none;
          }

          .custom-mobile-menu {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            text-align: center;
            transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
            opacity: 0;
            pointer-events: none;
          }

          .custom-mobile-menu.open {
            opacity: 1;
            pointer-events: auto;
            transform: translateY(0);
          }

          .custom-mobile-menu a {
            font-size: 18px;
            font-weight: 500;
            color: white;
          }

          .custom-mobile-menu a:hover {
            color: #007bff;
          }

          /* Responsive */
          @media (max-width: 768px) {
            .custom-nav-links {
              display: none;
            }

            .custom-menu-button {
              display: block;
            }

            .custom-logo {
              height: 50px;
            }

            .custom-logo img {
              height: 80px;
            }
          }
        `}
      </style>

      <header className={`custom-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="custom-container">
          <Link to="/" className="custom-logo" onClick={closeMenu}>
            <img src="ideovent.png" alt="Ideovent Logo" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="custom-nav-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`custom-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                {item.name}
              </Link>
            ))}
            <Link to="/contact" className="custom-get-started">
              Get Started
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button className="custom-menu-button" onClick={toggleMenu}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className={`custom-mobile-menu ${isOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`custom-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={closeMenu}
            >
              {item.name}
            </Link>
          ))}
          <Link to="/contact" className="custom-get-started" onClick={closeMenu}>
            Get Started
          </Link>
        </div>
      </header>
    </>
  );
};

export default Navbar;
