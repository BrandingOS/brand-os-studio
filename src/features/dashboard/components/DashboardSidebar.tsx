import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Palette,
  Image,
  Settings,
  Users,
  BarChart3,
  Folder,
  Star,
  Archive
} from 'lucide-react';

const mainNavItems = [
  {
    title: "Home",
    url: "/dashboard",
    icon: LayoutDashboard,
    description: "Dashboard overview"
  },
  {
    title: "My Brands",
    url: "/dashboard/brands",
    icon: Building2,
    description: "Manage your brands"
  },
  {
    title: "Activity",
    url: "/dashboard/activity",
    icon: BarChart3,
    description: "Recent activity"
  },
  {
    title: "Templates",
    url: "/dashboard/templates",
    icon: Folder,
    description: "Design templates"
  }
];

const adminItems = [
  {
    title: "All Brands",
    url: "/dashboard/admin/brands",
    icon: Users,
    description: "Manage all user brands"
  },
  {
    title: "Analytics",
    url: "/dashboard/admin/analytics",
    icon: BarChart3,
    description: "System analytics"
  }
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar className="border-r transition-all duration-200" collapsible="icon">
      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink to={item.url} className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <div className="flex flex-col">
                          <span className="text-sm">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Tools section removed - will be in brand workspace */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Section */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Administration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings at Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/settings/account" className={`${getNavClass('/settings/account')} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}>
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Settings</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}