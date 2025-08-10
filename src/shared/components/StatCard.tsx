interface StatCardProps {
  value: string;
  label: string;
  description?: string;
}

export const StatCard = ({ value, label, description }: StatCardProps) => {
  return (
    <div data-animate className="text-center">
      <div className="text-4xl font-semibold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {description && (
        <div className="text-xs text-muted-foreground/60 mt-1">
          {description}
        </div>
      )}
    </div>
  );
};