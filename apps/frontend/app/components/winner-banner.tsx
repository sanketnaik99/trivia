interface PlayerResult {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
}

interface WinnerBannerProps {
  winnerId: string | null;
  results: PlayerResult[];
}

const WinnerBanner = ({ winnerId, results }: WinnerBannerProps) => {
  if (!winnerId) {
    return (
      <div className="w-full text-center py-4 text-2xl font-bold text-gray-600">
        No Winner This Round
      </div>
    );
  }
  const winner = results.find(r => r.participantId === winnerId);
  return (
    <div className="w-full text-center py-4 text-3xl font-bold text-yellow-600 animate-bounce drop-shadow-lg" style={{textShadow: '0 2px 8px #fff, 0 0 4px #FFD700'}}>
      🏆 Winner: <span className="text-yellow-500 font-extrabold">{winner?.participantName || 'Unknown'}</span> 🏆
    </div>
  );
};

export default WinnerBanner;
