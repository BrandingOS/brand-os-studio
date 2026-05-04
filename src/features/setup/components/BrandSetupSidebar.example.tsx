import { BrandSetupSidebar, type Section } from './BrandSetupSidebar';

const sections: Section[] = [
  { key: 'logo', name: 'Logo', subtitle: '3 variants', filled: true },
  { key: 'colors', name: 'Color', subtitle: '5 colors', filled: true },
  { key: 'fonts', name: 'Typography', subtitle: 'Instrument Serif · Inter', filled: true },
  { key: 'icons', name: 'Iconography', subtitle: '12 icons', filled: true },
  { key: 'photos', name: 'Photography', subtitle: '8 references', filled: true },
  { key: 'website', name: 'Website', subtitle: '', filled: false },
  { key: 'voice', name: 'Voice & Tone', subtitle: '', filled: false },
];

export function BrandSetupSidebarExample() {
  return (
    <div style={{ padding: 24, background: '#f7f4ec', minHeight: '100vh' }}>
      <BrandSetupSidebar
        brandName="Raqm"
        sections={sections}
        logoLetter="R"
        colors={{ c1: '#16140e', c2: '#e9e6dc' }}
      />
    </div>
  );
}
