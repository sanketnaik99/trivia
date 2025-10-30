import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: BlankPage,
});

function BlankPage() {
	// Intentionally left minimal for a clean starting point
	return <main className="min-h-dvh" />;
}
