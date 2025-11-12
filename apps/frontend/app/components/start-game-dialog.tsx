'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuestionCategories } from '@/app/lib/api/queries/questions';
import { useAuth } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';

interface StartGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (options: { selectedCategory: string | null; feedbackMode: 'supportive' | 'neutral' | 'roast' }) => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function StartGameDialog({
  open,
  onOpenChange,
  onStart,
  isLoading = false,
  title = 'Start Game',
  description = 'Select game options before starting.',
}: StartGameDialogProps) {
  const { isSignedIn } = useAuth();
  const [feedbackMode, setFeedbackMode] = useState<'supportive' | 'neutral' | 'roast'>('neutral');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories = [], isLoading: loadingCategories } = useQuestionCategories(Boolean(open && isSignedIn));

  const handleStart = () => {
    onStart({ selectedCategory, feedbackMode });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setSelectedCategory(null);
      setFeedbackMode('neutral');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <div className="grid gap-1">
              <Label htmlFor="category" className="text-sm font-medium">Category</Label>
              <Select value={selectedCategory ?? '__any__'} onValueChange={(v) => setSelectedCategory(v === '__any__' ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? 'Loading...' : 'Mixed / Any'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Mixed / Any</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.category} value={c.category}>{c.category} ({c.count})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="feedbackMode" className="text-sm font-medium">AI feedback mode</Label>
              <Select value={feedbackMode} onValueChange={(v) => setFeedbackMode(v as 'supportive' | 'neutral' | 'roast')}>
                <SelectTrigger>
                  <SelectValue placeholder="Neutral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="supportive">Supportive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="roast">Roast</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleStart} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                'Start Game'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
