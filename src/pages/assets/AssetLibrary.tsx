const AssetLibrary = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Asset Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage your brand assets, fonts, colors, and templates.
          </p>
        </div>

        {/* Placeholder content - will be implemented in future phases */}
        <div className="grid gap-6">
          <div className="p-8 border-2 border-dashed border-border rounded-lg text-center">
            <h3 className="text-lg font-semibold mb-2">No assets uploaded yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your brand assets to get started.
            </p>
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Upload Assets
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetLibrary;