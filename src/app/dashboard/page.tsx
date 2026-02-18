"use client";

import { useState, useEffect, useCallback } from "react";

interface Founder {
  id: string;
  name: string;
  phone: string;
  companyWebsite: string;
  companyPhase: string;
  industry: string | null;
  industryEnriched: boolean;
  lookingFor: string[];
  offering: string[];
  availableSlots: string[];
  matchCount?: number;
  createdAt: string;
}

interface MatchSuggestion {
  id: string;
  founderAId: string;
  founderBId: string;
  score: number;
  suggestedSlot: string;
  reasonForA: string;
  reasonForB: string;
  status: string;
  founderA: Founder;
  founderB: Founder;
  confirmedAt: string | null;
}

interface DashboardData {
  founders: Founder[];
  suggestions: MatchSuggestion[];
  confirmed: MatchSuggestion[];
  stats: {
    totalRegistrations: number;
    confirmedToday: number;
    pendingSuggestions: number;
    unmatchedFounders: number;
  };
}

export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"suggestions" | "confirmed" | "registrations">("suggestions");
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const json = await res.json();
      setData(json);
      setAuthed(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [authed, fetchData]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/dashboard/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setAuthed(true);
      fetchData();
    } else {
      setLoginError("Wrong password");
    }
  }

  async function handleGenerateMatches() {
    setMatching(true);
    try {
      const res = await fetch("/api/match", { method: "POST" });
      const json = await res.json();
      alert(`Generated ${json.generated} new match suggestions.`);
      fetchData();
    } catch {
      alert("Failed to generate matches.");
    } finally {
      setMatching(false);
    }
  }

  async function handleConfirm(matchId: string, slot?: string) {
    await fetch("/api/dashboard/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, slot }),
    });
    fetchData();
  }

  async function handleDismiss(matchId: string) {
    await fetch("/api/dashboard/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    fetchData();
  }

  async function handleUpdateIndustry(founderId: string) {
    const industry = prompt("Enter industry tag:");
    if (!industry) return;
    await fetch("/api/dashboard/update-industry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ founderId, industry }),
    });
    fetchData();
  }

  function copySMS(founderName: string, reason: string, slot: string, phone: string, matchId: string, side: string) {
    const msg = `Hi ${founderName}! We found you a match at the Founders Lounge.\n\n${reason}\n\nWe suggest meeting at ${slot} at the Founders Lounge. Head over and we'll introduce you!\n\nCan't make that time? Just reply and we'll reschedule.`;
    navigator.clipboard.writeText(msg);
    setCopied(`${matchId}-${side}`);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
          <div className="text-center mb-2">
            <p className="text-sm font-medium text-[var(--color-peach-dark)] tracking-wide uppercase">breeze</p>
            <h1 className="font-serif text-2xl">Matchmaker Login</h1>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-white/70 border border-[var(--color-peach)] rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-plum)]"
          />
          {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-[var(--color-plum)] text-white font-semibold py-3 rounded-2xl hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            Log in
          </button>
        </form>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-plum-light)]">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-medium text-[var(--color-peach-dark)] tracking-wide uppercase">breeze</p>
            <h1 className="font-serif text-2xl">Founder Matching</h1>
          </div>
          <button
            onClick={handleGenerateMatches}
            disabled={matching}
            className="bg-[var(--color-plum)] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-primary-dark)] transition-colors"
          >
            {matching ? "Matching..." : "Generate new suggestions"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Registrations" value={data.stats.totalRegistrations} />
          <StatCard label="Confirmed today" value={data.stats.confirmedToday} />
          <StatCard label="Pending review" value={data.stats.pendingSuggestions} />
          <StatCard label="Unmatched" value={data.stats.unmatchedFounders} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-peach)] mb-4">
          {(["suggestions", "confirmed", "registrations"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t
                  ? "border-[var(--color-plum)] text-[var(--color-plum)]"
                  : "border-transparent text-[var(--color-plum-light)] hover:text-[var(--color-plum)]"
              }`}
            >
              {t === "suggestions" && `Suggestions (${data.suggestions.length})`}
              {t === "confirmed" && `Confirmed (${data.confirmed.length})`}
              {t === "registrations" && `Registrations (${data.founders.length})`}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-[var(--color-plum-light)] mb-2 opacity-60">Refreshing...</p>}

        {/* Suggestions tab */}
        {tab === "suggestions" && (
          <div className="space-y-4">
            {data.suggestions.length === 0 && (
              <p className="text-[var(--color-plum-light)] text-center py-8">
                No pending suggestions. Hit &quot;Generate new suggestions&quot; to create some.
              </p>
            )}
            {data.suggestions.map((s) => (
              <SuggestionCard
                key={s.id}
                match={s}
                onConfirm={handleConfirm}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}

        {/* Confirmed tab */}
        {tab === "confirmed" && (
          <div className="space-y-4">
            {data.confirmed.length === 0 && (
              <p className="text-[var(--color-plum-light)] text-center py-8">No confirmed matches yet.</p>
            )}
            {data.confirmed.map((m) => (
              <ConfirmedCard
                key={m.id}
                match={m}
                onCopySMS={copySMS}
                copied={copied}
              />
            ))}
          </div>
        )}

        {/* Registrations tab */}
        {tab === "registrations" && (
          <div className="space-y-3">
            {data.founders.map((f) => (
              <div key={f.id} className="bg-white/70 rounded-2xl border border-[var(--color-peach)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-sm text-[var(--color-plum-light)]">{f.phone}</p>
                    <a
                      href={f.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-plum)] underline"
                    >
                      {f.companyWebsite}
                    </a>
                  </div>
                  <span className="text-xs bg-[var(--color-peach)]/50 px-2 py-1 rounded-full font-medium">
                    {f.matchCount || 0} matches
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="bg-[var(--color-peach)]/40 px-2 py-0.5 rounded-full">{f.companyPhase}</span>
                  {f.industry ? (
                    <span
                      className={`px-2 py-0.5 rounded-full cursor-pointer ${
                        f.industryEnriched ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                      }`}
                      onClick={() => !f.industryEnriched && handleUpdateIndustry(f.id)}
                      title={!f.industryEnriched ? "Click to set industry" : ""}
                    >
                      {f.industry}
                      {!f.industryEnriched && " (click to edit)"}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpdateIndustry(f.id)}
                      className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full"
                    >
                      Set industry
                    </button>
                  )}
                </div>
                <div className="mt-2 text-xs text-[var(--color-plum-light)]">
                  <span className="font-medium">Looking for:</span>{" "}
                  {f.lookingFor.join(", ")}
                </div>
                <div className="mt-1 text-xs text-[var(--color-plum-light)]">
                  <span className="font-medium">Offering:</span>{" "}
                  {f.offering.join(", ")}
                </div>
                <div className="mt-1 text-xs text-[var(--color-plum-light)]">
                  <span className="font-medium">Available:</span>{" "}
                  {f.availableSlots.join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white/70 rounded-2xl border border-[var(--color-peach)] p-4 text-center">
      <p className="text-2xl font-bold font-serif">{value}</p>
      <p className="text-xs text-[var(--color-plum-light)]">{label}</p>
    </div>
  );
}

function SuggestionCard({
  match,
  onConfirm,
  onDismiss,
}: {
  match: MatchSuggestion;
  onConfirm: (id: string, slot?: string) => void;
  onDismiss: (id: string) => void;
}) {
  const [slotOverride, setSlotOverride] = useState(match.suggestedSlot);

  const overlapping = match.founderA.availableSlots.filter((s: string) =>
    match.founderB.availableSlots.includes(s)
  );

  const scoreColor =
    match.score >= 60 ? "bg-green-500" : match.score >= 40 ? "bg-[var(--color-peach-dark)]" : "bg-[var(--color-peach)]";

  return (
    <div className="bg-white/70 rounded-2xl border border-[var(--color-peach)] p-4">
      {/* Score bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-[var(--color-peach)]/30 rounded-full h-2 overflow-hidden">
          <div className={`h-2 rounded-full ${scoreColor}`} style={{ width: `${match.score}%` }} />
        </div>
        <span className="text-sm font-medium">{match.score}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="font-semibold text-sm">{match.founderA.name}</p>
          <a
            href={match.founderA.companyWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-plum)] underline"
          >
            {match.founderA.companyWebsite}
          </a>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs bg-[var(--color-peach)]/40 px-1.5 py-0.5 rounded-full">
              {match.founderA.companyPhase}
            </span>
            {match.founderA.industry && (
              <span className="text-xs bg-[var(--color-plum)]/10 px-1.5 py-0.5 rounded-full">
                {match.founderA.industry}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-plum-light)] mt-1">
            <span className="font-medium">Looking for:</span> {match.founderA.lookingFor.join(", ")}
          </p>
        </div>
        <div>
          <p className="font-semibold text-sm">{match.founderB.name}</p>
          <a
            href={match.founderB.companyWebsite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-plum)] underline"
          >
            {match.founderB.companyWebsite}
          </a>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs bg-[var(--color-peach)]/40 px-1.5 py-0.5 rounded-full">
              {match.founderB.companyPhase}
            </span>
            {match.founderB.industry && (
              <span className="text-xs bg-[var(--color-plum)]/10 px-1.5 py-0.5 rounded-full">
                {match.founderB.industry}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-plum-light)] mt-1">
            <span className="font-medium">Looking for:</span> {match.founderB.lookingFor.join(", ")}
          </p>
        </div>
      </div>

      {/* Match reason */}
      <div className="bg-[var(--color-peach)]/20 rounded-xl p-3 mb-3 text-sm">
        <p className="font-medium text-xs text-[var(--color-plum-light)] mb-1">For {match.founderA.name}:</p>
        <p>{match.reasonForA}</p>
        <p className="font-medium text-xs text-[var(--color-plum-light)] mb-1 mt-2">For {match.founderB.name}:</p>
        <p>{match.reasonForB}</p>
      </div>

      {/* Slot + actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={slotOverride}
          onChange={(e) => setSlotOverride(e.target.value)}
          className="bg-white/70 border border-[var(--color-peach)] rounded-xl px-3 py-2 text-sm"
        >
          {overlapping.map((slot: string) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
        <button
          onClick={() => onConfirm(match.id, slotOverride)}
          className="bg-[var(--color-plum)] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[var(--color-primary-dark)] transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={() => onDismiss(match.id)}
          className="bg-white/60 text-[var(--color-plum)] px-4 py-2 rounded-xl text-sm font-medium hover:bg-white transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function ConfirmedCard({
  match,
  onCopySMS,
  copied,
}: {
  match: MatchSuggestion;
  onCopySMS: (name: string, reason: string, slot: string, phone: string, matchId: string, side: string) => void;
  copied: string | null;
}) {
  return (
    <div className="bg-white/70 rounded-2xl border border-green-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
          Confirmed — {match.suggestedSlot}
        </span>
        {match.confirmedAt && (
          <span className="text-xs text-[var(--color-plum-light)]">
            {new Date(match.confirmedAt).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Founder A */}
      <div className="mb-3 p-3 bg-[var(--color-peach)]/15 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{match.founderA.name}</p>
            <p className="text-sm text-[var(--color-plum-light)]">{match.founderA.phone}</p>
          </div>
          <button
            onClick={() =>
              onCopySMS(
                match.founderA.name,
                match.reasonForA,
                match.suggestedSlot,
                match.founderA.phone,
                match.id,
                "A"
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              copied === `${match.id}-A`
                ? "bg-green-600 text-white"
                : "bg-[var(--color-plum)] text-white hover:bg-[var(--color-primary-dark)]"
            }`}
          >
            {copied === `${match.id}-A` ? "Copied!" : "Copy SMS"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-plum-light)] mt-1">{match.reasonForA}</p>
      </div>

      {/* Founder B */}
      <div className="p-3 bg-[var(--color-peach)]/15 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{match.founderB.name}</p>
            <p className="text-sm text-[var(--color-plum-light)]">{match.founderB.phone}</p>
          </div>
          <button
            onClick={() =>
              onCopySMS(
                match.founderB.name,
                match.reasonForB,
                match.suggestedSlot,
                match.founderB.phone,
                match.id,
                "B"
              )
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              copied === `${match.id}-B`
                ? "bg-green-600 text-white"
                : "bg-[var(--color-plum)] text-white hover:bg-[var(--color-primary-dark)]"
            }`}
          >
            {copied === `${match.id}-B` ? "Copied!" : "Copy SMS"}
          </button>
        </div>
        <p className="text-xs text-[var(--color-plum-light)] mt-1">{match.reasonForB}</p>
      </div>
    </div>
  );
}
