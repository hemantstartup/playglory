import { useState } from "react";
import {
  useAdminListTeams,
  getAdminListTeamsQueryKey,
} from "@workspace/api-client-react";
import { Users, Trophy, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Teams() {
  const [search, setSearch] = useState("");

  const queryParams = { ...(search ? { search } : {}), limit: 50 };

  const { data, isLoading } = useAdminListTeams(queryParams, {
    query: { queryKey: getAdminListTeamsQueryKey(queryParams) },
  });

  const teams = data?.teams ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
        <p className="text-muted-foreground mt-1">All registered cricket teams on the platform.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teams</CardTitle>
            <div className="p-2 rounded-md bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "—" : data?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Matches</CardTitle>
            <div className="p-2 rounded-md bg-primary/10"><Trophy className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "—" : teams.reduce((s, t) => s + (t.matchCount ?? 0), 0)}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Wins</CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10"><Trophy className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{isLoading ? "—" : teams.reduce((s, t) => s + (t.winCount ?? 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by team name..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Captain</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Matches</TableHead>
              <TableHead>Wins</TableHead>
              <TableHead>Win Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => {
                const matchCount = team.matchCount ?? 0;
                const winCount = team.winCount ?? 0;
                const winRate = matchCount > 0
                  ? Math.round((winCount / matchCount) * 100)
                  : 0;
                return (
                  <TableRow key={team.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {team.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold text-sm">{team.name}</div>
                          <div className="text-xs text-muted-foreground">ID: {team.id} · {team.sport}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{team.captainName}</div>
                      <div className="text-xs text-muted-foreground">ID: {team.captainId}</div>
                    </TableCell>
                    <TableCell>
                      {team.city ? (
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {team.city}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        {team.memberCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{team.matchCount}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-emerald-500">{team.winCount}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${winRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{winRate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
