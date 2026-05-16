import { ReactNode } from "react";
import "./globals.css";
import { Providers } from "@/components/providers";

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
