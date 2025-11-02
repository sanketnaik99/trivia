'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, AlertCircle } from 'lucide-react';

interface ShareButtonProps {
  shareableUrl: string;
  roomCode: string;
}

export function ShareButton({ shareableUrl, roomCode }: ShareButtonProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showFallback, setShowFallback] = useState(false);

  // T068: Check if clipboard API is supported
  // Note: Clipboard API requires secure context (HTTPS or localhost)
  const canUseClipboard = typeof navigator !== 'undefined' && 
    navigator.clipboard && 
    typeof navigator.clipboard.writeText === 'function';

  const handleShare = async () => {
    console.log('[ShareButton] handleShare called', {
      canUseClipboard,
      shareableUrl,
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : 'unknown'
    });

    try {
      // T068: Use clipboard API on all devices
      if (canUseClipboard) {
        console.log('[ShareButton] Using clipboard API');
        await navigator.clipboard.writeText(shareableUrl);
        // T070: Show success feedback
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 2000);
        return;
      }

      // T071: If clipboard API is not available, show fallback
      console.log('[ShareButton] No clipboard API available, showing fallback');
      setShowFallback(true);
    } catch (error) {
      // T072: Handle errors (clipboard denied, etc.)
      console.error('[ShareButton] Copy failed:', error);
      
      // Show error state or fallback
      if (!canUseClipboard) {
        setShowFallback(true);
      } else {
        setCopyStatus('error');
        setTimeout(() => setCopyStatus('idle'), 3000);
      }
    }
  };

  const handleCopyFromFallback = async () => {
    try {
      if (canUseClipboard) {
        await navigator.clipboard.writeText(shareableUrl);
        setCopyStatus('success');
        setTimeout(() => setCopyStatus('idle'), 2000);
      } else {
        // Select the text for manual copy
        const input = document.getElementById('fallback-url-input') as HTMLInputElement;
        if (input) {
          input.select();
          document.execCommand('copy');
          setCopyStatus('success');
          setTimeout(() => setCopyStatus('idle'), 2000);
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-3">
      {/* T067: Share button with responsive styling */}
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full sm:w-auto"
        size="default"
        aria-label={`Copy room link for room ${roomCode}`}
        disabled={copyStatus === 'success'}
      >
        {copyStatus === 'success' ? (
          <>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" />
            Link Copied!
          </>
        ) : copyStatus === 'error' ? (
          <>
            <AlertCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy Failed
          </>
        ) : (
          <>
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            Copy Link
          </>
        )}
      </Button>

      {/* T071: Fallback display for browsers without clipboard/share API */}
      {showFallback && (
        <div className="space-y-2 animate-in fade-in duration-300">
          <p className="text-sm text-muted-foreground">
            Copy this link to share:
          </p>
          <div className="flex gap-2">
            <Input
              id="fallback-url-input"
              type="text"
              value={shareableUrl}
              readOnly
              className="font-mono text-sm"
              aria-label="Shareable room URL"
            />
            <Button
              onClick={handleCopyFromFallback}
              variant="secondary"
              size="default"
              aria-label="Copy URL to clipboard"
            >
              {copyStatus === 'success' ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
