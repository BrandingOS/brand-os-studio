import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="grid lg:grid-cols-2 h-screen">
        {/* Left side - Brand imagery */}
        <div className="hidden lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-24 bg-gradient-to-br from-primary/10 to-secondary/10">
          <div className="max-w-md mx-auto text-center">
            <h1 className="text-4xl font-display font-bold text-foreground mb-4">
              Welcome to Brand OS
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Create, manage, and scale your brand with our all-in-one platform.
            </p>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Unified brand management</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>AI-powered design tools</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Real-time collaboration</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Export to any format</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="flex flex-col justify-center px-6 py-12 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;