import { floatingTiles } from "@/data/landing";

export const FloatingTiles = () => {
  return (
    <>
      {floatingTiles.map((tile) => {
        const Icon = tile.icon;
        const positionClasses = Object.entries(tile.position)
          .map(([key, value]) => `${key}-[${value}]`)
          .join(" ");

        return (
          <div
            key={tile.id}
            className={`pointer-events-none absolute hidden md:block animate-float ${positionClasses}`}
            style={{ animationDelay: tile.animationDelay }}
          >
            <div className="glass-surface rounded-xl px-4 py-3 shadow-elegant flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="text-xs">{tile.label}</span>
            </div>
          </div>
        );
      })}
    </>
  );
};