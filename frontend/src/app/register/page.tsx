"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useKatibay } from "@/hooks/KatibayContext";

// ── SHA-256 via Web Crypto API — no library needed ──────────────────────────
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

function AddressAvatar({ address }: { address: string }) {
  const h = [...address.slice(1, 7)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = h % 360;
  return (
    <div style={{
      width: 64, height: 64, borderRadius: "50%",
      background: `hsl(${hue},55%,40%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "1.3rem", fontFamily: "Space Grotesk", fontWeight: 700,
      color: "white", flexShrink: 0,
      border: "2px solid rgba(255,255,255,0.15)",
    }}>
      {address.slice(1, 3).toUpperCase()}
    </div>
  );
}

const STEPS = ["Your Identity", "Connect & Register", "Your KatibayID"];

export default function RegisterPage() {
  const { address, connect, isConnecting, registerIdentity, isRegistered } = useKatibay();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [hash, setHash] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Live SHA-256 as user types (debounced 120ms)
  useEffect(() => {
    const t = setTimeout(async () => {
      setHash(await sha256hex(name));
    }, 120);
    return () => clearTimeout(t);
  }, [name]);

  // When wallet connects, check if already registered
  useEffect(() => {
    if (address && step === 1 && hash) {
      isRegistered(address).then((reg) => {
        if (reg) {
          setAlreadyRegistered(true);
          setTimeout(() => setStep(2), 800);
        }
      });
    }
  }, [address, step, hash]);

  const handleRegisterOnChain = async () => {
    if (!address || !hash) return;
    setRegistering(true);
    const tid = toast.loading("Committing identity to Stellar ledger…");
    try {
      await registerIdentity(hash);
      toast.success("Identity registered on-chain! 🎉", { id: tid });
      setStep(2);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes("already registered")) {
        toast.success("Already registered — loading your KatibayID.", { id: tid, icon: "✓" });
        setAlreadyRegistered(true);
        setStep(2);
      } else {
        toast.error(msg, { id: tid });
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2200);
    toast.success(`${label} copied!`, { icon: "📋" });
  };

  const shareText =
`📋 My Katibay Student Information
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${name}
Wallet Address: ${address || "(connect wallet first)"}
Name Hash (SHA-256):
${hash}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Share this with trusted community members who can vouch for you at:
https://katibay.vercel.app`;

  return (
    <div className="register-page">
      <div className="hero-orb hero-orb-1" style={{ opacity: 0.22 }} />
      <div className="hero-orb hero-orb-2" style={{ opacity: 0.15 }} />

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="brand-icon">🪪</span>
          <span className="brand-name">Katibay</span>
          <span className="brand-tag">Testnet</span>
        </div>
        <Link href="/" className="btn btn-ghost btn-sm">← Back to Home</Link>
      </nav>

      <div className="register-container">

        {/* ── Stepper ── */}
        <div className="reg-stepper">
          {STEPS.map((s, i) => (
            <div key={s} className="reg-step-wrap" onClick={() => i < step && setStep(i)}
              style={{ cursor: i < step ? "pointer" : "default" }}>
              <div className={`reg-step-circle ${i < step ? "reg-step-done" : i === step ? "reg-step-active" : ""}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <div className={`reg-step-label ${i === step ? "reg-step-label-active" : ""}`}>{s}</div>
              {i < STEPS.length - 1 && (
                <div className={`reg-step-bar ${i < step ? "reg-step-bar-done" : ""}`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Step 0: Name + Hash ── */}
        {step === 0 && (
          <div className="reg-card" style={{ animation: "fadeUp 0.4s ease" }}>
            <div className="reg-card-icon">🆔</div>
            <h1 className="reg-title">What is your full name?</h1>
            <p className="reg-sub">
              Your name is converted to a SHA-256 hash — a privacy-preserving fingerprint
              stored on the blockchain without revealing your actual name publicly.
            </p>

            <div className="field" style={{ marginTop: "1.5rem" }}>
              <label className="field-label">Full Legal Name</label>
              <input
                className="field-input"
                style={{ fontSize: "1.05rem", padding: "0.85rem 1rem" }}
                placeholder="e.g. Maria Santos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {hash && (
              <div className="hash-preview" style={{ animation: "fadeUp 0.3s ease" }}>
                <div className="hash-preview-header">
                  <span>🔐 SHA-256 Hash</span>
                  <span className="hash-preview-hint">Share this with your vouchers</span>
                </div>
                <div className="hash-preview-value">{hash}</div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: "0.6rem" }}
                  onClick={() => handleCopy(hash, "Name hash")}
                >
                  {copied === "Name hash" ? "✓ Copied!" : "📋 Copy Hash"}
                </button>
              </div>
            )}

            <div className="reg-info-box">
              <strong>💡 Why a hash?</strong> Blockchain data is public. Hashing your name means
              only someone who already knows your name can verify it —
              protecting your privacy while still proving your identity exists.
            </div>

            <button
              className="btn btn-gold btn-full"
              style={{ marginTop: "1.5rem" }}
              disabled={!name.trim()}
              onClick={() => setStep(1)}
            >
              Continue → Connect Wallet
            </button>
            <p className="field-hint" style={{ textAlign: "center", marginTop: "0.6rem" }}>
              Already have your hash? <Link href="/" style={{ color: "var(--gold-light)" }}>Go to the app →</Link>
            </p>
          </div>
        )}

        {/* ── Step 1: Connect Wallet + Register On-Chain ── */}
        {step === 1 && (
          <div className="reg-card" style={{ animation: "fadeUp 0.4s ease" }}>
            <div className="reg-card-icon">👛</div>
            <h1 className="reg-title">Connect & Register On-Chain</h1>
            <p className="reg-sub">
              Connect Freighter, then commit your name hash permanently to the
              Stellar ledger. This is a real blockchain transaction.
            </p>

            {!address ? (
              <>
                <div className="reg-wallet-steps">
                  {[
                    { n: 1, text: <>Install <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-light)" }}>Freighter wallet</a> (Chrome/Firefox extension)</> },
                    { n: 2, text: <>Open Freighter → Settings → Network → select <strong>Testnet</strong></> },
                    { n: 3, text: <>Fund your account free at <a href="https://friendbot.stellar.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--gold-light)" }}>Stellar Friendbot</a></> },
                  ].map(({ n, text }) => (
                    <div key={n} className="reg-wallet-step">
                      <span className="reg-wallet-step-n">{n}</span>
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-gold btn-full" style={{ marginTop: "1.5rem" }}
                  onClick={connect} disabled={isConnecting}>
                  {isConnecting ? <><span className="spinner" /> Connecting…</> : "Connect Freighter →"}
                </button>
              </>
            ) : (
              <div style={{ marginTop: "1rem" }}>
                <div className="wallet-address" style={{ justifyContent: "center", width: "fit-content", margin: "0 auto 1.25rem" }}>
                  <span className="wallet-dot" />
                  {address.slice(0, 8)}…{address.slice(-6)}
                </div>

                <div className="reg-info-box" style={{ marginBottom: "1.25rem" }}>
                  <strong>📜 What this does:</strong> Calls <code style={{ fontSize: "0.8rem", color: "var(--gold-light)" }}>register(name_hash)</code> on the
                  Katibay Soroban contract. Your name hash is permanently bound to your wallet address on-chain.
                  No one can impersonate you or vouch for a student using your wallet without your signature.
                </div>

                <button
                  className="btn btn-gold btn-full"
                  onClick={handleRegisterOnChain}
                  disabled={registering || !hash}
                >
                  {registering
                    ? <><span className="spinner" /> Broadcasting to Stellar Testnet…</>
                    : "⛓️ Commit My Identity On-Chain"}
                </button>
                <button className="btn btn-ghost btn-sm"
                  style={{ width: "100%", marginTop: "0.75rem" }}
                  onClick={() => setStep(2)}>
                  Skip (offline — hash only)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: KatibayID Card ── */}
        {step === 2 && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
              <div className="reg-card-icon">{alreadyRegistered ? "✅" : "🎉"}</div>
              <h1 className="reg-title">
                {alreadyRegistered ? "Already Registered!" : "Identity Committed On-Chain!"}
              </h1>
              <p className="reg-sub">
                {alreadyRegistered
                  ? "Your wallet is already registered. Here is your KatibayID."
                  : <>Your name hash is now <strong>permanently bound</strong> to your wallet address on the Stellar Testnet. You can now receive vouches.</>}
              </p>
              {!alreadyRegistered && address && (
                <a
                  href={`https://stellar.expert/explorer/testnet/account/${address}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "0.8rem", color: "var(--gold-light)", textDecoration: "underline" }}
                >
                  View registration TX on Stellar Expert →
                </a>
              )}
            </div>

            {/* ── Physical-style KatibayID Card ── */}
            <div className="katibay-id-card">
              <div className="kid-header">
                <span style={{ fontSize: "1.4rem" }}>🪪</span>
                <span style={{ fontFamily: "Space Grotesk", fontWeight: 800, fontSize: "1rem", marginLeft: "0.4rem" }}>Katibay</span>
                <span className="brand-tag" style={{ marginLeft: "auto" }}>TESTNET</span>
              </div>

              {address && (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                  <AddressAvatar address={address} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1.15rem" }}>{name || "Student"}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>Katibay Community Member</div>
                  </div>
                </div>
              )}

              <div className="kid-field">
                <div className="kid-field-label">WALLET ADDRESS (STUDENT ID)</div>
                <div className="kid-field-row">
                  <span className="kid-field-value">{address || "(not connected)"}</span>
                  {address && (
                    <button className="icon-btn" onClick={() => handleCopy(address, "Address")} title="Copy">
                      {copied === "Address" ? "✓" : "📋"}
                    </button>
                  )}
                </div>
              </div>

              <div className="kid-field">
                <div className="kid-field-label">NAME HASH (SHA-256)</div>
                <div className="kid-field-row">
                  <span className="kid-field-value">{hash || "(no name entered)"}</span>
                  {hash && (
                    <button className="icon-btn" onClick={() => handleCopy(hash, "Hash")} title="Copy">
                      {copied === "Hash" ? "✓" : "📋"}
                    </button>
                  )}
                </div>
              </div>

              <div className="kid-divider" />
              <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textAlign: "center" }}>
                Powered by Stellar Soroban · Katibay Identity System
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button className="btn btn-gold btn-full" onClick={() => handleCopy(shareText, "Student info")}>
                📤 {copied === "Student info" ? "✓ Copied!" : "Copy & Share with My Vouchers"}
              </button>
              {address && (
                <Link href={`/student/${encodeURIComponent(address)}`} className="btn btn-ghost btn-full">
                  🔍 View My On-Chain Profile →
                </Link>
              )}
              <Link href="/" className="btn btn-navy btn-sm" style={{ textAlign: "center" }}>
                ← Back to Home
              </Link>
            </div>

            <div className="reg-info-box" style={{ marginTop: "1rem" }}>
              <strong>📌 What happens next?</strong> Share your wallet address and name hash with your
              barangay captain, teacher, or neighbors. They can go to <strong>katibay.vercel.app</strong>,
              open <strong>Submit Vouch</strong>, enter your details, write their attestation, and sign
              with Freighter. Once 3 people vouch, you&apos;ll be <strong>VERIFIED</strong> and eligible
              for scholarship applications.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
