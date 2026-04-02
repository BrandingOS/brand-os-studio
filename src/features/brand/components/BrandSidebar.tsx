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
  Edit,
  FileText,
  Briefcase,
  Settings,
  Image,
  BookOpen,
  CircleUser,
  Monitor,
  CreditCard,
  RectangleHorizontal,
  Square,
  Smartphone,
  Presentation,
  Play,
  QrCode,
  PenTool,
  Palette,
  Lock,
  Download,
} from 'lucide-react';

const brandNavItems = [
  {
    title: "Overview",
    url: "/dashboard/brand/:slug",
    icon: LayoutDashboard,
    disabled: false,
  },
  {
    title: "Edit Brand",
    url: "/dashboard/brand/:slug/edit",
    icon: Edit,
    disabled: false,
  },
  {
    title: "Guidelines",
    url: "/dashboard/brand/:slug/guidelines",
    icon: FileText,
    disabled: false,
  },
  {
    title: "Brand Kit",
    url: "/dashboard/brand/:slug/brandkit",
    icon: Briefcase,
    disabled: false,
  },
];

const brandKitItems = [
  { title: "Settings", url: "/dashboard/brand/:slug/brandkit/settings", icon: Settings, disabled: false },
  { title: "Color System", url: "/dashboard/brand/:slug/brandkit/color-system", icon: Palette, disabled: false },
  { title: "Logo Files", url: "/dashboard/brand/:slug/brandkit/logo-files", icon: Image, disabled: false },
  { title: "Brand Guides", url: "/dashboard/brand/:slug/brandkit/brand-guides", icon: BookOpen, disabled: false },
  { title: "Profile Icons", url: "/dashboard/brand/:slug/brandkit/profile-icons", icon: CircleUser, disabled: false },
  { title: "Mockup Designs", url: "/dashboard/brand/:slug/brandkit/mockups", icon: Monitor, disabled: false },
  { title: "Business Cards", url: "/dashboard/brand/:slug/brandkit/business-cards", icon: CreditCard, disabled: false },
  { title: "Facebook Covers", url: "/dashboard/brand/:slug/brandkit/facebook-covers", icon: RectangleHorizontal, disabled: false },
  { title: "Instagram Posts", url: "/dashboard/brand/:slug/brandkit/instagram-posts", icon: Square, disabled: false },
  { title: "Instagram Stories", url: "/dashboard/brand/:slug/brandkit/instagram-stories", icon: Smartphone, disabled: false },
  { title: "Presentations", url: "/dashboard/brand/:slug/brandkit/presentations", icon: Presentation, disabled: false },
  { title: "Animations", url: "/dashboard/brand/:slug/brandkit/animations", icon: Play, disabled: false },
  { title: "QR Code", url: "/dashboard/brand/:slug/brandkit/qr-code", icon: QrCode, disabled: false },
  { title: "Invoices", url: "/dashboard/brand/:slug/brandkit/invoices", icon: FileText, disabled: false },
  { title: "Design Tool", url: "/dashboard/brand/:slug/brandkit/design-tool", icon: PenTool, disabled: false },
  { title: "Download Fonts", url: "/dashboard/brand/:slug/brandkit/download-fonts", icon: Download, disabled: true },
];

export function BrandSidebar() {
  const { state } = useSidebar();
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const buildUrl = (template: string) => {
    return template.replace(':slug', slug || '');
  };

  const isActive = (urlTemplate: string) => {
    const url = buildUrl(urlTemplate);
    if (url === `/dashboard/brand/${slug}`) {
      return location.pathname === url;
    }
    if (url === `/dashboard/brand/${slug}/brandkit`) {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  const getNavClass = (urlTemplate: string) => {
    return isActive(urlTemplate)
      ? "bg-primary/10 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";
  };

  const isBrandKitActive = location.pathname.includes('/brandkit');

  const renderNavItem = (item: typeof brandNavItems[0], compact = false) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild className={compact ? "h-9" : "h-11"}>
        {item.disabled ? (
          <span className="opacity-40 cursor-not-allowed pointer-events-none flex items-center gap-3 px-3 py-2 rounded-lg">
            <item.icon className={`shrink-0 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {!collapsed && (
              <span className="text-sm flex items-center gap-2">
                {item.title}
                <Lock className="h-3 w-3 opacity-50" />
              </span>
            )}
          </span>
        ) : (
          <NavLink
            to={buildUrl(item.url)}
            className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
            end={item.url === "/dashboard/brand/:slug" || item.url === "/dashboard/brand/:slug/brandkit"}
          >
            <item.icon className={`shrink-0 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
            {!collapsed && <span className="text-sm">{item.title}</span>}
          </NavLink>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r transition-all duration-200" collapsible="icon">
      <SidebarContent className="px-2 py-4">
        {/* Main Brand Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Brand
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {brandNavItems.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Brand Kit Sub-Navigation (always visible, expanded when in brand kit) */}
        {isBrandKitActive && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Brand Kit</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {brandKitItems.map((item) => renderNavItem(item, true))}
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
                  <NavLink
                    to={buildUrl('/dashboard/brand/:slug/brandkit/settings')}
                    className={`${getNavClass('/dashboard/brand/:slug/brandkit/settings')} flex items-center gap-3 px-3 py-2 rounded-lg transition-all`}
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
