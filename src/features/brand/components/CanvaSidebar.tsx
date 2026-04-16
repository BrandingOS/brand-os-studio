import { NavLink, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  FileText, 
  FolderOpen, 
  LayoutTemplate, 
  Palette,
  Download
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CanvaSidebarProps {
  brandSlug?: string;
}

interface NavItem {
  icon: typeof Sparkles;
  label: string;
  href: string;
  tooltip: string;
}

export function CanvaSidebar({ brandSlug }: CanvaSidebarProps) {
  const location = useLocation();
  
  const navItems: NavItem[] = [
    {
      icon: Sparkles,
      label: 'Brand',
      href: `/b/${brandSlug}`,
      tooltip: 'Brand Overview'
    },
    {
      icon: FileText,
      label: 'Guidelines',
      href: `/b/${brandSlug}/guidelines/canvas`,
      tooltip: 'Brand Guidelines'
    },
    {
      icon: FolderOpen,
      label: 'Assets',
      href: `/b/${brandSlug}/kit`,
      tooltip: 'Brand Assets'
    },
    {
      icon: LayoutTemplate,
      label: 'Templates',
      href: `/dashboard/templates`,
      tooltip: 'Design Templates'
    },
    {
      icon: Palette,
      label: 'Colors',
      href: `/b/${brandSlug}/identity`,
      tooltip: 'Brand Colors'
    },
    {
      icon: Download,
      label: 'Export',
      href: `/b/${brandSlug}/guidelines`,
      tooltip: 'Export Guidelines'
    }
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <aside className="hidden sm:flex flex-col items-center bg-[var(--chrome-bg)] border-r border-[var(--sidebar-border)] 
      w-[48px] md:w-[56px] lg:w-[64px] xl:w-[72px] shrink-0 sticky top-0 h-[calc(100vh-56px)]">
      <TooltipProvider>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.href}
                  className={`
                    flex flex-col items-center gap-1 py-3 px-2 w-full
                    transition-all duration-150 ease-out
                    ${active 
                      ? 'sidebar-item-active' 
                      : 'sidebar-item-hover text-muted-foreground'
                    }
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  `}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="w-6 h-6" style={{ opacity: active ? 1 : 0.8 }} />
                  <span className="text-[10px] md:text-[11px] font-medium leading-tight text-center">
                    {item.label}
                  </span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </aside>
  );
}
