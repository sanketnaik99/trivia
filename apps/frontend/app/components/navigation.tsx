'use client';

import Link from "next/link";
import { useUser } from '@clerk/nextjs';
import { Button } from "@/components/ui/button";

export function Navigation() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <nav className="flex gap-4">
        <div className="h-4 w-12 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
      </nav>
    );
  }

  return (
    <nav className="flex gap-4">
      <Link href="/room">
        <Button variant="ghost" size="sm">Rooms</Button>
      </Link>
      {isSignedIn && (
      <Link href="/groups">
        <Button variant="ghost" size="sm">Groups</Button>
      </Link>
      )}
    </nav>
  );
}