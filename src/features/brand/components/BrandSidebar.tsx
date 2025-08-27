import { NavLink, useLocation, useParams } from 'react-router-dom';
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
  Folder,
  Briefcase
} from 'lucide-react';

const brandNavItems = [
  {
    title: "Overview",
    url: "/dashboard/brand/:brandId",
    icon: LayoutDashboard,
    description: "Brand overview"
  },
  {
    title: "Brand Info",
    url: "/dashboard/brand/:brandId/info",
    icon: Building2,
    description: "Brand information"
  },
  {
    title: "Guidelines",
    url: "/dashboard/brand/:brandId/guidelines",
    icon: FileText,
    description: "Brand guidelines"
  },
  {
    title: "Assets",
    url: "/dashboard/brand/:brandId/assets", 
    icon: Image,
    description: "Brand assets"
  },
  {
    title: "Brand Kit",
    url: "/dashboard/brand/:brandId/brandkit",
    icon: Briefcase,
    description: "Brand kit tools"
  }
];

const toolsItems = [
  {
    title: "Templates",
    url: "/dashboard/brand/:brandId/templates",
    icon: Folder,
    description: "Design templates"
  },
  {
    title: "Colors",
    url: "/dashboard/brand/:brandId/colors",
    icon: Palette,
    description: "Color palette"
  }
];

export function BrandSidebar() {
  const { state } = useSidebar();
  const { brandId } = useParams<{ brandId: string }>();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const buildUrl = (template: string) => {
    return template.replace(':brandId', brandId || '');
  };

  const isActive = (urlTemplate: string) => {
    const url = buildUrl(urlTemplate);
    if (url === `/dashboard/brand/${brandId}`) {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  const getNavClass = (urlTemplate: string) => {
    return isActive(urlTemplate) 
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  return (
    <Sidebar className="border-r transition-all duration-200" collapsible="icon">
      <SidebarContent className="px-2 py-4">
        {/* Brand Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Brand
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {brandNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12">
                    <NavLink 
                      to={buildUrl(item.url)} 
                      className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
                      end={item.url === "/dashboard/brand/:brandId"}
                    >
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
              {toolsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={buildUrl(item.url)} 
                      className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings at Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to={`/dashboard/brand/${brandId}/settings`} 
                    className={`${getNavClass('/dashboard/brand/:brandId/settings')} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
                  >
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