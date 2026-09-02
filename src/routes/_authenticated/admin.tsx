import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
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
  X,
  ToggleLeft,
  ToggleRight,
  Copy,
  CheckCheck,
  Link2,
  Trash2,
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
  DialogDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { supabase } from "@/lib/supabase";
import { type QrCard, normalizeUrl, isValidUrl } from "@/lib/qr-config";

/* ─────────────────────────────────────────────────────────────────────────────
   Route
───────────────────────────────────────────────────────────────────────────── */

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — DRFT QR Routing" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Data
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
  accent,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <div
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: accent + "20" }}
        >
          <Icon className="size-4" style={{ color: accent }} />
        </div>
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
      </div>
      <p className="font-display text-4xl font-bold text-foreground">{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Edit / redirect dialog
───────────────────────────────────────────────────────────────────────────── */

type EditDialogProps = {
  card: QrCard | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<QrCard>) => void;
  saving: boolean;
};

function EditDialog({ card, onClose, onSave, saving }: EditDialogProps) {
  const [shopName, setShopName] = useState("");
  const [destUrl, setDestUrl] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("inactive");

  useEffect(() => {
    if (card) {
      setShopName(card.shop_name ?? "");
      setDestUrl(card.destination_url ?? "");
      setStatus(card.status);
    }
  }, [card]);

  const urlEmpty = destUrl.trim() === "";
  const urlValid = urlEmpty || isValidUrl(destUrl);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (!urlEmpty && !isValidUrl(destUrl)) {
      toast.error("Enter a valid URL (must start with http:// or https://)");
      return;
    }
    onSave(card.id, {
      shop_name: shopName.trim() || null,
      destination_url: urlEmpty ? null : normalizeUrl(destUrl),
      status,
    });
  }

  const qrPublicUrl = `https://drftreviews.vercel.app/q/${card?.id}`;

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Card{" "}
            <span className="text-primary font-mono">/q/{card?.id}</span>
          </DialogTitle>
          <DialogDescription>
            Set where this QR card redirects. The physical QR code always
            points to{" "}
            <a
              href={qrPublicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {qrPublicUrl}
            </a>
          </DialogDescription>
        </DialogHeader>

        <form id="edit-form" onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Destination URL — the main field */}
          <div className="space-y-2">
            <Label htmlFor="dest-url" className="flex items-center gap-1.5">
              <Link2 className="size-3.5 text-primary" />
              Redirect destination
              <span className="ml-1 text-xs text-muted-foreground">(Google Review, website, etc.)</span>
            </Label>
            <Input
              id="dest-url"
              placeholder="https://search.google.com/local/writereview?placeid=..."
              value={destUrl}
              onChange={(e) => setDestUrl(e.target.value)}
              className={
                !urlValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : destUrl
                  ? "border-primary/50"
                  : ""
              }
            />
            {!urlValid && (
              <p className="text-xs text-destructive">
                Must be a valid URL starting with https://
              </p>
            )}
            {urlEmpty && (
              <p className="text-xs text-muted-foreground">
                Leave empty to keep the card unassigned.
              </p>
            )}
          </div>

          {/* Shop name */}
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop / location name</Label>
            <Input
              id="shop-name"
              placeholder="e.g. DRFT Coffee — Koramangala"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="card-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as "active" | "inactive")}
            >
              <SelectTrigger id="card-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success inline-block" />
                    Active — scans redirect to destination
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground inline-block" />
                    Inactive — scans go to "not yet active" page
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-form"
            disabled={saving || !urlValid}
            className="gap-1.5"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save redirect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Copy button
───────────────────────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={copy}
            className="inline-flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? (
              <CheckCheck className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy URL"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

function CardRow({
  card,
  onEdit,
  onToggle,
  onReset,
  toggling,
  resetting,
}: CardRowProps) {
  const isActive = card.status === "active";
  const hasUrl = !!card.destination_url;

  return (
    <div
      className={`group flex flex-col gap-3 rounded-xl border bg-card px-4 py-4 transition-all hover:shadow-sm sm:flex-row sm:items-center ${
        isActive && hasUrl
          ? "border-success/30 hover:border-success/60"
          : "border-border hover:border-primary/30"
      }`}
    >
      {/* Left: ID + status + info */}
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className="flex flex-col items-center gap-1 pt-0.5 sm:pt-0">
          <span className="font-mono text-sm font-bold text-muted-foreground">
            {card.id}
          </span>
          <Badge
            className={`text-[10px] px-1.5 py-0 ${
              isActive && hasUrl
                ? "bg-success/15 text-success border-success/30"
                : "bg-secondary text-muted-foreground"
            }`}
            variant="outline"
          >
            {isActive && hasUrl ? "Live" : isActive ? "No URL" : "Off"}
          </Badge>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">
            {card.shop_name ?? (
              <span className="italic text-muted-foreground/60 font-normal">
                No shop name
              </span>
            )}
          </p>

          {hasUrl ? (
            <div className="flex items-center gap-1 min-w-0">
              <a
                href={card.destination_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-primary hover:underline underline-offset-2 max-w-xs"
                title={card.destination_url!}
              >
                {card.destination_url}
              </a>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
              <CopyButton text={card.destination_url!} />
            </div>
          ) : (
            <button
              onClick={() => onEdit(card)}
              className="flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary transition-colors"
            >
              <Link2 className="size-3" />
              Click to set redirect URL
            </button>
          )}
        </div>
      </div>

      {/* Right: scan count + actions */}
      <div className="flex shrink-0 items-center gap-1.5 sm:ml-auto">
        <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
          <BarChart3 className="size-3" />
          {card.scan_count} scan{card.scan_count !== 1 ? "s" : ""}
        </span>

        {/* Toggle */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id={`toggle-${card.id}`}
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onToggle(card)}
                disabled={toggling || !hasUrl}
              >
                {toggling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isActive ? (
                  <ToggleRight className="size-4 text-success" />
                ) : (
                  <ToggleLeft className="size-4 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!hasUrl
                ? "Set a URL first"
                : isActive
                ? "Deactivate card"
                : "Activate card"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Edit */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id={`edit-${card.id}`}
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onEdit(card)}
              >
                <Edit2 className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit redirect</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Reset stats */}
        <AlertDialog>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    id={`reset-${card.id}`}
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    disabled={resetting}
                  >
                    {resetting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Reset scan stats</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset stats for card {card.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes all scan records and resets the count to 0 for this
                card. Cannot be undone.
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

  /* ── stats ── */
  const totalScans = useMemo(
    () => cards.reduce((s, c) => s + c.scan_count, 0),
    [cards],
  );
  const activeCount = useMemo(
    () => cards.filter((c) => c.status === "active" && c.destination_url).length,
    [cards],
  );
  const assignedCount = useMemo(
    () => cards.filter((c) => c.destination_url).length,
    [cards],
  );

  /* ── filtered ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c) => {
      const matchSearch =
        !q ||
        c.id.includes(q) ||
        (c.shop_name ?? "").toLowerCase().includes(q) ||
        (c.destination_url ?? "").toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [cards, search, filterStatus]);

  /* ── update ── */
  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<QrCard> }) => {
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
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["qr_cards"], ctx.prev);
      toast.error("Failed to update — check your admin role in Supabase.");
    },
    onSuccess: () => toast.success("Card updated ✓"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["qr_cards"] }),
  });

  /* ── reset stats ── */
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
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["qr_cards"], ctx.prev);
      toast.error("Failed to reset stats.");
    },
    onSuccess: () => toast.success("Stats reset."),
    onSettled: () => {
      setResettingId(null);
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
  });

  /* ── handlers ── */
  function handleSave(id: string, patch: Partial<QrCard>) {
    updateMutation.mutate({ id, patch }, { onSuccess: () => setEditTarget(null) });
  }

  async function handleToggle(card: QrCard) {
    if (!card.destination_url) {
      toast.error("Set a destination URL before activating.");
      setEditTarget(card);
      return;
    }
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
      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold">
            <QrCode className="size-5 text-primary" />
            DRFT QR Router
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

      <main className="mx-auto max-w-5xl px-5 py-8 pb-20">
        {/* ── Stats ── */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total cards"
            value={cards.length}
            icon={QrCode}
            accent="oklch(0.78 0.16 65)"
          />
          <StatCard
            label="Live"
            value={activeCount}
            icon={Check}
            accent="oklch(0.72 0.16 155)"
          />
          <StatCard
            label="Assigned"
            value={assignedCount}
            icon={Link2}
            accent="oklch(0.76 0.11 195)"
          />
          <StatCard
            label="Total scans"
            value={totalScans}
            icon={BarChart3}
            accent="oklch(0.78 0.16 65)"
          />
        </section>

        {/* ── Info banner ── */}
        <div className="mt-6 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">How it works: </span>
          Physical QR codes point to{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs text-foreground">
            drftreviews.vercel.app/q/001
          </code>{" "}
          …{" "}
          <code className="rounded bg-secondary px-1 py-0.5 text-xs text-foreground">
            /q/020
          </code>
          . Set a redirect URL below and toggle the card{" "}
          <strong className="text-success">Live</strong> — scanners are
          instantly sent to your Google Review page (or any URL).
        </div>

        {/* ── Toolbar ── */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-xl font-bold text-foreground">
            All 20 cards
          </h2>
          <div className="flex flex-wrap gap-2">
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

            <Select
              value={filterStatus}
              onValueChange={(v) =>
                setFilterStatus(v as "all" | "active" | "inactive")
              }
            >
              <SelectTrigger id="status-filter" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cards</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>

            <Button
              id="refresh-btn"
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              title="Refresh"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </section>

        {/* ── Card list ── */}
        <section id="card-list" className="mt-4 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}

          {isError && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center">
              <p className="text-sm text-destructive font-medium">
                Failed to load cards.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Make sure your account has the <strong>admin</strong> role in
                Supabase. Run the SQL in SETUP.md §3b.
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
            <div className="py-20 text-center text-sm text-muted-foreground">
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
