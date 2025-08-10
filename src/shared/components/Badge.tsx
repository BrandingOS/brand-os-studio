import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export const Badge = ({ children, className, variant = "default" }: BadgeProps) => {
  const baseClasses = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium";
  
  const variantClasses = {
    default: "border-border bg-secondary text-muted-foreground",
    secondary: "border-border bg-muted text-muted-foreground",
    outline: "border-border bg-transparent text-foreground",
    destructive: "border-destructive bg-destructive text-destructive-foreground"
  };

  return (
    <span className={cn(baseClasses, variantClasses[variant], className)}>
      {children}
    </span>
  );
};