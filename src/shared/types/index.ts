import { LucideIcon } from "lucide-react";

// Core brand data structures
export interface Brand {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  createdAt: Date;
  updatedAt: Date;
}

// Feature and content types
export interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  category: 'pain-point' | 'solution' | 'module';
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
  description?: string;
}

export interface MarqueeItem {
  id: string;
  text: string;
  order: number;
}

export interface FloatingTile {
  id: string;
  icon: LucideIcon;
  label: string;
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  animationDelay?: string;
}

// Module/Product features
export interface ProductModule {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  features: string[];
  isAvailable: boolean;
}

// Section split content
export interface SectionContent {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  altText: string;
  order: number;
}

// Pricing plans
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  description: string;
  features: string[];
  isPopular: boolean;
  isAvailable: boolean;
  ctaText: string;
}

// Hero section data
export interface HeroContent {
  badge: {
    text: string;
    className: string;
  };
  headline: string;
  description: string;
  cta: {
    primary: {
      text: string;
      variant: string;
    };
    secondary?: {
      text: string;
      variant: string;
    };
  };
  heroImageUrl: string;
  heroImageAlt: string;
}

// Animation and UI types
export interface AnimationConfig {
  threshold: number;
  animationClass: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

// Form types
export interface BrandNameForm {
  brandName: string;
}

// User and auth types (for future use)
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}