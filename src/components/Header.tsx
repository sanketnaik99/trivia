import HeaderUser from "../integrations/clerk/header-user";
import { SignedIn } from "@clerk/clerk-react";
import ThemeToggle from "./theme-toggle";

export default function Header() {
	return (
		<header className="w-full flex items-center justify-between p-4 border-b border-border bg-background">
			<div className="font-bold text-lg">Quizable</div>
			<div className="flex items-center gap-2">
				<ThemeToggle />
				<SignedIn>
					<HeaderUser />
				</SignedIn>
			</div>
		</header>
	);
}
