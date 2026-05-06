"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { BriefcaseBusiness } from "lucide-react";

export function AppHeader({ logoHref }: { logoHref?: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#dfe4f3] bg-white/86 px-4 py-3 shadow-[0_10px_34px_rgba(92,99,180,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {logoHref ? (
          <Link
            href={logoHref}
            className="flex items-center gap-2 text-sm font-semibold"
            aria-label="Go to homepage"
          >
            <BriefcaseBusiness className="size-4" />
            Auto Vacancy
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BriefcaseBusiness className="size-4" />
            Auto Vacancy
          </div>
        )}
        <UserButton />
      </div>
    </header>
  );
}
