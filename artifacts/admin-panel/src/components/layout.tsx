import { useLocation, Link } from "wouter";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { LayoutDashboard, Users, MapPin, Trophy, LogOut, Calendar, UsersRound, Rss, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const navGroups = [
    {
      label: "Overview",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
    {
      label: "Users",
      items: [
        { href: "/users", label: "Players & Owners", icon: Users },
        { href: "/teams", label: "Teams", icon: UsersRound },
      ],
    },
    {
      label: "Turfs & Matches",
      items: [
        { href: "/turfs", label: "Turfs", icon: MapPin },
        { href: "/matches", label: "Matches", icon: Trophy },
        { href: "/bookings", label: "Bookings", icon: Calendar },
      ],
    },
    {
      label: "Content",
      items: [
        { href: "/feed", label: "Feed Moderation", icon: Rss },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("glory_token");
    setLocation("/login");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg tracking-tight">GLORY SPORTS</span>
          </div>
        </div>

        <nav className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="text-xs font-semibold text-muted-foreground mb-1.5 px-2 uppercase tracking-wider">
                {group.label}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold shrink-0">
              {user?.name?.charAt(0) || "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium leading-none truncate">{user?.name || "Admin"}</span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="h-14 md:hidden border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight">GLORY</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
