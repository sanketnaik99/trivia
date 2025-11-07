'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface GameQuestionProps {
  questionText: string;
  onSubmitAnswer: (answer: string) => void;
  disabled?: boolean;
  category?: string | null;
  feedbackMode?: 'supportive' | 'neutral' | 'roast';
}

export function GameQuestion({ questionText, onSubmitAnswer, disabled = false, category, feedbackMode }: GameQuestionProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!answer.trim() || disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    onSubmitAnswer(answer.trim());
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-6 md:p-8">
      <form onSubmit={handleSubmit} className="space-y-6" aria-label="Answer trivia question">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            {/** category and feedback badges */}
            <div className="flex items-center gap-2">
              {/** Category badge */}
              {typeof category !== 'undefined' && (
                <div className="px-2 py-1 bg-slate-50 border rounded-full text-slate-800 text-sm">
                  <span className="font-medium">{category ?? 'Any'}</span>
                </div>
              )}
              {feedbackMode && (
                <div className="px-2 py-1 bg-slate-50 border rounded-full text-slate-800 text-sm">
                  <span className="font-medium">{feedbackMode[0].toUpperCase() + feedbackMode.slice(1)}</span>
                </div>
              )}
            </div>
          </div>

          <h2 
            className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight"
            id="question-text"
            role="heading"
            aria-level={2}
          >
            {questionText}
          </h2>
        </div>

        <div className="space-y-4">
          <Input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={disabled || isSubmitting}
            className="text-base md:text-lg h-12 md:h-14"
            autoFocus
            autoComplete="off"
            aria-label="Your answer"
            aria-describedby="question-text"
            aria-required="true"
          />

          <Button
            type="submit"
            disabled={!answer.trim() || disabled || isSubmitting}
            className="w-full h-12 md:h-14 text-base md:text-lg font-semibold"
            size="lg"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Answer'}
          </Button>
        </div>

        {disabled && (
          <p 
            className="text-sm md:text-base text-center text-gray-600 dark:text-gray-400"
            role="status"
            aria-live="polite"
          >
            Answer submitted. Waiting for other players...
          </p>
        )}
      </form>
    </Card>
  );
}
