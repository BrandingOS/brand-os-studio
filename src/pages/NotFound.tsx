import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // 404 is a normal navigation event, not an error.

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md px-6">
        <h1 className="text-8xl font-bold tracking-tight text-muted-foreground/30">404</h1>
        <h2 className="mt-4 text-2xl font-semibold">Page not found</h2>
        <p className="mt-2 text-muted-foreground">
          The page <code className="px-1.5 py-0.5 rounded bg-muted text-sm">{location.pathname}</code> doesn't exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="default" onClick={() => navigate("/dashboard")}>
            Go to Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="ghost" onClick={() => navigate("/")}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
