import { DashboardLayout } from "../components/DashboardLayout";

export const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold">Welcome to Brand OS</h2>
          <p className="text-muted-foreground">Manage your brand system from here.</p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="card-soft p-6 rounded-xl">
            <h3 className="font-semibold mb-2">Brand Guidelines</h3>
            <p className="text-sm text-muted-foreground">Create and manage your brand guidelines</p>
          </div>
          
          <div className="card-soft p-6 rounded-xl">
            <h3 className="font-semibold mb-2">Design Studio</h3>
            <p className="text-sm text-muted-foreground">Create on-brand designs</p>
          </div>
          
          <div className="card-soft p-6 rounded-xl">
            <h3 className="font-semibold mb-2">Asset Library</h3>
            <p className="text-sm text-muted-foreground">Manage your brand assets</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};