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
  LayoutTemplate,
  Wand2,
  CalendarDays,
  FolderTree,
  Share2,
} from 'lucide-react';

/**
 * Brand-scope navigation — seven sections.
 *
 * Per docs/ux-redesign/ARCHITECTURE.md §3 (revised 2026-04):
 *   Overview · Identity · Templates · Design · Content · Folders · Share
 *
 * Sub-navigation within each section is done as in-page tabs (via
 * ?tab= search params), not expanded sidebar groups — keeps the
 * sidebar scannable as the feature surface grows.
 *
 * Fullscreen tools (AI Design, Bento, Brand Board, Social Media editor,
 * Variant Studio, Analytics, Approvals) are reached from inside the
 * relevant section pages and via direct URLs; they don't have their own
 * sidebar entries.
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
      "/b/:slug/edit",
    ],
  },
  {
    title: "Templates",
    url: "/b/:slug/templates",
    icon: LayoutTemplate,
    matchPaths: [
      "/b/:slug/templates",
      "/dashboard/brand/:slug/templates",
      "/b/:slug/assets",
      "/dashboard/brand/:slug/assets",
      "/b/:slug/kit",
      "/dashboard/brand/:slug/kit",
      "/b/:slug/brandkit",
      "/dashboard/brand/:slug/brandkit",
      "/b/:slug/brand-board",
      "/dashboard/brand/:slug/brand-board",
      "/b/:slug/bento",
      "/dashboard/brand/:slug/bento",
    ],
  },
  {
    title: "Design",
    url: "/b/:slug/design",
    icon: Wand2,
    matchPaths: [
      "/b/:slug/design",
      "/dashboard/brand/:slug/design",
      "/b/:slug/ai-design",
      "/dashboard/brand/:slug/ai-design",
      "/b/:slug/design-ai",
      "/dashboard/brand/:slug/design-ai",
    ],
  },
  {
    title: "Content",
    url: "/b/:slug/content",
    icon: CalendarDays,
    matchPaths: [
      "/b/:slug/content",
      "/dashboard/brand/:slug/content",
      "/b/:slug/social-media",
      "/dashboard/brand/:slug/social-media",
    ],
  },
  {
    title: "Folders",
    url: "/b/:slug/folders",
    icon: FolderTree,
    matchPaths: [
      "/b/:slug/folders",
      "/dashboard/brand/:slug/folders",
      "/dashboard/brand/:slug/dam",
      "/b/:slug/dam",
    ],
  },
  {
    title: "Share",
    url: "/b/:slug/share",
    icon: Share2,
    matchPaths: [
      "/b/:slug/share",
      "/dashboard/brand/:slug/share",
      "/b/:slug/guidelines",
      "/dashboard/brand/:slug/guidelines",
      "/dashboard/brand/:slug/logo-presentation",
      "/b/:slug/logo-presentation",
      "/dashboard/brand/:slug/brand-guides",
      "/b/:slug/brand-guides",
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
