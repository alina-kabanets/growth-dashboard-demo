import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { BRAND } from "@/lib/brand";
import "./globals.css";

// Roboto throughout, as in the app.
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: `Growth Analytics · ${BRAND.name} (demo with invented data)`,
  description:
    "A rebuild of the Growth Analytics dashboard designed and built by Alina Kabanets. Every number is invented.",
  robots: { index: false, follow: false },
};

// Sets the theme before paint, so dark mode never flashes light.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${roboto.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full font-sans text-sm">{children}</body>
    </html>
  );
}
