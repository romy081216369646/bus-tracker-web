import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ReactNode } from "react";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const role = session?.user.role === "admin" ? "admin" : "user";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
