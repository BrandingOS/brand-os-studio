import { useEffect } from "react";
import { AnimationConfig } from "@/shared/types";

const defaultConfig: AnimationConfig = {
  threshold: 0.15,
  animationClass: "animate-fade-in"
};

export function useScrollReveal(config: Partial<AnimationConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('[data-animate]');
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(finalConfig.animationClass);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: finalConfig.threshold }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [finalConfig.animationClass, finalConfig.threshold]);
}