import { ThemeProvider as NextThemeProvider } from "next-themes";

export default function ThemeProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<NextThemeProvider
			attribute="class"
			enableSystem={true}
			storageKey="quizable-theme"
		>
			{children}
		</NextThemeProvider>
	);
}
