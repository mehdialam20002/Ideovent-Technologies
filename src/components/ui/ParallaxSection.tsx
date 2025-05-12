
import { ReactNode, useRef, useEffect, useState } from 'react';

interface ParallaxSectionProps {
  children: ReactNode;
  bgImage?: string;
  speed?: number;
  className?: string;
  bgClassName?: string;
  bgPosition?: string;
  height?: string;
}

const ParallaxSection = ({
  children,
  bgImage,
  speed = 0.3,
  className = '',
  bgClassName = '',
  bgPosition = 'center',
  height = 'min-h-screen',
}: ParallaxSectionProps) => {
  const [offsetY, setOffsetY] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const { top } = sectionRef.current.getBoundingClientRect();
        const offset = window.scrollY + top;
        const diff = window.scrollY - offset;
        setOffsetY(diff * speed);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div 
      ref={sectionRef}
      className={`relative overflow-hidden ${height} ${className}`}
    >
      {bgImage && (
        <div
          className={`absolute inset-0 w-full h-full ${bgClassName}`}
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundPosition: bgPosition,
            backgroundSize: 'cover',
            transform: `translateY(${offsetY}px)`,
            backgroundRepeat: 'no-repeat',
            zIndex: -1,
          }}
        />
      )}
      {children}
    </div>
  );
};

export default ParallaxSection;
