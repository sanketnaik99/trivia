import { createFileRoute } from "@tanstack/react-router";
import { SignIn } from "@clerk/clerk-react";

export const Route = createFileRoute("/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<SignIn />
		</div>
	);
}
