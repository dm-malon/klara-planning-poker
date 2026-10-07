import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/Toaster";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const ui = Geist({ variable: "--font-ui", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KLARA PLANNING POKER",
  description: "Real-time planning poker with memes. Estimate together, laugh together.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c18",
  width: "device-width",
  initialScale: 1,
};

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem("klara.theme");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${ui.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
