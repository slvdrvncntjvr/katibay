"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useKatibay, IdentityRecord } from "@/hooks/KatibayContext";

const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const PATHS = {
  wallet:   "M21 12V7H5a2 2 0 0 1 0-4h14v4M21 12v5H5a2 2 0 0 0 0 4h14v-4",
  shield:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  check:    "M20 6 9 17l-5-5",
  user:     "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3",
  copy:     "M8 8h8v8H8zM16 8V4H4v12h4",
  fire:     "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  award:    "M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89 7 23l5-3 5 3-1.21-9.12",
  key:      "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  zap:      "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  logout:   "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  arrow:    "M5 12h14M12 5l7 7-7 7",
  search:   "M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
  message:  "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
};

const Spinner = () => <span className="spinner" />;

function MiniVouchRing({ count, verified }: { count: number; verified: boolean }) {
  return (
    <div className="mini-ring">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`mini-dot ${
            verified ? "mini-dot-green"
            : i < count ? "mini-dot-filled"
            : "mini-dot-empty"
          }`}
        />
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
  const { address, connect, disconnect, isConnecting, vouchForStudent, checkVerified, getIdentity } = useKatibay();
  const appRef = useRef<HTMLElement>(null);

  const [tab, setTab] = useState<"vouch" | "lookup">("vouch");

  // ── Vouch form state ──────────────────────────────────────────────────────
  const [vStudent, setVStudent] = useState("");
  const [vHash, setVHash]       = useState("");
  const [vMsg, setVMsg]         = useState("");
  const [vLoading, setVLoading] = useState(false);
  const [vResult, setVResult]   = useState<{ text: string; ok: boolean } | null>(null);

  // ── Lookup state ──────────────────────────────────────────────────────────
  const [luAddr, setLuAddr]           = useState("");
  const [luLoading, setLuLoading]     = useState(false);
  const [luIdentity, setLuIdentity]   = useState<IdentityRecord | null | "not_found">(null);
  const [luVerified, setLuVerified]   = useState<boolean>(false);

  const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleVouch = async () => {
    setVLoading(true); setVResult(null);
    const tid = toast.loading("Signing & broadcasting to Stellar…");
    try {
      const tx: any = await vouchForStudent(vStudent.trim(), vHash.trim(), vMsg.trim());
      toast.success("Vouch recorded on-chain! 🎉", { id: tid });
      setVResult({
        text: `✓ Vouch submitted successfully\nYour attestation is now permanently on the Stellar ledger.\nTx hash: ${tx?.hash ?? "confirmed"}`,
        ok: true,
      });
    } catch (e: any) {
      toast.error(e.message || "Vouch failed", { id: tid });
      setVResult({ text: e.message || String(e), ok: false });
    } finally { setVLoading(false); }
  };

  const handleLookup = async () => {
    setLuLoading(true); setLuIdentity(null);
    const tid = toast.loading("Fetching identity from ledger…");
    try {
      const [id, ver] = await Promise.all([
        getIdentity(luAddr.trim()),
        checkVerified(luAddr.trim()),
      ]);
      setLuIdentity(id ?? "not_found");
      setLuVerified(!!ver);
      if (!id) {
        toast("No identity record found.", { icon: "🔍", id: tid });
      } else {
        toast.success("Identity loaded!", { id: tid });
      }
    } catch (e: any) {
      toast.error(e.message || "Lookup failed", { id: tid });
      setLuIdentity("not_found");
    } finally { setLuLoading(false); }
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
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Stellar Soroban · Community Identity · Philippines
          </div>
          <h1 className="hero-h1">
            Your barangay vouches for you.<br />
            <span className="hero-highlight">The blockchain remembers.</span>
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

      {/* ══ PROBLEM / STORY ════════════════════════════════════════════════ */}
      <section id="why" className="section story-section">
        <div className="section-label">The Problem</div>
        <div className="story-grid">
          <div className="story-text">
            <h2 className="section-h2">
              Maria can&apos;t apply for a scholarship.<br />
              <span style={{ color: "var(--gold-light)" }}>She has no ID.</span>
            </h2>
            <p className="story-body">
              She&apos;s 17, finishing Grade 12 in Tondo. She qualifies for a CHED scholarship —
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
              <Icon d={PATHS.fire} size={18} />
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
                &ldquo;Katibay puts barangay trust on an immutable ledger — no deletion,
                no fire, no corruption. The community has always known who Maria is.
                Now the blockchain does too.&rdquo;
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
          From community trust to scholarship access — on-chain,
          tamper-proof, no government ID required.
        </p>
        <div className="steps-grid">
          <StepCard n={1} icon={PATHS.user}   delay="0.05s" title="Student Registers" desc="Creates a Stellar wallet. A SHA-256 hash of their name is submitted — privacy-preserving and immutable." />
          <StepCard n={2} icon={PATHS.message} delay="0.1s"  title="Community Attests" desc="Trusted members — barangay captain, teacher, neighbor — sign an on-chain vouch with a written attestation message. Stored permanently." />
          <StepCard n={3} icon={PATHS.award}  delay="0.15s" title="Credential Issued" desc="Once 3 attestations are recorded, the Soroban contract mints 1 KTBY credential token to the student's wallet. Composable with any dApp." />
          <StepCard n={4} icon={PATHS.zap}    delay="0.2s"  title="Scholarship Unlocked" desc="apply_scholarship() records the student's school slot on-chain. Their credential replaces the physical ID requirement." />
        </div>
        <div className="flow-bar">
          <span className="flow-step">vouch_for(message)</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step">check_verified()</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step">issue_credential()</span>
          <Icon d={PATHS.arrow} size={14} />
          <span className="flow-step flow-step-gold">apply_scholarship()</span>
        </div>
      </section>

      {/* ══ FEATURES ═══════════════════════════════════════════════════════ */}
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
            <p>A Stellar asset token issued only after 3+ community attestations. Composable — any school or DAO can verify it on-chain.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "var(--success)" }}><Icon d={PATHS.shield} size={20} /></div>
            <h4>On-Chain Attestation Messages</h4>
            <p>Every vouch stores the community member&apos;s written statement permanently on the Stellar ledger — readable by anyone, immutable forever.</p>
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
          Connect your Freighter wallet (Testnet mode) and interact with the live Soroban contract.
          Or look up any student&apos;s on-chain identity — no wallet needed.
        </p>

        {!address && (
          <div className="connect-cta">
            <p>Connect Freighter to submit vouches. Looking up student identities is open to everyone.</p>
            <button className="btn btn-gold btn-lg" onClick={connect} disabled={isConnecting}>
              {isConnecting ? <Spinner /> : <Icon d={PATHS.wallet} />}
              {isConnecting ? "Connecting…" : "Connect Freighter to Testnet"}
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button onClick={() => setTab("vouch")}
            className={`tab-btn ${tab === "vouch" ? "tab-active" : ""}`}>
            <Icon d={PATHS.shield} size={16} /> Submit Vouch
          </button>
          <button onClick={() => setTab("lookup")}
            className={`tab-btn ${tab === "lookup" ? "tab-active" : ""}`}>
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
                    As a trusted community member, submit an on-chain attestation.
                    Your wallet signature + message go permanently on the Stellar ledger.
                    A student needs exactly 3 unique vouches to become verified.
                  </div>
                </div>
              </div>
              <hr className="divider" />

              <div className="field">
                <label className="field-label">Student&apos;s Stellar Address (G…)</label>
                <input className="field-input" placeholder="GABCDE…" value={vStudent} onChange={e => setVStudent(e.target.value)} />
              </div>

              <div className="field" style={{ marginTop: "1rem" }}>
                <label className="field-label">Name Hash — SHA-256 of student&apos;s full name (64 hex chars)</label>
                <input className="field-input" placeholder="4d61726961416e6e61…" maxLength={64} value={vHash} onChange={e => setVHash(e.target.value)} />
                <p className="field-hint">Generate: <code>echo -n "Full Name" | sha256sum</code></p>
              </div>

              <div className="field" style={{ marginTop: "1rem" }}>
                <label className="field-label">
                  <Icon d={PATHS.message} size={13} /> Your Attestation Message (stored on-chain)
                </label>
                <textarea
                  className="field-input"
                  placeholder="e.g. I am the barangay captain of Brgy. 105, Tondo. I have known this student for 5 years and can attest to their identity and character."
                  value={vMsg}
                  onChange={e => setVMsg(e.target.value.slice(0, 300))}
                />
                <div className="char-count">{vMsg.length}/300</div>
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <button className="btn btn-gold btn-full" onClick={handleVouch}
                  disabled={vLoading || !address || !vStudent || !vHash || !vMsg.trim()}>
                  {vLoading
                    ? <><Spinner /> Signing & Broadcasting…</>
                    : <><Icon d={PATHS.shield} size={16} /> Submit Attestation on Stellar</>}
                </button>
                {!address && <p className="field-hint" style={{ textAlign: "center", marginTop: "0.5rem" }}>Connect Freighter first ↑</p>}
              </div>

              {vResult && (
                <div className={`result-box ${vResult.ok ? "ok" : "err"}`}>{vResult.text}</div>
              )}
              {vResult?.ok && (
                <div style={{ marginTop: "0.75rem", textAlign: "center" }}>
                  <Link href={`/student/${encodeURIComponent(vStudent.trim())}`}
                    className="btn btn-ghost btn-sm">
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
                    Fetch any student&apos;s on-chain identity record, vouch count, and verification status.
                    Read-only — no wallet needed. Share the profile link with scholarship bodies.
                  </div>
                </div>
              </div>
              <hr className="divider" />

              <div className="field">
                <label className="field-label">Student&apos;s Stellar Address (G…)</label>
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <input className="field-input" placeholder="GABCDE…" value={luAddr} onChange={e => setLuAddr(e.target.value)} />
                  <button className="btn btn-navy" onClick={handleLookup} disabled={luLoading || !luAddr.trim()}
                    style={{ flexShrink: 0, borderRadius: "10px", padding: "0 1rem" }}>
                    {luLoading ? <Spinner /> : <Icon d={PATHS.search} size={16} />}
                  </button>
                </div>
              </div>

              {/* Student preview card */}
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
                    <Link
                      href={`/student/${encodeURIComponent(luAddr.trim())}`}
                      className="btn btn-gold btn-sm"
                    >
                      View Full Profile →
                    </Link>
                  </div>
                </div>
              )}

              {luIdentity === "not_found" && (
                <div className="result-box err">No identity record found for this address.</div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════ */}
      <footer className="footer">
        <div className="navbar-brand">
          <span className="brand-icon" style={{ width: 28, height: 28, fontSize: "0.85rem" }}>🪪</span>
          <span className="brand-name" style={{ fontSize: "1rem" }}>Katibay</span>
        </div>
        <div className="footer-links">
          <a href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
            target="_blank" rel="noopener noreferrer">
            Stellar Expert <Icon d={PATHS.external} size={12} />
          </a>
          <a href="https://github.com/stellar/soroban-sdk" target="_blank" rel="noopener noreferrer">Soroban SDK</a>
          <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer">Freighter Wallet</a>
        </div>
        <p className="footer-copy">Built for Filipino students who deserve a scholarship. Powered by Stellar.</p>
      </footer>
    </div>
  );
}
