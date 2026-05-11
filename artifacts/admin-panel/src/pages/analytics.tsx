import { useGetAdminDashboard, getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import { TrendingUp, Users, MapPin, Calendar, Trophy, DollarSign, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value.toLocaleString()}</span>
      </div>
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub, icon: Icon, color, bgColor }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; bgColor: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`p-2 rounded-md ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: d, isLoading } = useGetAdminDashboard({
    query: { queryKey: getGetAdminDashboardQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground mt-1">Platform-wide performance metrics.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  if (!d) return <div className="text-center p-12 text-muted-foreground">No data available.</div>;

  const verifyPct = d.totalMatches > 0 ? Math.round(((d.verifiedMatches ?? 0) / d.totalMatches) * 100) : 0;
  const pendingTurfPct = d.totalTurfs > 0 ? Math.round(((d.pendingTurfs ?? 0) / d.totalTurfs) * 100) : 0;
  const avgRevenuePerBooking = d.totalBookings > 0
    ? Math.round((d.revenueEstimate ?? 0) / d.totalBookings)
    : 0;
  const playerToOwnerRatio = (d.totalTurfOwners ?? 0) > 0
    ? ((d.totalPlayers ?? 0) / (d.totalTurfOwners ?? 1)).toFixed(1)
    : "—";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1">Platform-wide performance metrics and health indicators.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatBlock
          label="Total Platform Revenue"
          value={`₹${(d.revenueEstimate ?? 0).toLocaleString("en-IN")}`}
          sub={`₹${avgRevenuePerBooking.toLocaleString("en-IN")} avg per booking`}
          icon={DollarSign}
          color="text-emerald-500"
          bgColor="bg-emerald-500/10"
        />
        <StatBlock
          label="Total Users"
          value={(d.totalUsers ?? 0).toLocaleString()}
          sub={`${d.totalPlayers ?? 0} players · ${d.totalTurfOwners ?? 0} owners`}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-500/10"
        />
        <StatBlock
          label="Total Matches"
          value={(d.totalMatches ?? 0).toLocaleString()}
          sub={`${d.verifiedMatches ?? 0} verified (${verifyPct}%)`}
          icon={Trophy}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatBlock
          label="Total Bookings"
          value={(d.totalBookings ?? 0).toLocaleString()}
          sub={`${(d as any).confirmedBookings ?? 0} confirmed`}
          icon={Calendar}
          color="text-purple-500"
          bgColor="bg-purple-500/10"
        />
        <StatBlock
          label="Registered Turfs"
          value={(d.totalTurfs ?? 0).toLocaleString()}
          sub={`${d.pendingTurfs ?? 0} awaiting verification`}
          icon={MapPin}
          color="text-amber-500"
          bgColor="bg-amber-500/10"
        />
        <StatBlock
          label="Teams Registered"
          value={((d as any).totalTeams ?? 0).toLocaleString()}
          sub={`${playerToOwnerRatio}x players per owner`}
          icon={Users}
          color="text-pink-500"
          bgColor="bg-pink-500/10"
        />
      </div>

      {/* Platform Health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Platform Health
            </CardTitle>
            <CardDescription>Key ratios and completion rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <MetricBar
              label="Match Verification Rate"
              value={d.verifiedMatches ?? 0}
              max={d.totalMatches ?? 1}
              color="bg-emerald-500"
            />
            <MetricBar
              label="Turf Approval Rate"
              value={(d.totalTurfs ?? 0) - (d.pendingTurfs ?? 0)}
              max={d.totalTurfs ?? 1}
              color="bg-blue-500"
            />
            <MetricBar
              label="Booking Fill Rate"
              value={(d as any).confirmedBookings ?? 0}
              max={d.totalBookings ?? 1}
              color="bg-primary"
            />
            <MetricBar
              label="Active Users (players)"
              value={d.totalPlayers ?? 0}
              max={d.totalUsers ?? 1}
              color="bg-purple-500"
            />
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Platform Alerts
            </CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div>
                <div className="text-sm font-semibold text-amber-400">Pending Turf Approvals</div>
                <div className="text-xs text-muted-foreground">Turfs waiting for admin review</div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-base font-bold px-3">
                {d.pendingTurfs ?? 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <div>
                <div className="text-sm font-semibold text-destructive">Suspicious Matches</div>
                <div className="text-xs text-muted-foreground">Flagged for unusual score patterns</div>
              </div>
              <Badge variant="destructive" className="text-base font-bold px-3">
                {d.suspiciousMatches ?? 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div>
                <div className="text-sm font-semibold text-blue-400">Total Teams</div>
                <div className="text-xs text-muted-foreground">Registered cricket teams</div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-base font-bold px-3">
                {(d as any).totalTeams ?? 0}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div>
                <div className="text-sm font-semibold text-emerald-400">Confirmed Revenue</div>
                <div className="text-xs text-muted-foreground">From confirmed bookings</div>
              </div>
              <span className="text-base font-bold text-emerald-400">
                ₹{(d.revenueEstimate ?? 0).toLocaleString("en-IN")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Platform Activity
          </CardTitle>
          <CardDescription>Latest actions across users, matches, and bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {d.recentActivity && d.recentActivity.length > 0 ? (
              d.recentActivity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{a.description}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {a.type}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">No recent activity</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
