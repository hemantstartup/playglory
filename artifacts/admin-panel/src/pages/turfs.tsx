import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useAdminListTurfs, 
  getAdminListTurfsQueryKey,
  useAdminVerifyTurf
} from "@workspace/api-client-react";
import { MapPin, CheckCircle, XCircle, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export default function Turfs() {
  const [status, setStatus] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = {
    ...(status !== "all" ? { status } : {}),
  };

  const { data: turfs, isLoading } = useAdminListTurfs(queryParams, {
    query: {
      queryKey: getAdminListTurfsQueryKey(queryParams),
    }
  });

  const verifyTurf = useAdminVerifyTurf();
  const [notes, setNotes] = useState("");

  const handleVerify = (turfId: number, newStatus: "verified" | "rejected") => {
    verifyTurf.mutate(
      { turfId, data: { status: newStatus, notes } },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Turf has been ${newStatus}.`,
          });
          setNotes("");
          queryClient.invalidateQueries({ queryKey: getAdminListTurfsQueryKey(queryParams) });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update turf verification status.",
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
          <h1 className="text-3xl font-bold tracking-tight">Turf Verifications</h1>
          <p className="text-muted-foreground mt-1">Review and approve sports facilities.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-xl border border-border">
        <div className="w-full sm:w-64">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Turfs</SelectItem>
              <SelectItem value="pending">Pending Verification</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Turf Info</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !turfs || turfs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No turfs found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              turfs.map((turf) => (
                <TableRow key={turf.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{turf.name}</span>
                      <span className="text-xs text-muted-foreground">₹{turf.pricePerHour}/hr • {turf.sports?.join(", ")}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{turf.city}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">{turf.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{turf.ownerName}</span>
                      <span className="text-xs text-muted-foreground">ID: {turf.ownerId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {turf.verificationStatus === "verified" ? (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>
                    ) : turf.verificationStatus === "rejected" ? (
                      <Badge variant="destructive">Rejected</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Review Turf Verification</DialogTitle>
                          <DialogDescription>
                            Review the details for {turf.name} and approve or reject the listing.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-muted-foreground block mb-1">Turf Name</span>
                              <span>{turf.name}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground block mb-1">Owner</span>
                              <span>{turf.ownerName} (ID: {turf.ownerId})</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground block mb-1">Location</span>
                              <span>{turf.address}, {turf.city}</span>
                            </div>
                            <div>
                              <span className="font-medium text-muted-foreground block mb-1">Pricing</span>
                              <span>₹{turf.pricePerHour}/hr</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <span className="font-medium text-sm text-muted-foreground">Verification Notes</span>
                            <Textarea 
                              placeholder="Add reason for rejection or approval notes..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter className="flex-col sm:flex-row gap-2">
                          <Button 
                            variant="destructive" 
                            className="w-full sm:w-auto"
                            onClick={() => handleVerify(turf.id, "rejected")}
                            disabled={verifyTurf.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Reject
                          </Button>
                          <Button 
                            variant="default" 
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleVerify(turf.id, "verified")}
                            disabled={verifyTurf.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
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
