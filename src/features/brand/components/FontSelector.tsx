import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface FontSelectorProps {
  fonts: {
    primary?: string;
    secondary?: string;
  };
  onFontsChange: (fonts: { primary?: string; secondary?: string }) => void;
}

const POPULAR_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat',
  'Raleway', 'Poppins', 'Playfair Display', 'Merriweather',
  'Source Sans Pro', 'Nunito', 'Ubuntu', 'Oswald'
];

const FONT_WEIGHTS = ['Regular', 'Medium', 'Semi Bold', 'Bold'];

export function FontSelector({ fonts, onFontsChange }: FontSelectorProps) {
  const [primaryFont, setPrimaryFont] = useState(fonts.primary || 'Inter');
  const [secondaryFont, setSecondaryFont] = useState(fonts.secondary || 'Inter');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFonts = POPULAR_FONTS.filter(font =>
    font.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadGoogleFont = (fontFamily: string) => {
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  };

  useEffect(() => {
    if (primaryFont) loadGoogleFont(primaryFont);
    if (secondaryFont) loadGoogleFont(secondaryFont);
  }, [primaryFont, secondaryFont]);

  const handlePrimaryChange = (font: string) => {
    setPrimaryFont(font);
    onFontsChange({ ...fonts, primary: font });
  };

  const handleSecondaryChange = (font: string) => {
    setSecondaryFont(font);
    onFontsChange({ ...fonts, secondary: font });
  };

  return (
    <Card className="p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Typography</h3>
      </div>

      <div className="space-y-4">
        {/* Font Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Google Fonts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {/* Primary Font */}
          <div className="flex-shrink-0 w-[280px] space-y-3 snap-start">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Primary</label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Google
                </span>
                <span>Free</span>
              </div>
            </div>
            <Select value={primaryFont} onValueChange={handlePrimaryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredFonts.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div 
              className="text-3xl font-bold p-4 bg-muted rounded-lg"
              style={{ fontFamily: primaryFont }}
            >
              {primaryFont}
            </div>
          </div>

          {/* Secondary Font */}
          <div className="flex-shrink-0 w-[280px] space-y-3 snap-start">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Secondary</label>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Google
                </span>
                <span>Free</span>
              </div>
            </div>
            <Select value={secondaryFont} onValueChange={handleSecondaryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {filteredFonts.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div 
              className="text-base p-4 bg-muted rounded-lg"
              style={{ fontFamily: secondaryFont }}
            >
              {secondaryFont}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
