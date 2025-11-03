'use client';

import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: "h-8 w-8"
          }
        }}
      />
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <SignInButton mode="modal">
        <Button variant="outline" size="sm">
          Sign In
        </Button>
      </SignInButton>
      <SignUpButton mode="modal">
        <Button size="sm">
          Sign Up
        </Button>
      </SignUpButton>
    </div>
  );
}