import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

export const config = {
  matcher: ['/room/:path*', '/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};