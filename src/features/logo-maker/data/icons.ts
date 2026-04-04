import type { IconCategory } from '../types';

export const ICON_CATEGORIES: IconCategory[] = [
  {
    id: 'business',
    label: 'Business',
    icons: [
      'Briefcase', 'Building', 'Building2', 'Landmark', 'BadgeDollarSign',
      'BarChart3', 'TrendingUp', 'PieChart', 'Target', 'Award',
      'Trophy', 'Crown', 'Gem', 'Handshake', 'Users',
      'UserCircle', 'BadgeCheck', 'ShieldCheck', 'Scale', 'Gavel',
      'Stamp', 'ClipboardCheck', 'FileText', 'FolderOpen', 'Inbox',
    ],
  },
  {
    id: 'tech',
    label: 'Technology',
    icons: [
      'Monitor', 'Laptop', 'Smartphone', 'Tablet', 'Cpu',
      'CircuitBoard', 'HardDrive', 'Server', 'Database', 'Cloud',
      'CloudCog', 'Wifi', 'Globe', 'Globe2', 'Link',
      'Code', 'Code2', 'Terminal', 'Binary', 'Braces',
      'GitBranch', 'Github', 'Blocks', 'Box', 'Layers',
      'LayoutGrid', 'Workflow', 'Plug', 'Zap', 'Bot',
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    icons: [
      'Palette', 'Paintbrush', 'PenTool', 'Pencil', 'Brush',
      'Pipette', 'Scissors', 'Eraser', 'Figma', 'Frame',
      'Image', 'Camera', 'Video', 'Film', 'Music',
      'Mic', 'Headphones', 'Lightbulb', 'Sparkles', 'Wand2',
      'Shapes', 'Pentagon', 'Hexagon', 'Octagon', 'Triangle',
      'Circle', 'Square', 'Diamond', 'Star', 'Heart',
    ],
  },
  {
    id: 'nature',
    label: 'Nature',
    icons: [
      'Leaf', 'TreePine', 'Trees', 'Flower', 'Flower2',
      'Sprout', 'Clover', 'Mountain', 'MountainSnow', 'Waves',
      'Droplets', 'Sun', 'Moon', 'CloudSun', 'Snowflake',
      'Wind', 'Rainbow', 'Feather', 'Bird', 'Bug',
      'Fish', 'Shell', 'Footprints', 'Flame', 'Tornado',
    ],
  },
  {
    id: 'food',
    label: 'Food & Drink',
    icons: [
      'UtensilsCrossed', 'ChefHat', 'CookingPot', 'Soup', 'Pizza',
      'Sandwich', 'Croissant', 'Cake', 'IceCream2', 'Cookie',
      'Apple', 'Cherry', 'Grape', 'Banana', 'Citrus',
      'Coffee', 'CupSoda', 'Wine', 'Beer', 'Martini',
      'Milk', 'Wheat', 'Egg', 'Beef', 'Candy',
    ],
  },
  {
    id: 'health',
    label: 'Health',
    icons: [
      'Heart', 'HeartPulse', 'Activity', 'Stethoscope', 'Pill',
      'Syringe', 'Thermometer', 'Cross', 'Hospital', 'Ambulance',
      'Brain', 'Eye', 'Ear', 'Hand', 'Bone',
      'Dumbbell', 'PersonStanding', 'Bike', 'Footprints', 'Timer',
      'Apple', 'Salad', 'Droplets', 'Shield', 'ShieldPlus',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    icons: [
      'GraduationCap', 'BookOpen', 'Book', 'Library', 'School',
      'Notebook', 'PenLine', 'Highlighter', 'Ruler', 'Calculator',
      'Atom', 'Microscope', 'FlaskConical', 'TestTube2', 'Telescope',
      'Globe2', 'Map', 'Compass', 'Languages', 'MessageSquare',
      'Brain', 'Lightbulb', 'Puzzle', 'Trophy', 'Medal',
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icons: [
      'DollarSign', 'Euro', 'PoundSterling', 'Coins', 'Wallet',
      'CreditCard', 'Receipt', 'Banknote', 'PiggyBank', 'Vault',
      'LineChart', 'BarChart3', 'CandlestickChart', 'TrendingUp', 'ArrowUpRight',
      'Percent', 'Calculator', 'Scale', 'Building', 'Landmark',
      'ShieldCheck', 'Lock', 'Key', 'CircleDollarSign', 'BadgeDollarSign',
    ],
  },
  {
    id: 'travel',
    label: 'Travel',
    icons: [
      'Plane', 'PlaneTakeoff', 'Ship', 'Car', 'Train',
      'Bus', 'Bike', 'MapPin', 'Map', 'Compass',
      'Navigation', 'Route', 'Luggage', 'Tent', 'Mountain',
      'Palmtree', 'Anchor', 'Sunrise', 'Sunset', 'Camera',
      'Ticket', 'Globe', 'Earth', 'Flag', 'Hotel',
    ],
  },
  {
    id: 'shapes',
    label: 'Abstract Shapes',
    icons: [
      'Hexagon', 'Pentagon', 'Octagon', 'Triangle', 'Diamond',
      'Circle', 'Square', 'Star', 'Sparkle', 'Sparkles',
      'Infinity', 'Orbit', 'Atom', 'Crosshair', 'Focus',
      'Maximize', 'Minimize2', 'RotateCcw', 'RefreshCw', 'Repeat',
      'Layers', 'LayoutGrid', 'Grid3x3', 'Combine', 'Merge',
      'Split', 'Workflow', 'GitMerge', 'Network', 'Share2',
    ],
  },
];

/** Flat list of all unique icon names across categories */
export const ALL_ICON_NAMES: string[] = Array.from(
  new Set(ICON_CATEGORIES.flatMap((c) => c.icons)),
);
