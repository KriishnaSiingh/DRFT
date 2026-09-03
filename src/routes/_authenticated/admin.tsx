import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Database,
  Globe,
  Sparkles,
  AlertTriangle,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { supabase } from "@/lib/supabase";
import {
  type QrCard,
  CARD_IDS,
  QR_BASE_URL,
  getCardQrUrl,
  DEFAULT_GOOGLE_REVIEW_LINKS,
  getDefaultReviewLink,
  normalizeUrl,
  isValidUrl,
} from "@/lib/qr-config";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "QR Redirect Manager — DRFT Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPage,
});

/* ─────────────────────────────────────────────────────────────────────────────
   Data Fetching
───────────────────────────────────────────────────────────────────────────── */

async function fetchCardsFromDb(): Promise<QrCard[]> {
  try {
    const { data, error } = await supabase.from("qr_cards").select("*").order("id");
    if (error) {
      console.warn("Could not fetch cards from Supabase:", error.message);
      return [];
    }
    return (data ?? []) as QrCard[];
  } catch (e) {
    console.warn("Network / Supabase error:", e);
    return [];
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stat Card Component
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
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
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
      <p className="font-display text-3xl font-bold text-foreground sm:text-4xl">{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Copy Button Component
───────────────────────────────────────────────────────────────────────────── */

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={copy}
            type="button"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={label}
          >
            {copied ? (
              <CheckCheck className="size-3.5 text-success" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Edit Dialog Component
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
  const qrUrl = card ? getCardQrUrl(card.id) : "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!card) return;
    if (!urlEmpty && !isValidUrl(destUrl)) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }
    onSave(card.id, {
      shop_name: shopName.trim() || null,
      destination_url: urlEmpty ? null : normalizeUrl(destUrl),
      status,
    });
  }

  return (
    <Dialog open={!!card} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-sm px-2.5 py-0.5 border-primary text-primary"
            >
              QR #{card?.id}
            </Badge>
            <DialogTitle className="font-display text-xl">Edit Redirect Destination</DialogTitle>
          </div>
          <DialogDescription className="pt-1.5 text-xs text-muted-foreground">
            Scanners scanning this QR code will instantly redirect to this destination.
          </DialogDescription>
        </DialogHeader>

        {/* Physical QR link banner */}
        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-muted-foreground">Permanent QR URL:</span>
            <div className="flex items-center gap-1">
              <a
                href={qrUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                {qrUrl}
                <ExternalLink className="size-3" />
              </a>
              <CopyButton text={qrUrl} label="Copy QR URL" />
            </div>
          </div>
        </div>

        <form id="edit-form" onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Destination URL */}
          <div className="space-y-2">
            <Label htmlFor="dest-url" className="flex items-center gap-1.5 font-medium">
              <Globe className="size-3.5 text-primary" />
              Redirect Destination URL
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
              <p className="text-xs text-destructive">Enter a valid URL (e.g. https://...)</p>
            )}

            {/* Quick preset buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Quick fill:</span>
              <button
                type="button"
                onClick={() => {
                  setDestUrl(DEFAULT_GOOGLE_REVIEW_LINKS["001"].url);
                  if (!shopName) setShopName(DEFAULT_GOOGLE_REVIEW_LINKS["001"].shop_name);
                  setStatus("active");
                }}
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                📍 Review Place 1
              </button>
              <button
                type="button"
                onClick={() => {
                  setDestUrl(DEFAULT_GOOGLE_REVIEW_LINKS["002"].url);
                  if (!shopName) setShopName(DEFAULT_GOOGLE_REVIEW_LINKS["002"].shop_name);
                  setStatus("active");
                }}
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-secondary transition-colors"
              >
                📍 Review Place 2
              </button>
              {destUrl && (
                <button
                  type="button"
                  onClick={() => setDestUrl("")}
                  className="rounded-md px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  Clear URL
                </button>
              )}
            </div>
          </div>

          {/* Shop name */}
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop or Location Name</Label>
            <Input
              id="shop-name"
              placeholder="e.g. DRFT Coffee — Koramangala"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="card-status">Card Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
              <SelectTrigger id="card-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success inline-block" />
                    <strong>Active</strong> — Immediately redirects scanners to URL
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-muted-foreground inline-block" />
                    <strong>Inactive</strong> — Shows "Card Not Yet Active" page
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
          <Button type="submit" form="edit-form" disabled={saving || !urlValid} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Redirect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SQL Schema Modal Component
───────────────────────────────────────────────────────────────────────────── */

const SCHEMA_SQL = `-- DRFT QR Router Schema for Supabase
create table if not exists public.qr_cards (
  id text primary key check (id ~ '^0(0[1-9]|[1-4][0-9]|50)$'),
  shop_name text,
  destination_url text,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  scan_count integer not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure existing tables update check constraint to allow 001 to 050
alter table public.qr_cards drop constraint if exists qr_cards_id_check;
alter table public.qr_cards add constraint qr_cards_id_check check (id ~ '^0(0[1-9]|[1-4][0-9]|50)$');

grant all on public.qr_cards to authenticated;
grant all on public.qr_cards to service_role;
alter table public.qr_cards enable row level security;

drop policy if exists "Authenticated users can read cards" on public.qr_cards;
create policy "Authenticated users can read cards" on public.qr_cards for select to authenticated using (true);
drop policy if exists "Authenticated users can update cards" on public.qr_cards;
create policy "Authenticated users can update cards" on public.qr_cards for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated users can insert cards" on public.qr_cards;
create policy "Authenticated users can insert cards" on public.qr_cards for insert to authenticated with check (true);

create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),
  card_id text not null references public.qr_cards(id) on delete cascade,
  scanned_at timestamptz not null default now(),
  device_type text not null default 'unknown',
  user_agent text
);
grant all on public.qr_scans to authenticated;
grant all on public.qr_scans to service_role;
alter table public.qr_scans enable row level security;
drop policy if exists "Authenticated read scans" on public.qr_scans;
create policy "Authenticated read scans" on public.qr_scans for select to authenticated using (true);
drop policy if exists "Authenticated delete scans" on public.qr_scans;
create policy "Authenticated delete scans" on public.qr_scans for delete to authenticated using (true);

create or replace function public.resolve_and_log_scan(
  p_card_id text,
  p_device_type text default 'unknown',
  p_user_agent text default null
)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_status text;
begin
  select destination_url, status into v_url, v_status from public.qr_cards where id = p_card_id;
  if v_url is null or v_status <> 'active' then
    return null;
  end if;
  insert into public.qr_scans (card_id, device_type, user_agent)
  values (p_card_id, coalesce(p_device_type, 'unknown'), left(coalesce(p_user_agent, ''), 500));
  update public.qr_cards set scan_count = scan_count + 1, last_scanned_at = now() where id = p_card_id;
  return v_url;
end;
$$;
grant execute on function public.resolve_and_log_scan(text, text, text) to anon, authenticated;

create or replace function public.reset_card_stats(p_card_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.qr_scans where card_id = p_card_id;
  update public.qr_cards set scan_count = 0, last_scanned_at = null, updated_at = now() where id = p_card_id;
end;
$$;
grant execute on function public.reset_card_stats(text) to authenticated;

-- Seed Cards 001 & 002 with Google Reviews
insert into public.qr_cards (id, shop_name, destination_url, status)
values
  ('001', 'DRFT Reviews — Location 1', 'https://search.google.com/local/writereview?placeid=ChIJK7BfLrErCTkRvBd4rfs6X8g', 'active'),
  ('002', 'DRFT Reviews — Location 2', 'https://search.google.com/local/writereview?placeid=ChIJUStYgL7pDDkRW8zAWxQ3Rhc', 'active')
on conflict (id) do update set
  destination_url = excluded.destination_url,
  status = excluded.status,
  shop_name = coalesce(public.qr_cards.shop_name, excluded.shop_name);

-- Seed Remaining Cards 003 to 050
insert into public.qr_cards (id, status)
select to_char(n, 'FM000'), 'inactive' from generate_series(3, 50) as n
on conflict (id) do nothing;
`;

function SqlModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copySql() {
    navigator.clipboard.writeText(SCHEMA_SQL).then(() => {
      setCopied(true);
      toast.success("SQL copied! Paste it in your Supabase SQL Editor and click RUN.");
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <DialogTitle>Supabase SQL Schema</DialogTitle>
          </div>
          <DialogDescription>
            Copy and paste this into your <strong>Supabase Project → SQL Editor</strong> and click{" "}
            <strong>Run</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto rounded-md bg-secondary/80 p-3 font-mono text-xs border border-border">
          <pre className="whitespace-pre-wrap">{SCHEMA_SQL}</pre>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={copySql} className="gap-1.5">
            {copied ? <CheckCheck className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? "Copied to Clipboard!" : "Copy SQL Script"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Card Row Component
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
  const hasUrl = !!card.destination_url;
  const qrUrl = getCardQrUrl(card.id);

  return (
    <div
      className={`group flex flex-col gap-3.5 rounded-xl border bg-card p-4 transition-all hover:shadow-md sm:flex-row sm:items-center ${
        isActive && hasUrl
          ? "border-success/40 bg-success/[0.02]"
          : "border-border hover:border-primary/40"
      }`}
    >
      {/* Col 1: Card ID & Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-center">
          <span className="font-mono text-base font-bold text-foreground">{card.id}</span>
          <Badge
            variant={isActive && hasUrl ? "default" : "secondary"}
            className={`text-[10px] px-1.5 py-0 mt-0.5 ${
              isActive && hasUrl ? "bg-success text-success-foreground" : ""
            }`}
          >
            {isActive && hasUrl ? "LIVE" : isActive ? "NO URL" : "OFF"}
          </Badge>
        </div>
      </div>

      {/* Col 2: Info & URLs */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground truncate">
            {card.shop_name ?? (
              <span className="text-muted-foreground font-normal italic">Unlabeled Card</span>
            )}
          </span>

          {/* Physical QR Link Tag */}
          <div className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
            <span>QR:</span>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline flex items-center gap-0.5 truncate max-w-[180px]"
              title={`Test QR link: ${qrUrl}`}
            >
              /q/{card.id}
              <ExternalLink className="size-2.5 shrink-0" />
            </a>
            <CopyButton text={qrUrl} label="Copy QR URL" />
          </div>
        </div>

        {/* Redirect Destination URL */}
        {hasUrl ? (
          <div className="flex items-center gap-1.5 min-w-0 text-xs">
            <span className="text-muted-foreground font-medium shrink-0">Redirects to:</span>
            <a
              href={card.destination_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate font-mono text-primary hover:underline max-w-sm sm:max-w-md"
              title={card.destination_url!}
            >
              {card.destination_url}
            </a>
            <CopyButton text={card.destination_url!} label="Copy Destination URL" />
          </div>
        ) : (
          <button
            onClick={() => onEdit(card)}
            type="button"
            className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <Link2 className="size-3 text-primary" />
            Click here to set redirect destination URL
          </button>
        )}
      </div>

      {/* Col 3: Scan Analytics & Actions */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border/50 pt-2 sm:border-0 sm:pt-0 sm:justify-end">
        {/* Scan count badge */}
        <div
          className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
          title="Total scan count"
        >
          <BarChart3 className="size-3.5 text-primary" />
          <span>{card.scan_count}</span>
          <span className="text-[10px] text-muted-foreground font-normal">scans</span>
        </div>

        {/* Toggle Live / Inactive */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id={`toggle-${card.id}`}
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => onToggle(card)}
                disabled={toggling}
              >
                {toggling ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isActive ? (
                  <ToggleRight className="size-5 text-success" />
                ) : (
                  <ToggleLeft className="size-5 text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!hasUrl
                ? "Set a destination URL first"
                : isActive
                  ? "Turn OFF redirect"
                  : "Make redirect LIVE"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Edit Button */}
        <Button
          id={`edit-${card.id}`}
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => onEdit(card)}
        >
          <Edit2 className="size-3.5" />
          <span>Edit</span>
        </Button>

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
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Reset scan count to 0</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset stats for Card {card.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset the scan counter to 0. Destination URL and active status will not be
                changed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => onReset(card)}
              >
                Reset Stats
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Admin Dashboard Page
───────────────────────────────────────────────────────────────────────────── */

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editTarget, setEditTarget] = useState<QrCard | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState(false);

  // Fetch cards from Supabase
  const {
    data: dbCards = [],
    isLoading,
    refetch,
  } = useQuery({ queryKey: ["qr_cards"], queryFn: fetchCardsFromDb });

  // Merge with fixed 50 CARD_IDS to ensure all 50 cards are ALWAYS visible & editable
  const allCards: QrCard[] = useMemo(() => {
    const dbMap = new Map(dbCards.map((c) => [c.id, c]));

    return CARD_IDS.map((id) => {
      const existing = dbMap.get(id);
      if (existing) return existing;

      // Default presets for 001 and 002 if not in DB yet
      const preset = getDefaultReviewLink(id);
      return {
        id,
        shop_name: preset ? preset.shop_name : null,
        destination_url: preset ? preset.url : null,
        status: "inactive" as const,
        scan_count: 0,
        last_scanned_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  }, [dbCards]);

  // Derived stats
  const totalScans = useMemo(() => allCards.reduce((s, c) => s + c.scan_count, 0), [allCards]);
  const liveCount = useMemo(
    () => allCards.filter((c) => c.status === "active" && c.destination_url).length,
    [allCards],
  );
  const assignedCount = useMemo(() => allCards.filter((c) => c.destination_url).length, [allCards]);

  // Filtered cards list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCards.filter((c) => {
      const matchSearch =
        !q ||
        c.id.includes(q) ||
        (c.shop_name ?? "").toLowerCase().includes(q) ||
        (c.destination_url ?? "").toLowerCase().includes(q);
      const matchStatus = filterStatus === "all" || c.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [allCards, search, filterStatus]);

  // Mutation: Upsert Card (works whether row exists or not)
  const saveMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<QrCard> }) => {
      const { error } = await supabase.from("qr_cards").upsert(
        {
          id,
          shop_name: patch.shop_name,
          destination_url: patch.destination_url,
          status: patch.status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["qr_cards"] });
      const prev = qc.getQueryData<QrCard[]>(["qr_cards"]);
      qc.setQueryData<QrCard[]>(["qr_cards"], (old) => {
        const list = old ?? [];
        const found = list.some((c) => c.id === id);
        if (found) {
          return list.map((c) => (c.id === id ? { ...c, ...patch } : c));
        }
        return [...list, { id, ...patch } as QrCard];
      });
      return { prev };
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(`Database error: ${msg}`);
    },
    onSuccess: () => {
      toast.success("Redirect saved successfully!");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
  });

  // Mutation: Sync All 20 Cards to DB
  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const rows = allCards.map((c) => ({
        id: c.id,
        shop_name: c.shop_name,
        destination_url: c.destination_url,
        status: c.status,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from("qr_cards").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All 50 cards synchronized with Supabase!");
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Check Supabase permissions";
      toast.error(`Sync error: ${msg}`);
    },
  });

  // Mutation: Reset Stats
  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await supabase.rpc("reset_card_stats", { p_card_id: id });
      } catch {
        // Fallback direct update
        await supabase
          .from("qr_cards")
          .update({ scan_count: 0, last_scanned_at: null })
          .eq("id", id);
      }
    },
    onMutate: async (id) => {
      setResettingId(id);
      qc.setQueryData<QrCard[]>(["qr_cards"], (old) =>
        (old ?? []).map((c) => (c.id === id ? { ...c, scan_count: 0 } : c)),
      );
    },
    onSuccess: () => toast.success("Scan counter reset to 0"),
    onSettled: () => {
      setResettingId(null);
      qc.invalidateQueries({ queryKey: ["qr_cards"] });
    },
  });

  // Handlers
  function handleSave(id: string, patch: Partial<QrCard>) {
    saveMutation.mutate({ id, patch }, { onSuccess: () => setEditTarget(null) });
  }

  async function handleToggle(card: QrCard) {
    if (!card.destination_url && card.status === "inactive") {
      toast.error("Please set a redirect URL before activating.");
      setEditTarget(card);
      return;
    }
    setTogglingId(card.id);
    const nextStatus = card.status === "active" ? "inactive" : "active";
    await saveMutation.mutateAsync({
      id: card.id,
      patch: { status: nextStatus },
    });
    setTogglingId(null);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky Top Bar ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
              <QrCode className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-base font-bold leading-none text-foreground">
                DRFT QR Redirect Manager
              </h1>
              <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{QR_BASE_URL}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSqlModal(true)}
              className="gap-1.5 text-xs hidden sm:flex"
            >
              <Database className="size-3.5 text-primary" />
              <span>SQL Schema</span>
            </Button>
            <ThemeToggle />
            <Button
              id="sign-out-btn"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 pb-24">
        {/* ── Analytics Header ── */}
        <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <StatCard
            label="Total Cards"
            value={allCards.length}
            icon={QrCode}
            accent="oklch(0.78 0.16 65)"
          />
          <StatCard
            label="Live Redirects"
            value={liveCount}
            icon={Check}
            accent="oklch(0.72 0.16 155)"
          />
          <StatCard
            label="Assigned URLs"
            value={assignedCount}
            icon={Link2}
            accent="oklch(0.76 0.11 195)"
          />
          <StatCard
            label="Total Scans"
            value={totalScans}
            icon={BarChart3}
            accent="oklch(0.78 0.16 65)"
          />
        </section>

        {/* ── System Mapping Explainer Card ── */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-4.5 shadow-sm text-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
              <Globe className="size-4" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-foreground">Domain &amp; Physical QR Mapping</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your 50 physical QR codes are permanently printed with URLs{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">
                  https://drftreviews.vercel.app/q/001
                </code>{" "}
                through{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-foreground font-semibold">
                  /q/050
                </code>
                . When scanned, our server immediately resolves and issues an instant redirect to
                whatever Google Review URL (or any link) you set below.
              </p>
            </div>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl font-bold text-foreground">QR Cards (50)</h2>
            <Badge variant="outline" className="text-xs font-normal">
              {filtered.length} showing
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="card-search"
                placeholder="Search ID, shop, or URL…"
                className="pl-8 w-56 text-xs h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}
            >
              <SelectTrigger id="status-filter" className="w-32 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sync All to DB Button */}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    id="sync-all-btn"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs"
                    onClick={() => syncAllMutation.mutate()}
                    disabled={syncAllMutation.isPending}
                  >
                    {syncAllMutation.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5 text-primary" />
                    )}
                    <span>Sync to DB</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Push all 50 cards into Supabase database</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Refresh */}
            <Button
              id="refresh-btn"
              variant="outline"
              size="icon"
              className="size-9"
              onClick={() => refetch()}
              title="Refresh card list"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </section>

        {/* ── Cards List ── */}
        <section id="card-list" className="mt-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
              No QR cards match your search or filter.
            </div>
          ) : (
            filtered.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                onEdit={setEditTarget}
                onToggle={handleToggle}
                onReset={(c) => resetMutation.mutate(c.id)}
                toggling={togglingId === card.id}
                resetting={resettingId === card.id}
              />
            ))
          )}
        </section>
      </main>

      {/* ── Modals ── */}
      <EditDialog
        card={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSave}
        saving={saveMutation.isPending}
      />

      <SqlModal open={showSqlModal} onClose={() => setShowSqlModal(false)} />
    </div>
  );
}
