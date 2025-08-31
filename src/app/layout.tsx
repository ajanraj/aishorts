import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Create short videos easily",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full touch-manipulation">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-full font-sans`}
      >
        <QueryProvider>
          <div className="text-surface-500 h-lvh text-sm leading-6">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
