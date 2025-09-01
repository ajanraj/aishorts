import type { Metadata } from "next";
import Script from "next/script";
import { Sidebar } from "@/components/dashboard/sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/toaster";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export const metadata: Metadata = {
  title: "Dashboard | Lemon Squeezy Next.js Billing Template",
};

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main
      className={`${GeistSans.variable} ${GeistMono.variable} min-h-full font-sans`}
    >
      {/* Load the Lemon Squeezy's Lemon.js script before the page is interactive. */}
      <Script
        src="https://app.lemonsqueezy.com/js/lemon.js"
        strategy="beforeInteractive"
      />

      <SidebarProvider>
        <div className="text-surface-500 h-lvh text-sm leading-6 md:grid md:grid-cols-[270px_1fr]">
          <Sidebar />
          <div className="flex flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:hidden">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="CursorShorts.com" className="h-8" />
                <span className="text-lg font-bold">CursorShorts</span>
              </div>
            </header>
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>
        </div>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </main>
  );
}
