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
  Settings,
  PenTool,
  Briefcase,
  BookOpen,
  Share2,
  Sparkles,
} from 'lucide-react';

/**
 * Brand-scope navigation — canonical five sections + Brand Kit.
 *
 * Designed per docs/ux-redesign/ARCHITECTURE.md §3:
 *   Overview · Identity · Assets · Guidelines · Share
 * Plus Brand Kit as a unified brand system hub.
 *
 * Fullscreen tools (AI Design, Design with AI, Bento) are accessible from
 * the Overview page and via direct URL, but don't appear in the sidebar
 * to keep the IA focused.
 */
interface BrandNavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  matchPaths: string[];
  exact?: boolean;
}

const brandNavItems: BrandNavItem[] = [
  {
    title: "Overview",
    url: "/b/:slug",
    icon: LayoutDashboard,
    matchPaths: ["/dashboard/brand/:slug"],
    exact: true,
  },
  {
    title: "Identity",
    url: "/b/:slug/identity",
    icon: PenTool,
    matchPaths: [
      "/b/:slug/identity",
      "/dashboard/brand/:slug/identity",
      "/dashboard/brand/:slug/edit",
    ],
  },
  {
    title: "Brand Kit",
    url: "/b/:slug/kit",
    icon: Sparkles,
    matchPaths: [
      "/b/:slug/kit",
      "/b/:slug/brandkit",
      "/dashboard/brand/:slug/kit",
      "/dashboard/brand/:slug/brandkit",
    ],
  },
  {
    title: "Assets",
    url: "/b/:slug/assets",
    icon: Briefcase,
    matchPaths: [
      "/b/:slug/assets",
      "/dashboard/brand/:slug/assets",
      "/dashboard/brand/:slug/folders",
      "/dashboard/brand/:slug/dam",
      "/dashboard/brand/:slug/social-media",
      "/dashboard/brand/:slug/presentations",
    ],
  },
  {
    title: "Guidelines",
    url: "/b/:slug/guidelines",
    icon: BookOpen,
    matchPaths: [
      "/b/:slug/guidelines",
      "/dashboard/brand/:slug/guidelines",
      "/dashboard/brand/:slug/brand-guides",
    ],
  },
  {
    title: "Share",
    url: "/b/:slug/share",
    icon: Share2,
    matchPaths: [
      "/b/:slug/share",
      "/dashboard/brand/:slug/share",
      "/dashboard/brand/:slug/logo-presentation",
    ],
  },
];

export function BrandSidebar() {
  const { state } = useSidebar();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const buildUrl = (template: string) => template.replace(':slug', slug || '');

  const isActive = (item: BrandNavItem) => {
    const url = buildUrl(item.url);
    if (item.exact) {
      return location.pathname === url
        || item.matchPaths.some((m) => location.pathname === buildUrl(m));
    }
    return location.pathname === url
      || location.pathname.startsWith(`${url}/`)
      || item.matchPaths.some((m) => {
        const built = buildUrl(m);
        return location.pathname === built || location.pathname.startsWith(`${built}/`);
      });
  };

  const getNavClass = (item: BrandNavItem) =>
    isActive(item)
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  return (
    <Sidebar className="border-r transition-all duration-200" collapsible="icon">
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Brand
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {brandNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11">
                    <NavLink
                      to={buildUrl(item.url)}
                      className={`${getNavClass(item)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
                      end={item.exact}
                    >
                      <item.icon className="shrink-0 h-5 w-5" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Brand Settings at Bottom */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={buildUrl('/b/:slug/settings')}
                    className="hover:bg-muted/50 text-muted-foreground hover:text-foreground flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-sm">Brand Settings</span>}
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
