import type { Metadata } from "next";
import { Space_Mono, DM_Sans, JetBrains_Mono } from "next/font/google";
import { WalletProviders } from "./providers";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { Sidebar } from "@/components/Sidebar";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const spaceMono = Space_Mono({ variable: "--font-display", subsets: ["latin"], weight: ["400", "700"] });
const dmSans = DM_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["300", "400", "500"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-data", subsets: ["latin"], weight: ["300", "400", "500", "700"] });

export const metadata: Metadata = {
  title: "JudgeChain | On-Chain Hackathon Scoring",
  description: "Transparent, immutable judging powered by Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceMono.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <WalletProviders>
            <div className="layout-root">
              <div style={{ gridRow: "1 / -1", gridColumn: "1" }}>
                 <Sidebar />
              </div>
              
              <header style={{ gridColumn: "2", gridRow: "1", display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "0 24px", height: "56px", borderBottom: "1px solid var(--bg-border)", background: "var(--bg-base)", top: 0, position: "sticky", zIndex: 10 }}>
                 <ThemeToggle />
                 <WalletButton />
              </header>

              <div style={{ gridColumn: "2", gridRow: "2", overflowY: "auto", position: "relative" }}>
                {children}
              </div>
            </div>
            <Toaster position="bottom-right" theme="dark" expand={false} richColors toastOptions={{ className: 'toast' }} />
          </WalletProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
