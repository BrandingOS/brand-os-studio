import type { LucideIcon } from 'lucide-react';

export interface FeatureCardData {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface StatData {
  value: string;
  label: string;
}

export interface ProductModuleData {
  icon: LucideIcon;
  title: string;
  description: string;
  image: string;
}
