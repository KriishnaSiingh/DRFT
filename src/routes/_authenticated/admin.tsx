import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useState,
  useMemo,
  useEffect,
} from "react";
import {
  BarChart3,
  Check,
  Edit2,
  ExternalLink,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  Sparkles,
  X,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { supabase } from "@/lib/supabase";
import { type QrCard, normalizeUrl, isValidUrl } from "@/lib/qr-config";

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */

const GOOGLE_REVIEW_URLS: Record<string, string> = {
  "001": "https://search.google.com/local/writereview?placeid=ChIJK7BfLrErCTkRvBd4rfs6X8g",
  "002": "https://search.google.com/local/writereview?placeid=ChIJUStYgL7pDDkRW8zAWxQ3Rhc",
};

/* ─────────────────────────────────────────────────────────────────────────────
   Route
───────────────────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — QR Routing Manager" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Data fetching
───────────────────────────────────────────────────────────────────────────── */

async function fetchCards(): Promise<QrCard[]> {
  const { data, error } = await supabase
    .from("qr_cards")
    .select("*")
    .order("id");
  if (error) throw error;
  return (data ?? []) as QrCard[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  color = "text-primary",
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Icon className={`size-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">
        {value}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Edit dialog
───────────────────────────────────────────────────────────────────────────── */

type EditDialogProps = {
  card: QrCard | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<QrCard>) => void;
  saving: boolean;
};

function EditDialog({ card, onClose, onSave, saving }: EditDialogProps) {
  const [shopName, setShopName] = useState(card?.shop_name ?? "");
  const [destUrl, setDestUrl] = useState(card?.destination_url ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(
    card?.status ?? "inactive",
  );

  // Reset when card changes
  useEffect(() => {
    if (card) {
      setShopName(card.shop_name ?? "");
      setDestUrl(card.destination_url ?? "");
      setStatus(card.status);
    }
  }, [card]);

  const urlIsValid = destUrl.trim() === "" || isValidUrl(destUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (destUrl.trim() && !isValidUrl(destUrl)) {
      toast.error("Invalid destination URL");
      return;
    }
    onSave(card.id, {
      shop_name: shopName.trim() || null,
      destination_url: destUrl.trim() ? normalizeUrl(destUrl) : null,
      status,
    });
  }

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Edit card{" "}
            <span className="font-mono text-primary">/q/{card?.id}</span>
          </DialogTitle>
        </DialogHeader>
        <form id="edit-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop name</Label>
            <Input
              id="shop-name"
              placeholder="e.g. DRFT Coffee Roasters"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dest-url">Destination URL</Label>
            <Input
              id="dest-url"
              placeholder="https://..."
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              className={!urlIsValid ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {!urlIsValid && (
              <p className="text-xs text-destructive">Please enter a valid URL.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "inactive")}
            >
              <SelectTrigger id="card-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-form" disabled={saving || !urlIsValid}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Card row
───────────────────────────────────────────────────────────────────────────── */

type CardRowProps = {
  card: QrCard;
  onEdit: (card: QrCard) => void;
  onToggle: (card: QrCard) => void;
  onReset: (card: QrCard) => void;
  toggling: boolean;
  resetting: boolean;
};

function CardRow({ card, onEdit, onToggle, onReset, toggling, resetting }: CardRowProps) {
  const isActive = card.status === "active";

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-primary/40 sm:flex-row sm:items-center">
      {/* ID + status */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="font-display text-sm font-bold text-muted-foreground w-10 shrink-0">
          {card.id}
        </span>
        <Badge
          variant={isActive ? "default" : "secondary"}
          className={`shrink-0 text-xs ${isActive ? "bg-success text-success-foreground" : ""}`}
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {card.shop_name ?? (
              <span className="text-muted-foreground/60 italic">No shop name</span>
            )}
          </p>
          {card.destination_url && (
            <a
              href={card.destination_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              title={card.destination_url}
            >
              <span className="truncate">{card.destination_url}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          )}
        </div>
      </div>

      {/* Stats + actions */}
      <div className="flex shrink-0 items-center gap-2 sm:ml-auto">
        <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          <BarChart3 className="size-3" />
          {card.scan_count}
        </span>

        {/* Toggle active/inactive */}
        <Button
          id={`toggle-${card.id}`}
          variant="ghost"
          size="icon"
          className="size-8"
          title={isActive ? "Deactivate" : "Activate"}
          onClick={() => onToggle(card)}
          disabled={toggling}
        >
          {toggling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : isActive ? (
            <ToggleRight className="size-4 text-success" />
          ) : (
            <ToggleLeft className="size-4 text-muted-foreground" />
          )}
        </Button>

        {/* Edit */}
        <Button
          id={`edit-${card.id}`}
          variant="ghost"
          size="icon"
          className="size-8"
          title="Edit card"
          onClick={() => onEdit(card)}
        >
          <Edit2 className="size-4" />
        </Button>

        {/* Reset stats */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              id={`reset-${card.id}`}
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive"
              title="Reset scan stats"
              disabled={resetting}
            >
              {resetting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset stats for card {card.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all scan records and reset the scan count to 0. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onReset(card)}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main admin page
───────────────────────────────────────────────────────────────────────────── */

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editTarget, setEditTarget] = useState<QrCard | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const {
    data: cards = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ["qr_cards"], queryFn: fetchCards });

  /* ── derived stats ── */
  const totalScans = useMemo(
    () => cards.reduce((sum, c) => sum + c.scan_count, 0),
    [cards],
  );
  const activeCount = useMemo(
    () => cards.filter((c) => c.status === "active").length,
    [cards],
  );

  /* ── filtered list ── */
  const filtered = useMemo(() => {
    return cards.filter((c) => {
      const matchSearch =
        !search.trim() ||
        c.id.includes(search) ||
        (c.shop_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.destination_url ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === "all" || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [cards, search, filterStatus]);

  /* ── update mutation ── */
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<QrCard>;
    }) => {
      const { error } = await supabase
        .from("qr_cards")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["qr_cards"] });
      const prev = qc.getQueryData<QrCard[]>(["qr_cards"]);
      qc.setQueryData<QrCard[]>(["qr_cards"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["qr_cards"], ctx.prev);
      toast.error("Failed to update card.");
    },
    onSuccess: () => toast.success("Card updated."),
    onSettled: () => qc.invalidateQueries({ queryKey: ["qr_cards"] }),
  });

  /* ── reset mutation ── */
  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("reset_card_stats", {
        p_card_id: id,
      });
      if (error) throw error;
    },
    onMutate: async (id) => {
      setResettingId(id);
      await qc.cancelQueries({ queryKey: ["qr_cards"] });
      const prev = qc.getQueryData<QrCard[]>(["qr_cards"]);
      qc.setQueryData<QrCard[]>(["qr_cards"], (old) =>
        (old ?? []).map((c) =>
          c.id === id ? { ...c, scan_count: 0, last_scanned_at: null } : c,
        ),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["qr_cards"], ctx.prev);
      toast.error("Failed to reset stats.");
    },
    onSuccess: () => toast.success("Stats reset."),
    onSettled: () => {
      setResettingId(null);
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
  });

  /* ── seed mutation ── */
  const seedMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(GOOGLE_REVIEW_URLS).map(
        ([id, url]) =>
          supabase
            .from("qr_cards")
            .update({
              destination_url: url,
              status: "active",
              shop_name: id === "001" ? "DRFT — Location 1" : "DRFT — Location 2",
              updated_at: new Date().toISOString(),
            })
            .eq("id", id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Cards 001 & 002 seeded with Google Review links.");
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
    onError: () => toast.error("Seed failed — check admin role."),
  });

  /* ── handlers ── */
  function handleSave(id: string, patch: Partial<QrCard>) {
    updateMutation.mutate(
      { id, patch },
      { onSuccess: () => setEditTarget(null) },
    );
  }

  async function handleToggle(card: QrCard) {
    setTogglingId(card.id);
    await updateMutation.mutateAsync({
      id: card.id,
      patch: { status: card.status === "active" ? "inactive" : "active" },
    });
    setTogglingId(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  /* ─────────────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <QrCode className="size-5 text-primary" />
            QR Router
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              — Admin
            </span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              id="sign-out-btn"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        {/* ── Stats ── */}
        <section
          id="stats-section"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3"
        >
          <StatCard
            label="Total cards"
            value={cards.length}
            icon={QrCode}
            color="text-primary"
          />
          <StatCard
            label="Active"
            value={activeCount}
            icon={Check}
            color="text-success"
          />
          <StatCard
            label="Total scans"
            value={totalScans}
            icon={BarChart3}
            color="text-accent"
          />
        </section>

        {/* ── Toolbar ── */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">
            Cards
          </h2>
          <div className="flex flex-wrap gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="card-search"
                placeholder="Search cards…"
                className="pl-9 w-52"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Status filter */}
            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as "all" | "active" | "inactive")
              }
            >
              <SelectTrigger id="status-filter" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button
              id="refresh-btn"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="size-4" />
            </Button>

            {/* Seed Google Review links */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  id="seed-btn"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                >
                  <Sparkles className="size-4 text-primary" />
                  Seed cards 001 &amp; 002
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Seed Google Review links?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will set cards 001 and 002 to your two Google Review
                    URLs and mark them <strong>Active</strong>. Existing
                    destination URLs will be overwritten.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => seedMutation.mutate()}
                    disabled={seedMutation.isPending}
                  >
                    {seedMutation.isPending && (
                      <Loader2 className="size-4 animate-spin" />
                    )}
                    Seed
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* ── Card list ── */}
        <section id="card-list" className="mt-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {isError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive">
                Failed to load cards. Make sure your account has the{" "}
                <strong>admin</strong> role in Supabase.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No cards match your filter.
            </div>
          )}
          {filtered.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onEdit={setEditTarget}
              onToggle={handleToggle}
              onReset={(c) => resetMutation.mutate(c.id)}
              toggling={togglingId === card.id}
              resetting={resettingId === card.id}
            />
          ))}
        </section>
      </main>

      {/* ── Edit dialog ── */}
      <EditDialog
        card={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSave}
        saving={updateMutation.isPending}
      />
    </div>
  );
}
