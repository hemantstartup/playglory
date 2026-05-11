import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAdminListFeed,
  getAdminListFeedQueryKey,
  useAdminDeleteFeedPost,
} from "@workspace/api-client-react";
import { Users, Trash2, Search, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Feed() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryParams = {
    ...(activeFilter === "active" ? { active: true } : activeFilter === "inactive" ? { active: false } : {}),
  };

  const { data: posts, isLoading } = useAdminListFeed(queryParams, {
    query: { queryKey: getAdminListFeedQueryKey(queryParams) },
  });

  const deletePost = useAdminDeleteFeedPost();

  const handleDelete = (postId: number) => {
    deletePost.mutate(
      { postId },
      {
        onSuccess: () => {
          toast({ title: "Post removed", description: "The need-players post has been deactivated." });
          queryClient.invalidateQueries({ queryKey: getAdminListFeedQueryKey(queryParams) });
        },
        onError: () => {
          toast({ title: "Error", description: "Could not remove post.", variant: "destructive" });
        },
      }
    );
  };

  const filtered = ((posts as any[]) ?? []).filter((p: any) =>
    !search ||
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.city?.toLowerCase().includes(search.toLowerCase()) ||
    p.userName?.toLowerCase().includes(search.toLowerCase())
  );

  const activePosts = ((posts as any[]) ?? []).filter((p: any) => p.isActive !== false);
  const totalJoins = ((posts as any[]) ?? []).reduce((s: number, p: any) => s + (p.joinedCount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feed Moderation</h1>
        <p className="text-muted-foreground mt-1">Monitor and moderate player recruitment posts.</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
            <div className="p-2 rounded-md bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? "—" : (posts as any[])?.length ?? 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Posts</CardTitle>
            <div className="p-2 rounded-md bg-emerald-500/10"><Users className="h-4 w-4 text-emerald-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-500">{isLoading ? "—" : activePosts.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Join Requests</CardTitle>
            <div className="p-2 rounded-md bg-blue-500/10"><Users className="h-4 w-4 text-blue-500" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{isLoading ? "—" : totalJoins}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, city or poster..."
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Posts</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow>
              <TableHead>Post</TableHead>
              <TableHead>Posted By</TableHead>
              <TableHead>Location & Date</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-6 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  No posts found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((post: any) => (
                <TableRow key={post.id} className={!post.isActive ? "opacity-50" : ""}>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium text-sm line-clamp-1">{post.title}</div>
                      {post.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{post.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">#{post.id} · {post.sport}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{post.userName}</div>
                    <div className="text-xs text-muted-foreground">ID: {post.userId}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {post.city}
                    </div>
                    {post.matchDate && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Calendar className="h-3 w-3" />
                        {post.matchDate}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-mono text-emerald-400">{post.joinedCount}</span>
                      <span className="text-xs text-muted-foreground">/ {post.neededCount}</span>
                    </div>
                    <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (post.joinedCount / post.neededCount) * 100)}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={post.isActive !== false
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-secondary text-muted-foreground"
                      }
                    >
                      {post.isActive !== false ? "Active" : "Removed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {post.isActive !== false ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Remove Post</DialogTitle>
                            <DialogDescription>
                              Remove the post "<strong>{post.title}</strong>" by {post.userName}?
                              This will deactivate the post and players will no longer see it.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDelete(post.id)}
                              disabled={deletePost.isPending}
                            >
                              Remove Post
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-xs text-muted-foreground">Removed</span>
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
