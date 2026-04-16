import { Outlet } from 'react-router-dom';

export function LogoMakerFlowLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
