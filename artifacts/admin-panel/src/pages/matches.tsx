import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useAdminListMatches, 
  getAdminListMatchesQueryKey,
  useAdminFlagMatch
} from "@workspace/api-client-react";
import { AlertTriangle, Flag, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Matches() {
  const [filter, setFilter] = useState<string>("suspicious");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = {
    ...(filter === "suspicious" ? { suspicious: true } : {}),
  };

  const { data: matches, isLoading } = useAdminListMatches(queryParams, {
    query: {
      queryKey: getAdminListMatchesQueryKey(queryParams),
    }
  });

  const flagMatch = useAdminFlagMatch();
  const [reason, setReason] = useState("");

  const handleFlagMatch = (matchId: number, currentFlag: boolean) => {
    flagMatch.mutate(
      { matchId, data: { isSuspicious: !currentFlag, reason: !currentFlag ? reason : undefined } },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Match has been ${!currentFlag ? 'flagged as suspicious' : 'cleared'}.`,
          });
          setReason("");
          queryClient.invalidateQueries({ queryKey: getAdminListMatchesQueryKey(queryParams) });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update match status.",
            variant: "destructive"
          });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Match Monitoring</h1>
          <p className="text-muted-foreground mt-1">Review flagged matches and enforce fair play.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="w-full sm:w-64">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter matches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suspicious">Suspicious / Flagged</SelectItem>
              <SelectItem value="all">All Matches</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Match Info</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !matches || matches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No matches found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              matches.map((match) => (
                <TableRow key={match.id} className={match.isSuspicious ? "bg-destructive/5" : ""}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{new Date(match.matchDate || '').toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{match.turfName} • {match.matchType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center justify-between max-w-[200px]">
                        <span className="font-medium truncate">{match.teamAName}</span>
                        {match.teamACaptainVerified && <ShieldCheck className="h-3 w-3 text-emerald-500 ml-2" />}
                      </div>
                      <div className="text-xs text-muted-foreground">vs</div>
                      <div className="flex items-center justify-between max-w-[200px]">
                        <span className="font-medium truncate">{match.teamBName}</span>
                        {match.teamBCaptainVerified && <ShieldCheck className="h-3 w-3 text-emerald-500 ml-2" />}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col font-mono text-sm">
                      {match.status === "completed" || match.status === "verified" || match.status === "disputed" || match.status === "flagged" ? (
                        <>
                          <span>{match.teamAScore}/{match.teamAWickets}</span>
                          <span className="text-muted-foreground border-t border-border mt-1 pt-1">{match.teamBScore}/{match.teamBWickets}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-2">
                      <Badge variant="outline" className="capitalize">
                        {match.status.replace('_', ' ')}
                      </Badge>
                      {match.isSuspicious && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant={match.isSuspicious ? "outline" : "secondary"} size="sm">
                          {match.isSuspicious ? "Review Flag" : "Flag Match"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{match.isSuspicious ? 'Clear Match Flag' : 'Flag Match as Suspicious'}</DialogTitle>
                          <DialogDescription>
                            {match.isSuspicious 
                              ? `This match was flagged. Review the scores and clear the flag if it's legitimate.`
                              : `Flag this match for review if the scores appear manipulated or impossible.`}
                          </DialogDescription>
                        </DialogHeader>
                        {!match.isSuspicious && (
                          <div className="space-y-2 py-4">
                            <span className="font-medium text-sm text-muted-foreground">Reason for flagging</span>
                            <Textarea 
                              placeholder="Describe why this match score is suspicious..."
                              value={reason}
                              onChange={(e) => setReason(e.target.value)}
                            />
                          </div>
                        )}
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button 
                            variant={match.isSuspicious ? "default" : "destructive"}
                            onClick={() => handleFlagMatch(match.id, match.isSuspicious || false)}
                            disabled={flagMatch.isPending || (!match.isSuspicious && !reason)}
                          >
                            {match.isSuspicious ? "Clear Flag" : "Flag Match"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
