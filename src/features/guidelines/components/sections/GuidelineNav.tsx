import React, { useEffect, useState, useRef } from 'react';
import type { Brand } from '@/shared/types/brand';

interface NavSection {
  id: string;
  number: string;
  title: string;
}

interface GuidelineNavProps {
  brand: Brand;
  sections: NavSection[];
}

export const GuidelineNav: React.FC<GuidelineNavProps> = ({ brand, sections }) => {
  const primaryColor = brand.primaryColor || '#6366f1';
  const fontFamily = brand.fonts?.primary || 'sans-serif';
  const brandInitial = brand.name.charAt(0).toUpperCase();
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id || '');
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Disconnect any existing observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          // Pick the one with the highest intersection ratio
          const best = visible.reduce((prev, curr) =>
            curr.intersectionRatio > prev.intersectionRatio ? curr : prev
          );
          setActiveSection(best.target.id);
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    observerRef.current = observer;

    // Observe all section elements
    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="hidden lg:flex fixed left-0 top-0 h-screen w-48 flex-col py-8 px-6 z-40 bg-white/80 backdrop-blur-sm border-r border-gray-100">
      {/* Brand identity */}
      <div className="mb-10 flex items-center gap-2">
        {brand.logo ? (
          <img
            src={brand.logo}
            alt={`${brand.name} logo`}
            className="h-6 w-auto object-contain"
          />
        ) : (
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {brandInitial}
          </div>
        )}
        <span
          className="text-sm font-semibold text-gray-800 truncate"
          style={{ fontFamily }}
        >
          {brand.name}
        </span>
      </div>

      {/* Section links */}
      <ul className="space-y-1 flex-1">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <li key={section.id}>
              <button
                onClick={() => handleClick(section.id)}
                className="w-full text-left py-2 px-3 rounded-lg text-xs font-mono tracking-wide transition-all duration-200 border-l-2"
                style={{
                  borderLeftColor: isActive ? primaryColor : 'transparent',
                  color: isActive ? primaryColor : '#9ca3af',
                  backgroundColor: isActive ? `${primaryColor}08` : 'transparent',
                }}
              >
                <span className="mr-2 font-semibold">{section.number}</span>
                {section.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default GuidelineNav;
