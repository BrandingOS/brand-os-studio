import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Palette, 
  Image, 
  Layers, 
  Settings, 
  Plus,
  ChevronDown
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/workspace/dashboard',
    icon: Home,
  },
  {
    title: 'Brands',
    url: '/workspace/brands',
    icon: Palette,
  },
  {
    title: 'Design Editor',
    url: '/workspace/editor',
    icon: Layers,
  },
  {
    title: 'Asset Library',
    url: '/workspace/assets',
    icon: Image,
  },
  {
    title: 'Settings',
    url: '/workspace/settings',
    icon: Settings,
  },
];

export const WorkspaceSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Brand Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BO</span>
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-lg">Brand OS</span>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {!isCollapsed && (
          <div className="p-4 border-b border-border">
            <Button className="w-full justify-start" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Design
            </Button>
          </div>
        )}

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url || 
                  (item.url !== '/workspace/dashboard' && location.pathname.startsWith(item.url));
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                          isActive 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Projects */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center justify-between w-full">
                <span>Recent Projects</span>
                <ChevronDown className="h-4 w-4" />
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No recent projects
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};