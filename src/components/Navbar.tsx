"use client";

import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Settings, UserCircle2 } from "lucide-react";

const navItems = [{ name: "Fleet Status", href: "/fleet" }];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = authClient.useSession();
  const isLoggedIn = Boolean(session);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current) {
        return;
      }

      if (!dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onClickOutside);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    setIsMenuOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="h-16 bg-indigo-50 flex items-center px-4">
      {/* LEFT SECTION  */}
      <div className="flex-1 flex items-center justify-between">
        <div className="flex items-center gap-6 ml-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium pb-1 transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? "text-blue-600 border-blue-600"
                    : "text-slate-500 border-transparent hover:text-blue-600"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
      {/* RIGHT SECTION */}
      <div className="flex items-center gap-4 px-4">
        {/* ICONS & PROFILE */}
        <div className="flex items-center gap-4">
          <button className="cursor-pointer p-2 text-gray-900 hover:text-blue-600">
            <Bell className="w-5 h-5" />
          </button>

          <button className="cursor-pointer p-2 text-gray-900 hover:text-blue-600">
            <Settings className="w-5 h-5" />
          </button>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-transparent p-0.5 transition hover:border-blue-200"
            >
              <span className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
                <Image
                  src="/circle-user.svg"
                  alt="user"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                />
              </span>
              <ChevronDown className="h-4 w-4 text-slate-500" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {isLoggedIn ? (
                  <>
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <UserCircle2 className="h-4 w-4" />
                      Profile
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 p-1">
                    <p className="px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7b8598]">
                      Admin Access
                    </p>
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="block cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Admin Log in
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="mt-1 block cursor-pointer rounded-lg px-3 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Continue as User
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
