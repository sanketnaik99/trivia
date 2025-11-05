import React from 'react';

interface PlayerResult {
  participantId: string;
  participantName: string;
  answerText: string | null;
  timestamp: number | null;
  isCorrect: boolean;
  scoreChange?: number;
  newScore?: number;
}

interface PlayerResultCardProps {
  result: PlayerResult;
  highlight?: boolean;
  isGroupMember?: boolean;
}

const PlayerResultCard: React.FC<PlayerResultCardProps> = ({ result, highlight, isGroupMember }) => {
  return (
    <div
      className={`rounded-lg border p-4 flex flex-col items-center shadow-md transition-all duration-200 ${
        highlight ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="font-bold text-lg mb-1">{result.participantName}</div>
      {typeof result.scoreChange === 'number' && (
        <div className={`text-sm font-medium mb-2 ${
          isGroupMember === false ? 'text-gray-400' : result.scoreChange > 0 ? 'text-green-600 font-bold' : 'text-gray-500'
        }`}>
          {result.scoreChange > 0 ? `+${result.scoreChange} point` : '+0 points'}
          {typeof result.newScore === 'number' && (
            <span className="ml-2 text-xs text-muted-foreground">(Total: {result.newScore})</span>
          )}
        </div>
      )}
      <div className={`mb-2 ${result.isCorrect ? 'text-green-600' : 'text-red-500'}`}>{
        result.answerText !== null ? (
          result.isCorrect ? 'Correct' : 'Incorrect'
        ) : 'No Answer'
      }</div>
      <div className="text-sm text-gray-700 mb-1">
        {result.answerText !== null ? `"${result.answerText}"` : ''}
      </div>
      <div className="text-xs text-gray-400">
        {result.timestamp !== null ? `${(result.timestamp / 1000).toFixed(2)}s` : ''}
      </div>
    </div>
  );
};

export default PlayerResultCard;
