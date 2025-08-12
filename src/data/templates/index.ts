// Placeholder for future module templates
// This will contain templates for business cards, letterheads, etc.

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  preview: string;
  data: Record<string, any>;
}

export const templates: Template[] = [];

// Future implementation will include:
// - Business card templates
// - Letterhead templates  
// - Social media templates
// - Presentation templates
// - Web asset templates
// - Print collateral templates