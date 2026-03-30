import type { Metadata } from "next";
import { KatibayProvider } from "@/hooks/KatibayContext";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Katibay | Community-Vouched Identity on Stellar",
  description:
    "Your community knows who you are. Now the blockchain does too. Katibay uses Soroban smart contracts to give urban poor Filipino students a tamper-proof on-chain identity.",
  openGraph: {
    title: "Katibay | On-Chain Identity for Filipino Students",
    description: "Community-vouched on-chain identity on the Stellar testnet.",
    siteName: "Katibay",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <KatibayProvider>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#142347",
                color: "#e8edf5",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: "0.9rem",
              },
              success: {
                iconTheme: { primary: "#22c55e", secondary: "#142347" },
              },
              error: {
                iconTheme: { primary: "#f43f5e", secondary: "#142347" },
              },
            }}
          />
          {children}
        </KatibayProvider>
      </body>
    </html>
  );
}
