import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import localFont from "next/font/local";

const perfectDark = localFont({
  src: "../../public/fonts/pdark.ttf",
  variable: "--font-pdark",
});

const moonerRegular = localFont({
  src: "../../public/fonts/mooner-regular.otf",
  variable: "--font-mooner-regular",
});

const moonerRounded = localFont({
  src: "../../public/fonts/mooner-rounded.otf",
  variable: "--font-mooner-rounded",
});

const moonerRegularOutline = localFont({
  src: "../../public/fonts/mooner-regularoutline.otf",
  variable: "--font-mooner-regular-outline",
});

const moonerRoundedOutline = localFont({
  src: "../../public/fonts/mooner-roundedoutline.otf",
  variable: "--font-mooner-rounded-outline",
});

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "templat",
  description: "A new Celo blockchain project",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${montserrat.className} ${perfectDark.variable} ${moonerRegular.variable} ${moonerRounded.variable} ${moonerRegularOutline.variable} ${moonerRoundedOutline.variable} dark`}
      >
        {/* Navbar is included on all pages */}
        <div className="relative flex min-h-screen flex-col bg-[#10141E]">
          <WalletProvider>
            <AuthProvider>
              <main className="flex-1">{children}</main>
            </AuthProvider>
          </WalletProvider>
        </div>
      </body>
    </html>
  );
}
