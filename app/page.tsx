export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <main className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Trivia Room</h1>
          <p className="text-muted-foreground">Create or join a room to start playing!</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Placeholder for CreateRoomForm */}
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Create Room</h2>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
          
          {/* Placeholder for JoinRoomForm */}
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Join Room</h2>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
        </div>
      </main>
    </div>
  );
}
