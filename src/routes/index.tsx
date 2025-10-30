import React from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import Spinner from "../components/ui/spinner";

export const Route = createFileRoute("/")({
	component: HomePage,
});

function HomePage() {
	const { isLoaded, isSignedIn } = useAuth();
	const navigate = useNavigate();

	React.useEffect(() => {
		if (isLoaded && !isSignedIn) {
			navigate({ to: "/sign-in" });
		}
	}, [isLoaded, isSignedIn, navigate]);

	if (!isLoaded) {
		return (
			<Spinner
				title="Loading Quizable"
				subtitle="Please wait while we check your authentication status..."
			/>
		);
	}

	if (!isSignedIn) {
		return null;
	}

	return (
		<main className="min-h-dvh flex items-center justify-center">
			<h1 className="text-3xl font-bold">Welcome to Quizable</h1>
		</main>
	);
}
