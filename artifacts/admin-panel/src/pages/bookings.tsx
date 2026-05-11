import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminListBookings,
  getAdminListBookingsQueryKey,
  useAdminCancelBooking,
} from "@workspace/api-client-react";
import { Calendar, XCircle, DollarSign, Clock, CheckCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

export default function Bookings() {
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = {
    ...(status !== "all" ? { status } : {}),
    page,
    limit: 50,
  };

  const { data, isLoading } = useAdminListBookings(queryParams, {
    query: { queryKey: getAdminListBookingsQueryKey(queryParams) },
  });

  const cancelBooking = useAdminCancelBooking();

  const handleCancel = (bookingId: number) => {
    cancelBooking.mutate(
      { bookingId },
      {
        onSuccess: () => {
          toast({ title: "Booking cancelled", description: "The booking has been cancelled." });
          queryClient.invalidateQueries({ queryKey: getAdminListBookingsQueryKey(queryParams) });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not cancel booking.", variant: "destructive" });
        },
      }
    );
  };

  const bookings = (data?.bookings ?? []).filter((b) =>
    !search ||
    b.turfName?.toLowerCase().includes(search.toLowerCase()) ||
    b.userName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRevenue = data?.totalRevenue ?? 0;
  const confirmedCount = (data?.bookings ?? []).filter(b => b.status === "confirmed").length;
  const cancelledCount = (data?.bookings ?? []).filter(b => b.status === "cancelled").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Booking Management</h1>
        <p className="text-muted-foreground mt-1">View and manage all platform bookings in real-time.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <div className="p-2 rounded-md bg-primary/10"><Calendar className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "—" : data?.total ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10"><DollarSign className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{isLoading ? "—" : totalRevenue.toLocaleString("en-IN")}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Confirmed</CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10"><CheckCircle className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{isLoading ? "—" : confirmedCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
            <div className="p-2 rounded-md bg-destructive/10"><XCircle className="h-4 w-4 text-destructive" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{isLoading ? "—" : cancelledCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by turf or user..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bookings</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Booking</TableHead>
              <TableHead>Turf</TableHead>
              <TableHead>Player</TableHead>
              <TableHead>Date & Slot</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No bookings found matching the criteria.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">#{b.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{b.turfName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{b.userName}</div>
                    <div className="text-xs text-muted-foreground">ID: {b.userId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {b.date}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {b.startTime} – {b.endTime}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-emerald-400">₹{b.totalAmount?.toLocaleString("en-IN")}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[b.status] ?? ""}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === "confirmed" ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <XCircle className="h-3 w-3 mr-1" /> Cancel
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Cancel Booking #{b.id}</DialogTitle>
                            <DialogDescription>
                              Cancel the booking for <strong>{b.userName}</strong> at <strong>{b.turfName}</strong> on {b.date} ({b.startTime}–{b.endTime})?
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Keep</Button>
                            <Button variant="destructive" onClick={() => handleCancel(b.id)} disabled={cancelBooking.isPending}>
                              Confirm Cancel
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
