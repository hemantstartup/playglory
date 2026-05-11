import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { Users, Trophy, MapPin, Calendar, AlertTriangle, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: dashboard, isLoading } = useGetAdminDashboard({
    query: {
      queryKey: getGetAdminDashboardQueryKey()
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground mt-1">Real-time metrics and alerts.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="text-center p-12 text-muted-foreground">Failed to load dashboard data.</div>;
  }

  const statCards = [
    {
      title: "Total Users",
      value: dashboard.totalUsers,
      icon: Users,
      description: `${dashboard.totalPlayers || 0} Players, ${dashboard.totalTurfOwners || 0} Owners`,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Total Matches",
      value: dashboard.totalMatches,
      icon: Trophy,
      description: `${dashboard.verifiedMatches || 0} Verified Matches`,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Total Bookings",
      value: dashboard.totalBookings,
      icon: Calendar,
      description: "Platform wide bookings",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "Registered Turfs",
      value: dashboard.totalTurfs,
      icon: MapPin,
      description: "Active sports facilities",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">Real-time metrics and system alerts.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Action Required */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Action Required
            </CardTitle>
            <CardDescription>Items needing admin attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Suspicious Matches</div>
                  <div className="text-xs text-muted-foreground">Flagged by system</div>
                </div>
              </div>
              <Badge variant="destructive" className="font-mono text-base">
                {dashboard.suspiciousMatches || 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-md">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Pending Turfs</div>
                  <div className="text-xs text-muted-foreground">Awaiting verification</div>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono text-base bg-blue-500/20 text-blue-400 hover:bg-blue-500/20">
                {dashboard.pendingTurfs || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Business Metrics */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Business Health
            </CardTitle>
            <CardDescription>Platform financial metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-6 bg-secondary/50 rounded-lg border border-border/50 h-full">
              <div className="text-sm font-medium text-muted-foreground mb-2">Estimated Monthly Revenue</div>
              <div className="text-4xl font-bold text-foreground">
                ₹{(dashboard.revenueEstimate || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-500 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>+12.5% from last month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 col-span-1 lg:col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.recentActivity && dashboard.recentActivity.length > 0 ? (
                dashboard.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3 text-sm">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p className="text-foreground">{activity.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
