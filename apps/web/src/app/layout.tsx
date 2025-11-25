import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

import { WalletProvider } from "@/components/wallet-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import localFont from "next/font/local";
import { Providers } from "@/components/Providers";

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
          <Providers>
            <WalletProvider>
              <AuthProvider>
                <main className="flex-1">{children}</main>
              </AuthProvider>
            </WalletProvider>
          </Providers>
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
            duration={4000}
            // toastOptions={{
            //   style: {
            //     background: "#0F1729",
            //     border: "1px solid #1E2943",
            //     color: "#E4E4E7",
            //     borderRadius: "8px",
            //     boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            //   },
            //   classNames: {
            //     toast: "flex items-center gap-3",
            //     title: "font-semibold text-sm",
            //     description: "text-xs text-gray-400",
            //     closeButton: "bg-gray-700 hover:bg-gray-600 text-gray-200",
            //   },
            // }}
          />
        </div>
      </body>
    </html>
  );
}
