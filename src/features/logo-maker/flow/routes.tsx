import { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { LogoMakerFlowLayout } from './layout';

const ModeSelectScreen = lazy(() => import('./screens/01-mode-select'));
const BriefScreen = lazy(() => import('./screens/02-brief'));
const GenerateScreen = lazy(() => import('./screens/03-generate'));
const EditorScreen = lazy(() => import('./screens/04-editor'));
const BrandKitScreen = lazy(() => import('./screens/05-brand-kit'));
const CompleteScreen = lazy(() => import('./screens/06-complete'));
const UploadScreen = lazy(() => import('./screens/upload'));

const Fallback = <div className="p-8 text-muted-foreground">Loading…</div>;
const wrap = (node: React.ReactNode) => <Suspense fallback={Fallback}>{node}</Suspense>;

// Route fragment mounted under /logo-maker/* in App.tsx.
export const logoMakerFlowRoutes = (
  <Route path="/logo-maker" element={<LogoMakerFlowLayout />}>
    <Route index element={wrap(<ModeSelectScreen />)} />
    <Route path="brief" element={wrap(<BriefScreen />)} />
    <Route path="generate" element={wrap(<GenerateScreen />)} />
    <Route path="upload" element={wrap(<UploadScreen />)} />
    <Route path="editor/:logoId" element={wrap(<EditorScreen />)} />
    <Route path="brand-kit/:logoId" element={wrap(<BrandKitScreen />)} />
    <Route path="complete/:brandId" element={wrap(<CompleteScreen />)} />
  </Route>
);
