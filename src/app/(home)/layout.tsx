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
        <div className="text-surface-500 flex h-lvh w-full text-sm leading-6">
          <div className="flex-0">
            <Sidebar />
          </div>
          <div className="flex w-full flex-1 flex-col">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 md:hidden">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="CursorShorts.com" className="h-8" />
                <span className="text-lg font-bold">CursorShorts</span>
              </div>
            </header>
            <div className="w-full flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </main>
  );
}
