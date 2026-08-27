# BrandingOS Design System

## Overview

The BrandingOS Design System provides a unified set of tokens, components, and patterns for building consistent UI across the entire platform. Import from `@/shared/design-system`.

## Tokens

### Typography
```tsx
import { typography } from '@/shared/design-system';

// Fonts: typography.fonts.display | body | mono
// Sizes: xs(12px) | sm(14px) | base(16px) | lg(18px) | xl(20px) | 2xl(24px) | 3xl(30px) | 4xl(36px) | 5xl(48px) | 6xl(60px)
// Weights: normal(400) | medium(500) | semibold(600) | bold(700)
```

### Spacing (4px base)
```
0=0  0.5=2px  1=4px  1.5=6px  2=8px  3=12px  4=16px  5=20px  6=24px  8=32px  10=40px  12=48px  16=64px  20=80px  24=96px
```

### Elevation
```
0=none  1=shadow-sm  2=shadow-md  3=shadow-lg  4=shadow-xl  5=shadow-2xl  elegant  glow
```

## Components

### Typography
```tsx
<Heading level="h1">Page Title</Heading>
<Heading level="h3">Section Title</Heading>
<Text size="sm" variant="muted">Helper text</Text>
<Label required>Field Label</Label>
<Caption variant="danger">Error message</Caption>

<PageHeader title="Page Title" description="Page description" actions={<Button>Action</Button>} />
<SectionTitle title="Section" description="Section description" action={<Button size="sm">View All</Button>} />
```

### Layout
```tsx
<Page maxWidth="xl">...</Page>
<Container size="lg" padded>...</Container>
<Stack gap={4} align="center">...</Stack>
<Cluster gap={3} justify="between">...</Cluster>
<Grid cols={3} gap={4}>...</Grid>
<Divider spacing="md" />
<Spacer size={8} />
<Center maxWidth="sm">...</Center>
```

### Cards
```tsx
<DSCard variant="default | elevated | outlined | interactive | feature | glass" padding="none | sm | md | lg">
  <CardHeader title="Title" description="Description" icon={<Icon />} action={<Button />} />
  ...content...
</DSCard>

<StatCard label="Total Users" value="1,234" change="+12%" changeType="positive" icon={<Users />} />
<EmptyState icon={<Inbox />} title="No items" description="Get started by creating one" action={<Button>Create</Button>} />
<FeatureCard title="Feature" description="Description" icon={<Star />} gradient="linear-gradient(...)" />
```

### Forms
```tsx
<FormField label="Email" htmlFor="email" required error="Invalid email" help="We'll never share your email">
  <TextInput id="email" error={!!error} icon={<Mail />} />
</FormField>

<FormField label="Description">
  <TextArea rows={4} />
</FormField>

<FormField label="Country">
  <SelectField options={[{ value: 'us', label: 'United States' }]} placeholder="Choose..." />
</FormField>

<ChipSelector options={['Bold', 'Minimal', 'Playful']} selected={selected} onChange={setSelected} max={3} />
```

### Feedback
```tsx
<Spinner size="sm | md | lg" />
<PageLoader text="Loading brands..." />

<Skeleton variant="text | circular | rectangular" width="60%" />
<CardSkeleton />
<GridSkeleton count={6} cols={3} />

<ProgressBar value={65} showValue label="Upload progress" />
<StepIndicator steps={[{ id: '1', label: 'Basics', status: 'completed' }, ...]} onStepClick={goTo} />

<DSBadge variant="default | secondary | success | warning | danger | outline">New</DSBadge>
<Alert type="info | success | warning | error" title="Title" icon={<Info />}>Alert content</Alert>
```

## Layout Shells

### DashboardShell
For all dashboard pages. Includes sidebar + topbar.
```tsx
import { DashboardShell } from '@/shared/layouts';

function MyPage() {
  return (
    <DashboardShell maxWidth="xl">
      <PageHeader title="My Page" />
      ...content...
    </DashboardShell>
  );
}
```

### EditorShell
For all editor experiences. Three view modes.
```tsx
import { UnifiedEditorShell, EditorTopBar, EditorBottomBar } from '@/shared/layouts';

<UnifiedEditorShell
  viewMode="fixed | slides | freeform"
  topbar={<EditorTopBar left={...} center={...} right={...} />}
  leftPanel={<ToolPanel />}
  rightPanel={<PropertiesPanel />}
  bottombar={<EditorBottomBar left={...} right={...} />}
>
  <Canvas />
</UnifiedEditorShell>
```

### OnboardingShell
For focused onboarding flows.
```tsx
import { OnboardingShell } from '@/shared/layouts';

<OnboardingShell currentStep={2} totalSteps={5} footer={<NavigationButtons />}>
  <StepContent />
</OnboardingShell>
```

### SettingsShell
For settings/management pages.
```tsx
import { SettingsShell } from '@/shared/layouts';

<SettingsShell title="Account" description="Manage your account settings">
  <SettingsForm />
</SettingsShell>
```

## Color Tokens (CSS Variables)
```css
--background     /* Page background */
--foreground     /* Primary text */
--primary        /* Brand primary (deep gray) */
--secondary      /* Subtle backgrounds */
--muted          /* Muted backgrounds */
--accent         /* Accent highlights */
--destructive    /* Error/danger states */
--border         /* Borders */
--accent-pop     /* Orange accent #F36123 */
```

## Naming Conventions
- Design system components use `DS` prefix when conflicting with shadcn (DSCard, DSBadge)
- Layout components are in `@/shared/layouts`
- Design system components are in `@/shared/design-system`
- UI primitives (shadcn) remain at `@/components/ui`
