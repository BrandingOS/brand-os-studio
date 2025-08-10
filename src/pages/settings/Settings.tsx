const Settings = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Placeholder content - will be implemented in future phases */}
        <div className="space-y-6">
          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-4">Account Settings</h3>
            <p className="text-sm text-muted-foreground">
              Account management features will be implemented here.
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-4">Preferences</h3>
            <p className="text-sm text-muted-foreground">
              User preferences and configuration options.
            </p>
          </div>

          <div className="p-6 border border-border rounded-lg bg-card">
            <h3 className="font-semibold mb-4">Billing</h3>
            <p className="text-sm text-muted-foreground">
              Subscription and billing management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;