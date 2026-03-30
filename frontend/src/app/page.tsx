"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import { useKatibay } from "@/hooks/KatibayContext";

/* ── Inline SVG icon helper ──────────────────────────────────────────────── */
const Icon = ({ d, size = 18, style }: { d: string; size?: number; style?: React.CSSProperties }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }}>
    <path d={d} />
  </svg>
);

const PATHS = {
  wallet:    "M21 12V7H5a2 2 0 0 1 0-4h14v4M21 12v5H5a2 2 0 0 0 0 4h14v-4",
  shield:    "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check:     "M20 6 9 17l-5-5",
  user:      "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  award:     "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12",
  logout:    "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  arrow:     "M5 12h14M12 5l7 7-7 7",
  external:  "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  copy:      "M8 8h8v8H8z M16 8V4H4v12h4",
  fire:      "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  key:       "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  zap:       "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
};

const Spinner = () => <span className="spinner" />;

/* ── Step card for "How it works" ────────────────────────────────────────── */
function StepCard({ n, icon, title, desc, delay }: { n: number; icon: string; title: string; desc: string; delay: string }) {
  return (
    <div className="step-card" style={{ animationDelay: delay }}>
      <div className="step-num">{n}</div>
      <div className="step-icon-wrap">
        <Icon d={icon} size={22} />
      </div>
      <h3 className="step-title">{title}</h3>
      <p className="step-desc">{desc}</p>
    </div>
  );
}

/* ── Stat highlight ──────────────────────────────────────────────────────── */
function StatHighlight({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="stat-hl">
      <div className="stat-hl-value">{value}</div>
      <div className="stat-hl-label">{label}</div>
      {sub && <div className="stat-hl-sub">{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const { address, connect, disconnect, isConnecting, vouchForStudent, checkVerified, getIdentity } = useKatibay();
  const appRef = useRef<HTMLElement>(null);

  const [tab, setTab] = useState<"vouch" | "verify" | "identity">("vouch");

  const [vStudent, setVStudent] = useState("");
  const [vHash, setVHash]       = useState("");
  const [vLoading, setVLoading] = useState(false);
  const [vResult, setVResult]   = useState<{ text: string; ok: boolean } | null>(null);

  const [chStudent, setChStudent] = useState("");
  const [chLoading, setChLoading] = useState(false);
  const [chResult, setChResult]   = useState<{ text: string; ok: boolean } | null>(null);

  const [idStudent, setIdStudent] = useState("");
  const [idLoading, setIdLoading] = useState(false);
  const [idResult, setIdResult]   = useState<{ text: string; ok: boolean } | null>(null);

  const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const handleVouch = async () => {
    setVLoading(true); setVResult(null);
    const tid = toast.loading("Signing & broadcasting to Stellar…");
    try {
      const tx: any = await vouchForStudent(vStudent, vHash);
      toast.success("Vouch recorded on-chain! 🎉", { id: tid });
      setVResult({ text: `✓ Vouch submitted successfully\nTx hash: ${tx?.hash ?? "confirmed"}`, ok: true });
    } catch (e: any) {
      toast.error(e.message || "Vouch failed", { id: tid });
      setVResult({ text: e.message || String(e), ok: false });
    } finally { setVLoading(false); }
  };

  const handleCheck = async () => {
    setChLoading(true); setChResult(null);
    const tid = toast.loading("Simulating contract call…");
    try {
      const verified = await checkVerified(chStudent);
      if (verified) {
        toast.success("Student is verified ✅", { id: tid });
        setChResult({ text: "✅  VERIFIED\n\nThis student has received ≥ 3 community vouches\nand is eligible to receive a KTBY credential token.", ok: true });
      } else {
        toast("Not yet verified — more vouches needed.", { icon: "⏳", id: tid });
        setChResult({ text: "⏳  NOT VERIFIED\n\nThis student has not reached the 3-vouch threshold yet.\nMore community members need to vouch.", ok: false });
      }
    } catch (e: any) {
      toast.error(e.message || "Check failed", { id: tid });
      setChResult({ text: e.message || String(e), ok: false });
    } finally { setChLoading(false); }
  };

  const handleIdentity = async () => {
    setIdLoading(true); setIdResult(null);
    const tid = toast.loading("Fetching identity record from ledger…");
    try {
      const record = await getIdentity(idStudent);
      if (!record) {
        toast("No record found for this address.", { icon: "🔍", id: tid });
        setIdResult({ text: "No identity record found for this address.", ok: false });
      } else {
        toast.success("Identity record loaded!", { id: tid });
        const text = JSON.stringify(record, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
        setIdResult({ text, ok: true });
      }
    } catch (e: any) {
      toast.error(e.message || "Fetch failed", { id: tid });
      setIdResult({ text: e.message || String(e), ok: false });
    } finally { setIdLoading(false); }
  };

  const copyContract = () => {
    navigator.clipboard.writeText(CONTRACT_ID);
    toast.success("Contract ID copied!", { icon: "📋" });
  };

  const scrollToApp = () => appRef.current?.scrollIntoView({ behavior: "smooth" });

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="page">

      {/* ══ NAVBAR ════════════════════════════════════════════════════════ */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🪪</span>
          <span className="brand-name">Katibay</span>
          <span className="brand-tag">Testnet</span>
        </div>
        <div className="navbar-center">
          <a href="#why"  className="nav-link">Why Katibay</a>
          <a href="#how"  className="nav-link">How It Works</a>
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

      {/* ══ HERO ══════════════════════════════════════════════════════════ */}
      <section className="hero-section">
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Stellar Soroban · Community Identity · Philippines
          </div>
          <h1 className="hero-h1">
            Your community<br />
            <span className="hero-highlight">vouches for you.</span><br />
            The blockchain remembers.
          </h1>
          <p className="hero-sub">
            Katibay breaks the Philippine ID loop — where every document requires another document —
            by putting community trust on an immutable ledger that no politician can delete
            and no fire can burn.
          </p>
          <div className="hero-actions">
            <button className="btn btn-gold btn-lg" onClick={scrollToApp}>
              Launch App <Icon d={PATHS.arrow} size={16} />
            </button>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-ghost btn-lg"
            >
              View Contract <Icon d={PATHS.external} size={15} />
            </a>
          </div>
          <div className="hero-contract">
            <span className="hero-contract-label">Live on Stellar Testnet</span>
            <span className="hero-contract-id">{CONTRACT_ID.slice(0, 16)}…{CONTRACT_ID.slice(-8)}</span>
            <button className="icon-btn" onClick={copyContract} title="Copy contract ID">
              <Icon d={PATHS.copy} size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ══ THE PROBLEM / STORY ════════════════════════════════════════════ */}
      <section id="why" className="section story-section">
        <div className="section-label">The Problem</div>
        <div className="story-grid">
          <div className="story-text">
            <h2 className="section-h2">
              Maria can't apply<br />
              for a scholarship.<br />
              <span style={{ color: "var(--gold-light)" }}>She has no ID.</span>
            </h2>
            <p className="story-body">
              She's 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship —
              but the application asks for a valid government ID.
              <br /><br />
              She tries to get a PhilSys card. PhilSys asks for a supporting document.
              The barangay will issue a certification — but the captain is busy,
              the secretary lost the logbook, and her neighbor who could vouch for her
              has no official standing.
              <br /><br />
              She misses the deadline.
            </p>
            <div className="callout">
              <Icon d={PATHS.fire} size={18} style={{ color: "var(--gold)" }} />
              <p>
                <strong>The Philippine ID Loop:</strong> you need an ID to get an ID.
                Every record is paper. Papers get lost, burned, or quietly shelved by
                someone with something to gain.
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
                "Katibay puts barangay trust on an immutable ledger — no deletion,
                no fire, no corruption. The community has always known who Maria is.
                Now the blockchain does too."
              </blockquote>
            </div>
          </div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section id="how" className="section">
        <div className="section-label">The Solution</div>
        <h2 className="section-h2 center">How Katibay Works</h2>
        <p className="section-sub center">
          A four-step flow from community trust to scholarship access — all on-chain,
          all tamper-proof, no government ID required.
        </p>
        <div className="steps-grid">
          <StepCard n={1} icon={PATHS.user} delay="0.05s"
            title="Student Registers"
            desc="The student creates a Stellar wallet and submits a SHA-256 hash of their full name — privacy-preserving, immutable." />
          <StepCard n={2} icon={PATHS.shield} delay="0.1s"
            title="Community Vouches"
            desc="Trusted community members (barangay captain, teacher, neighbors) call vouch_for() and sign on-chain. Each vouch is permanent." />
          <StepCard n={3} icon={PATHS.award} delay="0.15s"
            title="Threshold Met → Credential Issued"
            desc="Once 3 vouches are recorded, the Soroban contract mints 1 KTBY credential token to the student's Stellar wallet." />
          <StepCard n={4} icon={PATHS.zap} delay="0.2s"
            title="Scholarship Unlocked"
            desc="The student calls apply_scholarship() — their on-chain credential replaces the physical ID requirement. Permanently on ledger." />
        </div>
        <div className="flow-bar">
          <span className="flow-step">vouch_for()</span>
          <Icon d={PATHS.arrow} size={14} style={{ color: "var(--text-3)" }} />
          <span className="flow-step">check_verified()</span>
          <Icon d={PATHS.arrow} size={14} style={{ color: "var(--text-3)" }} />
          <span className="flow-step">issue_credential()</span>
          <Icon d={PATHS.arrow} size={14} style={{ color: "var(--text-3)" }} />
          <span className="flow-step flow-step-gold">apply_scholarship()</span>
        </div>
      </section>

      {/* ══ STELLAR FEATURES ═══════════════════════════════════════════════ */}
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
            <p>A Stellar asset token issued only after 3+ community vouches. It's composable — any participating school or DAO can verify it on-chain.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--success)" }}><Icon d={PATHS.shield} size={20} /></div>
            <h4>Tamper-Proof Audit Trail</h4>
            <p>Every vouch emits an immutable on-chain event. No politician can delete a vouch. No barangay fire can erase this logbook.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--gold-light)" }}><Icon d={PATHS.zap} size={20} /></div>
            <h4>Freighter Wallet Integration</h4>
            <p>Browser-native Stellar wallet signing. No private keys exposed. Transactions are prepared, simulated, signed, and broadcast in one flow.</p>
          </div>
        </div>
      </section>

      {/* ══ APP SECTION ════════════════════════════════════════════════════ */}
      <section id="app" ref={appRef} className="section app-section">
        <div className="section-label">Live Contract</div>
        <h2 className="section-h2 center">Interact With Katibay</h2>
        <p className="section-sub center">
          Connect your Freighter wallet (set to Testnet) and interact with the deployed Soroban contract.
        </p>

        {!address && (
          <div className="connect-cta">
            <p>You need a Freighter wallet to submit vouches. Checking and reading identity is open to all.</p>
            <button className="btn btn-gold btn-lg" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Spinner /> : <Icon d={PATHS.wallet} />}
              {isConnecting ? "Connecting…" : "Connect Freighter to Testnet"}
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="tab-switcher">
          {(["vouch", "verify", "identity"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`tab-btn ${tab === t ? "tab-active" : ""}`}>
              <Icon d={t === "vouch" ? PATHS.shield : t === "verify" ? PATHS.check : PATHS.user} size={16} />
              {t === "vouch" ? "Submit Vouch" : t === "verify" ? "Check Status" : "View Identity"}
            </button>
          ))}
        </div>

        <div className="app-card">
          {/* VOUCH */}
          {tab === "vouch" && (
            <>
              <div className="app-card-header">
                <div className="card-icon icon-gold"><Icon d={PATHS.shield} /></div>
                <div>
                  <div className="card-title">Vouch For a Student</div>
                  <div className="card-subtitle">
                    As a community member — barangay official, teacher, or neighbor — submit an on-chain vouch.
                    Your Freighter wallet signature is required. A student needs 3 unique vouches.
                  </div>
                </div>
              </div>
              <hr className="divider" />
              <div className="field">
                <label className="field-label">Student's Stellar Address (G…)</label>
                <input className="field-input" placeholder="GABCDE…" value={vStudent} onChange={e => setVStudent(e.target.value)} />
              </div>
              <div className="field" style={{ marginTop: "1rem" }}>
                <label className="field-label">Name Hash — SHA-256 of student's full name (64 hex chars)</label>
                <input className="field-input" placeholder="4d61726961416e6e61…" maxLength={64} value={vHash} onChange={e => setVHash(e.target.value)} />
                <p className="field-hint">Tip: run <code>echo -n "Full Name" | sha256sum</code> to generate the hash.</p>
              </div>
              <div style={{ marginTop: "1.25rem" }}>
                <button className="btn btn-gold btn-full" onClick={handleVouch} disabled={vLoading || !address}>
                  {vLoading ? <><Spinner /> Signing & Broadcasting…</> : <><Icon d={PATHS.shield} size={16} /> Submit Vouch on Stellar</>}
                </button>
                {!address && <p className="field-hint" style={{ textAlign: "center", marginTop: "0.5rem" }}>Connect Freighter first ↑</p>}
              </div>
              {vResult && <div className={`result-box ${vResult.ok ? "ok" : "err"}`}>{vResult.text}</div>}
            </>
          )}

          {/* VERIFY */}
          {tab === "verify" && (
            <>
              <div className="app-card-header">
                <div className="card-icon icon-blue"><Icon d={PATHS.check} /></div>
                <div>
                  <div className="card-title">Check Verified Status</div>
                  <div className="card-subtitle">
                    Read-only contract simulation — no wallet or gas needed.
                    Returns <code>true</code> if the student has received ≥ 3 community vouches.
                  </div>
                </div>
              </div>
              <hr className="divider" />
              <div className="field">
                <label className="field-label">Student's Stellar Address (G…)</label>
                <input className="field-input" placeholder="GABCDE…" value={chStudent} onChange={e => setChStudent(e.target.value)} />
              </div>
              <div style={{ marginTop: "1.25rem" }}>
                <button className="btn btn-navy btn-full" onClick={handleCheck} disabled={chLoading}>
                  {chLoading ? <><Spinner /> Querying contract…</> : <><Icon d={PATHS.check} size={16} /> Check Verification Status</>}
                </button>
              </div>
              {chResult && <div className={`result-box ${chResult.ok ? "ok" : "err"}`}>{chResult.text}</div>}
            </>
          )}

          {/* IDENTITY */}
          {tab === "identity" && (
            <>
              <div className="app-card-header">
                <div className="card-icon icon-green"><Icon d={PATHS.user} /></div>
                <div>
                  <div className="card-title">View Identity Record</div>
                  <div className="card-subtitle">
                    Fetch the full <code>IdentityRecord</code> stored on the Soroban contract — vouch count,
                    verification status, name hash, and scholarship slot.
                  </div>
                </div>
              </div>
              <hr className="divider" />
              <div className="field">
                <label className="field-label">Student's Stellar Address (G…)</label>
                <input className="field-input" placeholder="GABCDE…" value={idStudent} onChange={e => setIdStudent(e.target.value)} />
              </div>
              <div style={{ marginTop: "1.25rem" }}>
                <button className="btn btn-navy btn-full" onClick={handleIdentity} disabled={idLoading}>
                  {idLoading ? <><Spinner /> Loading record…</> : <><Icon d={PATHS.user} size={16} /> Fetch Identity Record</>}
                </button>
              </div>
              {idResult && <div className={`result-box ${idResult.ok ? "ok" : "err"}`}>{idResult.text}</div>}
            </>
          )}
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-icon" style={{ width: 28, height: 28, fontSize: "0.85rem" }}>🪪</span>
          <span className="brand-name" style={{ fontSize: "1rem" }}>Katibay</span>
        </div>
        <div className="footer-links">
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank" rel="noopener noreferrer">
            View on Stellar Expert <Icon d={PATHS.external} size={12} />
          </a>
          <a href="https://github.com/stellar/soroban-sdk" target="_blank" rel="noopener noreferrer">
            Soroban SDK
          </a>
          <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">
            Freighter Wallet
          </a>
        </div>
        <p className="footer-copy">
          Built for Filipino students who deserve a scholarship. Powered by Stellar.
        </p>
      </footer>
    </div>
  );
}
