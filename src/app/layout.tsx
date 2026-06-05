import { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

// Initialize batch scheduler (server-side only)
import { initBatchScheduler } from "@/lib/init-batch-scheduler";
if (typeof window === "undefined") {
  initBatchScheduler();
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100 text-slate-900">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
