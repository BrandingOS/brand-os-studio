const BrandManager = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Brand Manager</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your brand systems.
          </p>
        </div>

        {/* Placeholder content - will be implemented in future phases */}
        <div className="space-y-6">
          <div className="p-8 border-2 border-dashed border-border rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2">No brands created yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first brand to get started with Brand OS.
            </p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Create Brand
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandManager;