import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import HorizontalLogo from '@/public/horizontal-logo-light.png';

export default function Home() {
	return (
		<div className="min-h-screen bg-background">
			{/* Hero Section */}
			<section className="flex flex-col items-center justify-center px-4 py-16 md:py-24">
				<div className="text-center max-w-4xl">
					<div className="flex justify-center mb-6">
						<Image
							src={HorizontalLogo}
							alt="Trivia App Logo"
							width={200}
							height={100}
							priority
						/>
					</div>
					<p className="text-xl md:text-2xl text-muted-foreground">
						Real-time trivia with friends and AI-powered feedback
					</p>
				</div>
			</section>

			{/* Features Section */}
			<section className="px-4 py-16 max-w-6xl mx-auto">
				<h2 className="text-3xl font-bold text-center mb-12">Features</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>Real-Time Multiplayer</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								Create or join rooms instantly with 6-character codes. Play with up to 16 friends in real-time with Socket.IO.
							</CardDescription>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>AI Feedback Modes</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								Choose your style: Supportive encouragement, Neutral facts, or "Roast Me" for hilarious commentary on your answers.
							</CardDescription>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Group Leaderboards</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								Create private groups with persistent leaderboards. Track scores and compete with your community over time.
							</CardDescription>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Scheduled Games</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								Plan trivia nights in advance with calendar integration. Export to ICS or Google Calendar with recurring events.
							</CardDescription>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Smart Reconnection</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								Lost connection? No problem. Seamlessly rejoin your game or watch as a spectator if you join mid-round.
							</CardDescription>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Intelligent Matching</CardTitle>
						</CardHeader>
						<CardContent>
							<CardDescription>
								10-question rounds with smart answer verification. Multiple correct answers accepted with fuzzy matching.
							</CardDescription>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-4 py-16 md:py-24">
				<div className="text-center max-w-2xl mx-auto">
					<h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
					<p className="text-muted-foreground mb-8">
						Create or join a room in seconds. No sign-up required for quick games.
					</p>
					<Link href="/room">
						<Button size="lg" className="text-lg px-8 py-6">
							Get Started
						</Button>
					</Link>
				</div>
			</section>
		</div>
	);
}
