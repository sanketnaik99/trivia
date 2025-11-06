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
  participants?: Array<{ id: string; isGroupMember?: boolean }>;
}

const WinnerBanner = ({ winnerId, results, participants }: WinnerBannerProps) => {
  if (!winnerId) {
    return (
      <div className="w-full text-center py-4 text-2xl font-bold text-gray-600">
        No Winner This Round
      </div>
    );
  }

  const winner = results.find(r => r.participantId === winnerId);
  const isGroupRoom = participants?.some(p => p.isGroupMember !== undefined);

  let topMemberName: string | null = null;
  if (isGroupRoom) {
    // Find fastest correct member
    const memberResults = results.filter(r => {
      const participant = participants?.find(p => p.id === r.participantId);
      return participant?.isGroupMember && r.isCorrect;
    }).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    topMemberName = memberResults[0]?.participantName || null;
  }

  return (
    <div className="w-full text-center py-4">
      <div className="text-3xl font-bold text-primary">
        Round Winner: <span className="text-primary font-extrabold">{winner?.participantName || 'Unknown'}</span>
      </div>
      {topMemberName && topMemberName !== winner?.participantName && (
        <div className="text-lg font-semibold text-blue-600 mt-2">
          🏅 Top Group Member: <span className="text-blue-500 font-bold">{topMemberName}</span> 🏅
        </div>
      )}
    </div>
  );
};

export default WinnerBanner;
