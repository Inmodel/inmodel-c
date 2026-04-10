import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProviders } from "./providers";
import { Toaster } from "sonner";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JudgeChain | On-Chain Hackathon Scoring",
  description: "Transparent, immutable judging powered by Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <WalletProviders>
          {children}
          <Toaster position="bottom-right" theme="light" expand={true} richColors />
        </WalletProviders>
      </body>
    </html>
  );
}
