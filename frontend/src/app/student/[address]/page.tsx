"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useKatibay, Attestation, IdentityRecord, CONTRACT_ID } from "@/hooks/KatibayContext";

const Icon = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    <path d={d} />
  </svg>
);

const PATHS = {
  arrow:    "M19 12H5M12 5l-7 7 7 7",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check:    "M20 6 9 17l-5-5",
  copy:     "M8 8h8v8H8zM16 8V4H4v12h4",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  clock:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  award:    "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12",
};

// ── Role metadata for badge rendering ────────────────────────────────────────
const ROLE_META: Record<string, { emoji: string; cls: string }> = {
  "Barangay Official":           { emoji: "🏛️", cls: "role-badge-gold" },
  "Teacher / Professor":          { emoji: "📚", cls: "role-badge-blue" },
  "Social Worker":               { emoji: "🏥", cls: "role-badge-green" },
  "Neighbor / Community Member": { emoji: "🏠", cls: "role-badge-purple" },
  "Family Friend":               { emoji: "👨‍👩‍👧", cls: "role-badge-pink" },
  "Other":                        { emoji: "👤", cls: "role-badge-grey" },
};

function parseAttestation(message: string) {
  const match = message.match(/^\[([^\]]+)\]\s*/);
  if (match && ROLE_META[match[1]]) {
    return { role: match[1], text: message.slice(match[0].length), ...ROLE_META[match[1]] };
  }
  return { role: null, text: message, emoji: "💬", cls: "role-badge-grey" };
}

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}>
    <span className="spinner spinner-lg" />
  </div>
);

function VouchRing({ count, threshold = 3 }: { count: number; threshold?: number }) {
  const pct = Math.min(count / threshold, 1);
  const r = 42, cx = 50, cy = 50;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="vouch-ring-wrap">
      <svg width={120} height={120} viewBox="0 0 100 100">
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={count >= threshold ? "var(--success)" : "var(--gold)"}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="vouch-ring-label">
        <div className="vouch-ring-count">{count}/{threshold}</div>
        <div className="vouch-ring-sub">vouches</div>
      </div>
    </div>
  );
}

function AddressAvatar({ address }: { address: string }) {
  // Deterministic color from address chars
  const h = [...address.slice(1, 7)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = h % 360;
  return (
    <div style={{
      width: 56, height: 56, borderRadius: "50%",
      background: `hsl(${hue},55%,40%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.1rem", fontFamily: "Space Grotesk", fontWeight: 700,
      color: "white", flexShrink: 0,
      border: "2px solid rgba(255,255,255,0.15)",
    }}>
      {address.slice(1, 3).toUpperCase()}
    </div>
  );
}

export default function StudentProfilePage() {
  const params = useParams();
  const rawAddress = params?.address as string;
  const address = rawAddress ? decodeURIComponent(rawAddress) : "";

  const { getIdentity, getAttestations, checkVerified } = useKatibay();

  const [identity, setIdentity] = useState<IdentityRecord | null>(null);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [verified, setVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!address) return;
    (async () => {
      setLoading(true);
      try {
        const [id, atts, ver] = await Promise.all([
          getIdentity(address),
          getAttestations(address),
          checkVerified(address),
        ]);
        setIdentity(id);
        setAttestations(atts);
        setVerified(!!ver);
      } catch (e: any) {
        setError(e.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied!");
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const copyShare = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Profile link copied!", { icon: "🔗" });
  };

  return (
    <div className="profile-page">

      {/* Ambient orbs */}
      <div className="hero-orb hero-orb-1" style={{ opacity: 0.3 }} />
      <div className="hero-orb hero-orb-2" style={{ opacity: 0.2 }} />

      {/* Sticky mini nav */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🪪</span>
          <span className="brand-name">Katibay</span>
          <span className="brand-tag">Testnet</span>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm">
          <Icon d={PATHS.arrow} size={15} /> Back to Home
        </Link>
      </nav>

      <div className="profile-container">
        {loading && <Spinner />}

        {!loading && error && (
          <div className="profile-error">
            <p style={{ color: "var(--error)", marginBottom: "1rem" }}>{error}</p>
            <Link href="/" className="btn btn-ghost btn-sm">← Go Back</Link>
          </div>
        )}

        {!loading && !error && !identity && (
          <div className="profile-empty">
            <Icon d={PATHS.user} size={40} style={{ color: "var(--text-3)", marginBottom: "1rem" }} />
            <h2>No Record Found</h2>
            <p>This address has not been registered in Katibay yet.</p>
            <p style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-3)", marginTop: "0.5rem", wordBreak: "break-all" }}>{address}</p>
            <Link href="/" style={{ marginTop: "1.5rem" }} className="btn btn-navy btn-sm">← Go Home</Link>
          </div>
        )}

        {!loading && !error && identity && (
          <>
            {/* Identity Card */}
            <div className="profile-card">
              <div className="profile-card-top">
                <div className="profile-left">
                  <div className={`profile-status-badge ${verified ? "verified" : "pending"}`}>
                    {verified
                      ? <><Icon d={PATHS.check} size={14} /> VERIFIED</>
                      : <><Icon d={PATHS.clock} size={14} /> PENDING</>
                    }
                  </div>
                  <h1 className="profile-title">Student Identity</h1>
                  <div className="profile-address-row">
                    <span className="profile-address">{address.slice(0, 12)}…{address.slice(-8)}</span>
                    <button className="icon-btn" onClick={copyAddress} title="Copy address">
                      <Icon d={PATHS.copy} size={14} />
                    </button>
                    <a
                      href={`https://stellar.expert/explorer/testnet/account/${address}`}
                      target="_blank" rel="noopener noreferrer"
                      className="icon-btn" title="View on Stellar Expert"
                    >
                      <Icon d={PATHS.external} size={14} />
                    </a>
                  </div>
                  <div className="profile-meta">
                    <div className="profile-meta-item">
                      <span className="profile-meta-label">Name Hash</span>
                      <span className="profile-meta-value mono">
                        {typeof identity.name_hash === "string"
                          ? (identity.name_hash as string).slice(0, 12) + "…"
                          : "(encoded)"}
                      </span>
                    </div>
                    {identity.scholarship_slot !== undefined && identity.scholarship_slot !== null && (
                      <div className="profile-meta-item">
                        <span className="profile-meta-label">Scholarship Slot</span>
                        <span className="profile-meta-value">#{identity.scholarship_slot}</span>
                      </div>
                    )}
                    <div className="profile-meta-item">
                      <span className="profile-meta-label">Contract</span>
                      <span className="profile-meta-value mono">{CONTRACT_ID.slice(0, 10)}…</span>
                    </div>
                  </div>
                </div>
                <VouchRing count={identity.vouch_count} threshold={3} />
              </div>

              {verified && (
                <div className="verified-banner">
                  <Icon d={PATHS.award} size={18} />
                  This student has received a KTBY credential token and is eligible for CHED scholarship applications.
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
                <button className="btn btn-gold btn-sm" onClick={copyShare}>
                  🔗 Share Profile
                </button>
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                >
                  View Contract <Icon d={PATHS.external} size={13} />
                </a>
              </div>
            </div>

            {/* Attestations */}
            <div className="att-section">
              <h2 className="att-title">
                <Icon d={PATHS.shield} size={18} style={{ color: "var(--gold)" }} />
                Community Attestations
                <span className="att-count">{attestations.length}</span>
              </h2>

              {attestations.length === 0 && (
                <div className="att-empty">No attestations yet. Vouches will appear here once submitted.</div>
              )}

              <div className="att-list">
                {attestations.map((att, i) => {
                  const parsed = parseAttestation(att.message);
                  return (
                    <div key={i} className="att-card">
                      <div className="att-card-header">
                        <AddressAvatar address={att.voucher} />
                        <div style={{ flex: 1 }}>
                          <div className="att-voucher">{att.voucher.slice(0, 8)}…{att.voucher.slice(-6)}</div>
                          {parsed.role ? (
                            <span className={`role-badge ${parsed.cls}`}>
                              {parsed.emoji} {parsed.role}
                            </span>
                          ) : (
                            <div className="att-label">Community member #{i + 1}</div>
                          )}
                        </div>
                        <div className="att-badge">On-chain ✓</div>
                      </div>
                      <div className="att-message">&ldquo;{parsed.text}&rdquo;</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
