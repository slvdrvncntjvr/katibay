"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useKatibay, IdentityRecord } from "@/hooks/KatibayContext";

// ── SHA-256 via Web Crypto API ───────────────────────────────────────────────
async function sha256hex(text: string): Promise<string> {
  if (!text.trim()) return "";
  try {
    const encoded = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "";
  }
}

// ── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    <path d={d} />
  </svg>
);
const PATHS = {
  wallet:  "M21 12V7H5a2 2 0 0 1 0-4h14v4M21 12v5H5a2 2 0 0 0 0 4h14v-4",
  shield:  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check:   "M20 6 9 17l-5-5",
  external:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  copy:    "M8 8h8v8H8zM16 8V4H4v12h4",
  fire:    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  award:   "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12",
  key:     "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  zap:     "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  logout:  "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  arrow:   "M5 12h14M12 5l7 7-7 7",
  search:  "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  message: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  hash:    "M4 9h16M4 15h16M10 3 8 21M16 3l-2 18",
  user:    "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  chevron: "M6 9l6 6 6-6",
};

// ── Role options ─────────────────────────────────────────────────────────────
const ROLES = [
  { value: "Barangay Official",           emoji: "🏛️", desc: "Captain, Kagawad, Lupon" },
  { value: "Teacher / Professor",          emoji: "📚", desc: "School or university educator" },
  { value: "Social Worker",               emoji: "🏥", desc: "Licensed welfare professional" },
  { value: "Neighbor / Community Member", emoji: "🏠", desc: "Long-time community resident" },
  { value: "Family Friend",               emoji: "👨‍👩‍👧", desc: "Personal acquaintance" },
  { value: "Other",                        emoji: "👤", desc: "Any trusted individual" },
];

const Spinner = () => <span className="spinner" />;

function MiniVouchRing({ count, verified }: { count: number; verified: boolean }) {
  return (
    <div className="mini-ring">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`mini-dot ${verified ? "mini-dot-green" : i < count ? "mini-dot-filled" : "mini-dot-empty"}`} />
      ))}
    </div>
  );
}

function StepCard({ n, icon, title, desc, delay }: { n: number; icon: string; title: string; desc: string; delay: string }) {
  return (
    <div className="step-card" style={{ animationDelay: delay }}>
      <div className="step-num">{n}</div>
      <div className="step-icon-wrap"><Icon d={icon} size={22} /></div>
      <h3 className="step-title">{title}</h3>
      <p className="step-desc">{desc}</p>
    </div>
  );
}

function StatHighlight({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="stat-hl">
      <div className="stat-hl-value">{value}</div>
      <div className="stat-hl-label">{label}</div>
      {sub && <div className="stat-hl-sub">{sub}</div>}
    </div>
  );
}

export default function Home() {
  const { address, connect, disconnect, isConnecting, vouchForStudent, checkVerified, getIdentity, isRegistered } = useKatibay();
  const appRef = useRef<HTMLElement>(null);
  const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

  const [tab, setTab] = useState<"vouch" | "lookup">("vouch");

  // ── Vouch state ───────────────────────────────────────────────────────────
  const [vStudent, setVStudent]   = useState("");
  const [vHash, setVHash]         = useState("");
  const [vMsg, setVMsg]           = useState("");
  const [vRole, setVRole]         = useState("");
  const [vLoading, setVLoading]   = useState(false);
  const [vResult, setVResult]     = useState<{ text: string; ok: boolean } | null>(null);
  const [isVoucherRegistered, setIsVoucherRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    if (address) {
      isRegistered(address).then(setIsVoucherRegistered);
    } else {
      setIsVoucherRegistered(null);
    }
  }, [address, isRegistered]);

  // SHA-256 helper (in vouch form)
  const [helperOpen, setHelperOpen]   = useState(false);
  const [helperName, setHelperName]   = useState("");
  const [helperHash, setHelperHash]   = useState("");

  useEffect(() => {
    const t = setTimeout(async () => { setHelperHash(await sha256hex(helperName)); }, 120);
    return () => clearTimeout(t);
  }, [helperName]);

  // ── Lookup state ──────────────────────────────────────────────────────────
  const [luAddr, setLuAddr]         = useState("");
  const [luLoading, setLuLoading]   = useState(false);
  const [luIdentity, setLuIdentity] = useState<IdentityRecord | null | "not_found">(null);
  const [luVerified, setLuVerified] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleVouch = async () => {
    if (!vRole) { toast.error("Please select your role first."); return; }
    if (isVoucherRegistered === false) {
      toast.error("You must register your identity before you can vouch.");
      return;
    }

    setVLoading(true); setVResult(null);

    // Validate student is registered first
    try {
      const studentReg = await isRegistered(vStudent.trim());
      if (!studentReg) {
        toast.error("Student has not registered their identity yet.", { icon: "⚠️" });
        setVResult({ text: "Error: The student must register their identity on-chain before receiving vouches.", ok: false });
        setVLoading(false);
        return;
      }
    } catch {
      // Ignore format errors here, let the contract TX fail gracefully below
    }

    const fullMessage = `[${vRole}] ${vMsg.trim()}`;
    const tid = toast.loading("Signing & broadcasting to Stellar…");
    try {
      const tx: any = await vouchForStudent(vStudent.trim(), vHash.trim(), fullMessage);
      toast.success("Vouch recorded on-chain! 🎉", { id: tid });
      setVResult({
        text: `✓ Vouch submitted on Stellar ledger\nRole: ${vRole}\nTx hash: ${tx?.hash ?? "confirmed"}`,
        ok: true,
      });
    } catch (e: any) {
      toast.error(e.message || "Vouch failed", { id: tid });
      setVResult({ text: e.message || String(e), ok: false });
    } finally {
      setVLoading(false);
    }
  };

  const handleLookup = async () => {
    setLuLoading(true); setLuIdentity(null);
    const tid = toast.loading("Fetching from ledger…");
    try {
      const [id, ver] = await Promise.all([
        getIdentity(luAddr.trim()),
        checkVerified(luAddr.trim()),
      ]);
      setLuIdentity(id ?? "not_found");
      setLuVerified(!!ver);
      if (!id) toast("No record found.", { icon: "🔍", id: tid });
      else toast.success("Identity loaded!", { id: tid });
    } catch (e: any) {
      toast.error(e.message || "Lookup failed", { id: tid });
      setLuIdentity("not_found");
    } finally {
      setLuLoading(false);
    }
  };

  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ID);
    toast.success("Contract ID copied!", { icon: "📋" });
  };

  const scrollToApp = () => appRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="page">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════════ */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🪪</span>
          <span className="brand-name">Katibay</span>
          <span className="brand-tag">Testnet</span>
        </div>
        <div className="navbar-center">
          <a href="#why"  className="nav-link">Why Katibay</a>
          <a href="#how"  className="nav-link">How It Works</a>
          <Link href="/register" className="nav-link">Register</Link>
          <a href="#app"  className="nav-link">Launch App</a>
        </div>
        <div className="navbar-right">
          {address ? (
            <>
              <div className="wallet-address">
                <span className="wallet-dot" />
                {address.slice(0, 6)}…{address.slice(-4)}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                <Icon d={PATHS.logout} size={15} /> Disconnect
              </button>
            </>
          ) : (
            <button className="btn btn-gold" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Spinner /> : <Icon d={PATHS.wallet} size={16} />}
              {isConnecting ? "Connecting…" : "Connect Freighter"}
            </button>
          )}
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          Stellar Soroban · Community Identity · Philippines
        </div>
        <h1 className="hero-h1">
          Your barangay vouches for you.<br />
          <span className="hero-highlight">The blockchain remembers.</span>
        </h1>
        <p className="hero-sub">
          Katibay breaks the Philippine ID loop — where every document requires another
          document — by putting community trust on an immutable ledger that no politician
          can delete and no fire can burn.
        </p>
        <div className="hero-actions">
          <button className="btn btn-gold btn-lg" onClick={scrollToApp}>
            Launch App <Icon d={PATHS.arrow} size={16} />
          </button>
          <Link href="/register" className="btn btn-ghost btn-lg">
            <Icon d={PATHS.user} size={16} /> Register as Student
          </Link>
        </div>
        <div className="hero-contract">
          <span className="hero-contract-label">Live on Stellar Testnet</span>
          <span className="hero-contract-id">{CONTRACT_ID.slice(0, 16)}…{CONTRACT_ID.slice(-8)}</span>
          <button className="icon-btn" onClick={copyContract} title="Copy contract ID">
            <Icon d={PATHS.copy} size={14} />
          </button>
        </div>
      </section>

      {/* ══ STORY ═══════════════════════════════════════════════════════════ */}
      <section id="why" className="section story-section">
        <div className="section-label">The Problem</div>
        <div className="story-grid">
          <div className="story-text">
            <h2 className="section-h2">
              Maria can&apos;t apply for a scholarship.<br />
              <span style={{ color: "var(--gold-light)" }}>She has no ID.</span>
            </h2>
            <p className="story-body">
              She&apos;s 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship
              but the application asks for a valid government ID.
              <br /><br />
              She tries to get a PhilSys card. PhilSys asks for a supporting document. The barangay
              will issue a certification — but the captain is busy, the secretary lost the logbook,
              and her neighbor who could vouch for her has no official standing.
              <br /><br />
              She misses the deadline.
            </p>
            <div className="callout">
              <Icon d={PATHS.fire} size={18} />
              <p>
                <strong>The Philippine ID Loop:</strong> you need an ID to get an ID. Every record
                is paper. Papers get lost, burned, or quietly shelved by someone with
                something to gain.
              </p>
            </div>
          </div>
          <div className="story-stats">
            <StatHighlight value="4.6M" label="Out-of-school youth in PH" sub="Philippine Statistics Authority, 2022" />
            <StatHighlight value="₱12K" label="Avg CHED scholarship / sem" sub="Withheld from unverified students" />
            <StatHighlight value="0" label="Documents Maria needs" sub="With Katibay's on-chain ID" />
            <div className="story-quote">
              <div className="quote-bar" />
              <blockquote>
                &ldquo;Katibay puts barangay trust on an immutable ledger — no deletion, no fire,
                no corruption. The community has always known who Maria is. Now the blockchain
                does too.&rdquo;
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how" className="section">
        <div className="section-label">The Solution</div>
        <h2 className="section-h2 center">How Katibay Works</h2>
        <p className="section-sub center">
          From community trust to scholarship access — on-chain, tamper-proof, no government ID required.
        </p>
        <div className="steps-grid">
          <StepCard n={1} icon={PATHS.user}    delay="0.05s" title="Student Registers"    desc="Creates a Stellar wallet. Generates their name hash at /register — a SHA-256 fingerprint shared with their vouchers." />
          <StepCard n={2} icon={PATHS.message} delay="0.1s"  title="Community Attests"   desc="Barangay captain, teacher, or neighbor submits a signed on-chain vouch with their role and written attestation — permanently stored." />
          <StepCard n={3} icon={PATHS.award}   delay="0.15s" title="Credential Issued"   desc="After 3 attestations, the Soroban contract mints 1 KTBY credential token to the student's Stellar wallet. Composable with any dApp." />
          <StepCard n={4} icon={PATHS.zap}     delay="0.2s"  title="Scholarship Unlocked" desc="apply_scholarship() records the student's school slot on-chain. Their KTBY token replaces a physical ID requirement." />
        </div>
        <div className="flow-bar">
          <span className="flow-step">register()</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step">vouch_for(message)</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step">issue_credential()</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step flow-step-gold">apply_scholarship()</span>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section className="section features-section">
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><Icon d={PATHS.key} size={20} /></div>
            <h4>Soroban Smart Contracts</h4>
            <p>Multi-sig vouching logic, threshold enforcement, double-vouch prevention, and scholarship slot matching — all in Rust, compiled to WASM.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--info)" }}><Icon d={PATHS.award} size={20} /></div>
            <h4>KTBY Credential Token</h4>
            <p>A Stellar asset token minted only after 3+ community attestations. Composable — any school or DAO can verify it on-chain.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--success)" }}><Icon d={PATHS.shield} size={20} /></div>
            <h4>On-Chain Attestation Messages</h4>
            <p>Every vouch stores the community member&apos;s role and written statement permanently on the Stellar ledger — readable by anyone, immutable forever.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--gold-light)" }}><Icon d={PATHS.zap} size={20} /></div>
            <h4>SHA-256 Privacy Hashing</h4>
            <p>Names are stored as SHA-256 hashes — privacy-preserving. The Register page generates your hash instantly in the browser, no terminal needed.</p>
          </div>
        </div>
      </section>

      {/* ══ APP SECTION ════════════════════════════════════════════════════ */}
      <section id="app" ref={appRef} className="section app-section">
        <div className="section-label">Live Contract</div>
        <h2 className="section-h2 center">Interact With Katibay</h2>
        <p className="section-sub center">
          Connect Freighter (Testnet mode) to submit vouches, or look up any student
          without a wallet. Not a voucher? <Link href="/register" style={{ color: "var(--gold-light)" }}>Register as a student →</Link>
        </p>

        {!address && (
          <div className="connect-cta">
            <p>Connect Freighter to submit vouches. Lookup is open to everyone, no wallet needed.</p>
            <button className="btn btn-gold btn-lg" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Spinner /> : <Icon d={PATHS.wallet} />}
              {isConnecting ? "Connecting…" : "Connect Freighter to Testnet"}
            </button>
          </div>
        )}

        <div className="tab-switcher">
          <button onClick={() => setTab("vouch")} className={`tab-btn ${tab === "vouch" ? "tab-active" : ""}`}>
            <Icon d={PATHS.shield} size={16} /> Submit Vouch
          </button>
          <button onClick={() => setTab("lookup")} className={`tab-btn ${tab === "lookup" ? "tab-active" : ""}`}>
            <Icon d={PATHS.search} size={16} /> Student Lookup
          </button>
        </div>

        <div className="app-card">

          {/* ── VOUCH TAB ─────────────────────────────────────────────────── */}
          {tab === "vouch" && (
            <>
              <div className="app-card-header">
                <div className="card-icon icon-gold"><Icon d={PATHS.shield} /></div>
                <div>
                  <div className="card-title">Vouch For a Student</div>
                  <div className="card-subtitle">
                    As a trusted community member, sign an on-chain attestation with your role and statement.
                    A student needs exactly 3 unique vouches to become VERIFIED.
                  </div>
                </div>
              </div>
              <hr className="divider" />

              {address && isVoucherRegistered === false && (
                <div className="result-box err" style={{ marginBottom: "1.25rem", textAlign: "left", fontSize: "0.9rem" }}>
                  <strong>⚠️ Registration Required</strong><br/>
                  You cannot submit vouches until you commit your own identity to the blockchain.<br/>
                  <Link href="/register" style={{ textDecoration: "underline", fontWeight: 700, display: "inline-block", marginTop: "0.5rem" }}>
                    → Go to Register Page
                  </Link>
                </div>
              )}

              {/* Student address */}
              <div className="field">
                <label className="field-label">Student&apos;s Stellar Address (G…)</label>
                <input className="field-input" placeholder="GABCDE…" value={vStudent} onChange={(e) => setVStudent(e.target.value)} />
              </div>

              {/* SHA-256 Helper */}
              <div className="hash-helper" style={{ marginTop: "0.75rem" }}>
                <button
                  className="hash-helper-toggle"
                  onClick={() => setHelperOpen(!helperOpen)}
                  type="button"
                >
                  <Icon d={PATHS.hash} size={14} />
                  {helperOpen ? "Hide name hash calculator" : "Don\u2019t have the name hash? Calculate it here →"}
                  <Icon d={PATHS.chevron} size={14} style={{ transform: helperOpen ? "rotate(180deg)" : "none", transition: "0.2s" } as React.CSSProperties} />
                </button>
                {helperOpen && (
                  <div className="hash-helper-body" style={{ animation: "fadeUp 0.25s ease" }}>
                    <input
                      className="field-input"
                      placeholder="Type student's full name…"
                      value={helperName}
                      onChange={(e) => setHelperName(e.target.value)}
                    />
                    {helperHash && (
                      <div className="hash-helper-result">
                        <span className="hash-helper-value">{helperHash}</span>
                        <button
                          className="btn btn-gold btn-sm"
                          onClick={() => { setVHash(helperHash); setHelperOpen(false); toast.success("Hash filled in!", { icon: "🔢" }); }}
                        >
                          Use this hash ↑
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Name hash */}
              <div className="field" style={{ marginTop: "0.75rem" }}>
                <label className="field-label">Name Hash — SHA-256 (64 hex chars)</label>
                <input className="field-input" placeholder="4d61726961416e6e61…" maxLength={64} value={vHash} onChange={(e) => setVHash(e.target.value)} />
              </div>

              {/* Role selector */}
              <div style={{ marginTop: "1.1rem" }}>
                <label className="field-label">Your Role in the Community</label>
                <div className="role-grid">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`role-card ${vRole === r.value ? "role-card-active" : ""}`}
                      onClick={() => setVRole(r.value)}
                    >
                      <span className="role-card-emoji">{r.emoji}</span>
                      <span className="role-card-label">{r.value}</span>
                      <span className="role-card-desc">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attestation message */}
              <div className="field" style={{ marginTop: "1rem" }}>
                <label className="field-label">
                  <Icon d={PATHS.message} size={13} /> Your Attestation Statement (stored on-chain)
                </label>
                <textarea
                  className="field-input"
                  placeholder={
                    vRole === "Barangay Official"
                      ? "e.g. I am the barangay captain of Brgy. 105, Tondo. I have known this student for 5 years and can attest to their identity and character."
                      : vRole === "Teacher / Professor"
                      ? "e.g. I am a teacher at Tondo National High School. This student is enrolled in my class and I can verify their identity."
                      : "Describe your relationship to the student and why you can vouch for their identity…"
                  }
                  value={vMsg}
                  onChange={(e) => setVMsg(e.target.value.slice(0, 280))}
                />
                <div className="char-count">
                  {vRole && <span style={{ color: "var(--gold-light)", marginRight: "0.5rem" }}>Will be submitted as: [{vRole}] {vMsg.trim().slice(0, 30)}{vMsg.length > 30 ? "…" : ""}</span>}
                  {vMsg.length}/280
                </div>
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <button
                  className="btn btn-gold btn-full"
                  onClick={handleVouch}
                  disabled={vLoading || !address || !vStudent || !vHash || !vRole || !vMsg.trim() || isVoucherRegistered === false}
                >
                  {vLoading
                    ? <><Spinner /> Signing & Broadcasting…</>
                    : <><Icon d={PATHS.shield} size={16} /> Submit Attestation on Stellar</>}
                </button>
                {!address && (
                  <p className="field-hint" style={{ textAlign: "center", marginTop: "0.5rem" }}>
                    Connect Freighter first ↑
                  </p>
                )}
              </div>

              {vResult && (
                <div className={`result-box ${vResult.ok ? "ok" : "err"}`}>{vResult.text}</div>
              )}
              {vResult?.ok && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <Link href={`/student/${encodeURIComponent(vStudent.trim())}`} className="btn btn-ghost btn-sm">
                    View {vStudent.slice(0, 8)}… profile →
                  </Link>
                </div>
              )}
            </>
          )}

          {/* ── LOOKUP TAB ────────────────────────────────────────────────── */}
          {tab === "lookup" && (
            <>
              <div className="app-card-header">
                <div className="card-icon icon-blue"><Icon d={PATHS.search} /></div>
                <div>
                  <div className="card-title">Student Identity Lookup</div>
                  <div className="card-subtitle">
                    Fetch any student&apos;s on-chain record, vouch count, and verification status.
                    Read-only — no wallet needed. Share the profile link with scholarship bodies.
                  </div>
                </div>
              </div>
              <hr className="divider" />

              <div className="field">
                <label className="field-label">Student&apos;s Stellar Address (G…)</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <input className="field-input" placeholder="GABCDE…" value={luAddr} onChange={(e) => setLuAddr(e.target.value)} />
                  <button className="btn btn-navy" onClick={handleLookup}
                    disabled={luLoading || !luAddr.trim()}
                    style={{ flexShrink: 0, borderRadius: "10px", padding: "0 1rem" }}>
                    {luLoading ? <Spinner /> : <Icon d={PATHS.search} size={16} />}
                  </button>
                </div>
              </div>

              {luIdentity && luIdentity !== "not_found" && (
                <div className="student-preview-card">
                  <div className="student-preview-row">
                    <div>
                      <div className="student-preview-status">
                        <MiniVouchRing count={luIdentity.vouch_count} verified={luVerified} />
                        <span style={{ color: luVerified ? "var(--success)" : "var(--gold-light)", marginLeft: "0.5rem" }}>
                          {luVerified ? "VERIFIED" : `${luIdentity.vouch_count}/3 Vouches`}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-3)", marginTop: "0.35rem" }}>
                        {luAddr.slice(0, 12)}…{luAddr.slice(-8)}
                      </p>
                    </div>
                    <Link href={`/student/${encodeURIComponent(luAddr.trim())}`} className="btn btn-gold btn-sm">
                      View Full Profile →
                    </Link>
                  </div>
                </div>
              )}

              {luIdentity === "not_found" && (
                <div className="result-box err">No identity record found for this address.</div>
              )}

              <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(240,165,0,0.04)", borderRadius: "var(--r-md)", border: "1px dashed rgba(240,165,0,0.15)" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--text-3)", lineHeight: 1.65 }}>
                  👀 <strong style={{ color: "var(--text-2)" }}>Try it now:</strong> Look up our verified test student —
                  <br />
                  <code style={{ fontSize: "0.78rem" }}>GA7SB3REG3SNRMLHFJNZ5M3W33VOSUBZUYL6URGADAPILTJYPVWJIHPT</code>
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="navbar-brand">
          <span className="brand-icon" style={{ width: 28, height: 28, fontSize: "0.85rem" }}>🪪</span>
          <span className="brand-name" style={{ fontSize: "1rem" }}>Katibay</span>
        </div>
        <div className="footer-links">
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`} target="_blank" rel="noopener noreferrer">
            Stellar Expert <Icon d={PATHS.external} size={12} />
          </a>
          <Link href="/register">Register as Student</Link>
          <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Freighter Wallet</a>
        </div>
        <p className="footer-copy">Built for Filipino students who deserve a scholarship. Powered by Stellar.</p>
      </footer>
    </div>
  );
}
