"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SignInAction({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <SignInButton mode="modal" forceRedirectUrl={pathname}>
      <Button className={className}>Sign in</Button>
    </SignInButton>
  );
}

export function SignUpAction({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "default" | "outline";
}) {
  const pathname = usePathname();

  return (
    <SignUpButton mode="modal" forceRedirectUrl={pathname}>
      <Button className={className} variant={variant}>
        Create account
      </Button>
    </SignUpButton>
  );
}
