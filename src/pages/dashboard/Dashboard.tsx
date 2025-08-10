const Dashboard = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your brand projects.
          </p>
        </div>

        {/* Placeholder content - will be implemented in future phases */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Recent Designs</h3>
            <p className="text-sm text-muted-foreground">
              Your latest design projects will appear here.
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Brand Assets</h3>
            <p className="text-sm text-muted-foreground">
              Quick access to your brand assets and templates.
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track your brand consistency and usage metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;