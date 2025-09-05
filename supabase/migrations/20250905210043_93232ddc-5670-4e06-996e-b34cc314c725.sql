-- Create comprehensive demo brands for hamza2007ezzat@gmail.com
-- First, let's find or create the user ID for this email
-- Since we can't query auth.users directly, we'll insert demo data for any user with this email

-- Insert comprehensive demo brands with all available details
INSERT INTO brands (
  name,
  primary_color,
  secondary_color,
  audience,
  tone,
  logo_url,
  fonts,
  user_id
) VALUES
-- Professional Tech Company Brand
(
  'Nexus Digital Solutions',
  '#0F172A', -- Sophisticated dark blue
  '#3B82F6', -- Bright blue accent
  'tech entrepreneurs, startups, enterprise clients, digital agencies',
  'professional, innovative, trustworthy, cutting-edge',
  'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=400&fit=crop&crop=center',
  '{
    "primary": "Inter",
    "secondary": "JetBrains Mono",
    "heading": "Inter",
    "body": "Inter",
    "display": "Inter",
    "mono": "JetBrains Mono"
  }'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1)
),
-- Creative Agency Brand
(
  'Artisan Creative Studio',
  '#EC4899', -- Vibrant pink
  '#F59E0B', -- Golden yellow
  'creative professionals, artists, designers, creative agencies, lifestyle brands',
  'creative, bold, inspiring, artistic, vibrant',
  'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=400&fit=crop&crop=center',
  '{
    "primary": "Playfair Display",
    "secondary": "Source Sans Pro",
    "heading": "Playfair Display",
    "body": "Source Sans Pro",
    "display": "Playfair Display",
    "mono": "Fira Code"
  }'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1)
),
-- Luxury Brand
(
  'Meridian Luxury Holdings',
  '#1F2937', -- Elegant dark gray
  '#D4AF37', -- Gold accent
  'high-net-worth individuals, luxury consumers, premium service clients, affluent professionals',
  'luxurious, sophisticated, exclusive, premium, refined',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center',
  '{
    "primary": "Cormorant Garamond",
    "secondary": "Lato",
    "heading": "Cormorant Garamond",
    "body": "Lato",
    "display": "Cormorant Garamond",
    "mono": "IBM Plex Mono"
  }'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1)
),
-- Eco-Friendly Brand
(
  'GreenWave Sustainability',
  '#059669', -- Forest green
  '#84CC16', -- Lime green
  'environmentally conscious consumers, sustainability advocates, eco-friendly businesses, green technology companies',
  'authentic, sustainable, caring, responsible, natural',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=400&fit=crop&crop=center',
  '{
    "primary": "Nunito Sans",
    "secondary": "Open Sans",
    "heading": "Nunito Sans",
    "body": "Open Sans",
    "display": "Nunito Sans",
    "mono": "Roboto Mono"
  }'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1)
),
-- Health & Wellness Brand
(
  'Vitality Wellness Center',
  '#7C3AED', -- Purple
  '#10B981', -- Teal
  'health-conscious individuals, wellness enthusiasts, fitness professionals, healthcare providers, holistic practitioners',
  'caring, healing, energetic, trustworthy, calming',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop&crop=center',
  '{
    "primary": "Poppins",
    "secondary": "Source Sans Pro",
    "heading": "Poppins",
    "body": "Source Sans Pro",
    "display": "Poppins",
    "mono": "Space Mono"
  }'::jsonb,
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1)
);

-- Also create some sample onboarding data to show the complete process
INSERT INTO onboarding_answers (
  user_id,
  answers,
  completed
) VALUES
(
  (SELECT id FROM auth.users WHERE email = 'hamza2007ezzat@gmail.com' LIMIT 1),
  '{
    "companyName": "Demo Company Portfolio",
    "brandName": "Nexus Digital Solutions",
    "businessType": "Technology",
    "targetAudience": ["tech entrepreneurs", "startups", "enterprise clients"],
    "brandPersonality": ["professional", "innovative", "trustworthy"],
    "primaryColor": "#0F172A",
    "secondaryColor": "#3B82F6",
    "tone": "professional",
    "marketPosition": "premium",
    "businessGoals": ["brand awareness", "lead generation", "customer retention"],
    "audienceAge": "25-45",
    "audienceIncome": "high",
    "styleValues": ["modern", "minimal", "professional"],
    "logoAssets": ["wordmark", "icon", "full-logo"]
  }'::jsonb,
  true
);