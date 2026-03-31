"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import toast from "react-hot-toast";
import {
  requestAccess,
  getAddress,
  signTransaction,
  getNetworkDetails,
} from "@stellar/freighter-api";
import {
  Address,
  Contract,
  rpc,
  StrKey,
  TransactionBuilder,
  xdr,
  scValToNative,
  nativeToScVal,
} from "@stellar/stellar-sdk";

export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE!;
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;

export interface Attestation {
  voucher: string;
  message: string;
}

export interface IdentityRecord {
  student: string;
  name_hash: string;
  vouch_count: number;
  verified: boolean;
  scholarship_slot?: number;
}

interface KatibayContextType {
  address: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  vouchForStudent: (student: string, hashHex: string, message: string) => Promise<any>;
  checkVerified: (student: string) => Promise<boolean | null>;
  getIdentity: (student: string) => Promise<IdentityRecord | null>;
  getAttestations: (student: string) => Promise<Attestation[]>;
}

const KatibayContext = createContext<KatibayContextType | undefined>(undefined);

export function KatibayProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    const tid = toast.loading("Connecting to Freighter…");
    try {
      const access = await requestAccess();
      if (access.error) throw new Error(access.error);

      const netDetails = await getNetworkDetails();
      if (netDetails.error) throw new Error(netDetails.error);
      if (netDetails.networkPassphrase && netDetails.networkPassphrase !== NETWORK_PASSPHRASE) {
        throw new Error("Wrong network — switch Freighter to Testnet in its settings.");
      }

      const addr = await getAddress();
      if (addr.error) throw new Error(addr.error);

      setAddress(addr.address);
      toast.success(`Connected: ${addr.address.slice(0, 6)}…${addr.address.slice(-4)}`, { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Freighter.", { id: tid });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    toast("Wallet disconnected.", { icon: "👋" });
  };

  const getServer = () => new rpc.Server(RPC_URL);

  const pollTx = async (server: rpc.Server, hash: string) => {
    for (let i = 0; i < 30; i++) {
      const tx = await server.getTransaction(hash);
      if (tx.status === "SUCCESS") return tx;
      if (tx.status === "FAILED") throw new Error("Transaction failed on-chain.");
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error("Timed out waiting for confirmation.");
  };

  const simulate = async (fnName: string, args: xdr.ScVal[]) => {
    const server = getServer();
    const sourceAddress = address || (args[0] ? scValToNative(args[0]) as string : null);
    if (!sourceAddress || typeof sourceAddress !== "string") {
      throw new Error("Need a source account — connect Freighter or provide an address.");
    }
    const account = await server.getAccount(sourceAddress);
    const op = new Contract(CONTRACT_ID).call(fnName, ...args);
    const tx = new TransactionBuilder(account, { fee: "1000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(op)
      .setTimeout(60)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new Error((sim as any).error || "Simulation failed.");
    return sim.result?.retval;
  };

  const vouchForStudent = async (studentAddress: string, nameHashHex: string, message: string) => {
    if (!address) throw new Error("Connect your wallet first.");
    if (!StrKey.isValidEd25519PublicKey(studentAddress)) throw new Error("Invalid student address.");
    if (!/^[0-9a-fA-F]{64}$/.test(nameHashHex)) throw new Error("Name hash must be 64 hex chars.");
    if (!message.trim()) throw new Error("Please write a vouch message — it goes on the blockchain.");

    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(nameHashHex.slice(i * 2, i * 2 + 2), 16);

    const server = getServer();
    const account = await server.getAccount(address);

    const op = new Contract(CONTRACT_ID).call(
      "vouch_for",
      new Address(address).toScVal(),
      new Address(studentAddress).toScVal(),
      xdr.ScVal.scvBytes(bytes as any),
      nativeToScVal(message, { type: "string" }),
    );

    const tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(op)
      .setTimeout(120)
      .build();

    const prepared = await server.prepareTransaction(tx);
    const signResult = await signTransaction(prepared.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
    if (signResult.error) throw new Error(signResult.error as string);

    const signedXdr = typeof signResult === "string"
      ? signResult
      : (signResult as any).signedTxXdr ?? (signResult as any).xdr;
    if (!signedXdr) throw new Error("Could not retrieve signed XDR from Freighter.");

    const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
    const sent = await server.sendTransaction(signedTx);
    if (sent.status === "ERROR") throw new Error("RPC rejected the transaction.");

    return await pollTx(server, sent.hash);
  };

  const checkVerified = async (studentAddress: string): Promise<boolean | null> => {
    if (!StrKey.isValidEd25519PublicKey(studentAddress)) throw new Error("Invalid student address.");
    const retval = await simulate("check_verified", [new Address(studentAddress).toScVal()]);
    return retval ? (scValToNative(retval) as boolean) : false;
  };

  const getIdentity = async (studentAddress: string): Promise<IdentityRecord | null> => {
    if (!StrKey.isValidEd25519PublicKey(studentAddress)) throw new Error("Invalid student address.");
    const retval = await simulate("get_identity", [new Address(studentAddress).toScVal()]);
    if (!retval) return null;
    const raw = scValToNative(retval);
    if (!raw) return null;
    return raw as IdentityRecord;
  };

  const getAttestations = async (studentAddress: string): Promise<Attestation[]> => {
    if (!StrKey.isValidEd25519PublicKey(studentAddress)) throw new Error("Invalid student address.");
    const retval = await simulate("get_attestations", [new Address(studentAddress).toScVal()]);
    if (!retval) return [];
    const raw = scValToNative(retval);
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
      voucher: item?.voucher ?? item?.[0] ?? "unknown",
      message: item?.message ?? item?.[1] ?? "",
    }));
  };

  return (
    <KatibayContext.Provider value={{
      address, isConnecting, connect, disconnect,
      vouchForStudent, checkVerified, getIdentity, getAttestations,
    }}>
      {children}
    </KatibayContext.Provider>
  );
}

export const useKatibay = () => {
  const ctx = useContext(KatibayContext);
  if (!ctx) throw new Error("useKatibay must be used inside KatibayProvider");
  return ctx;
};
