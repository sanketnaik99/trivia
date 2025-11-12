'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Eye, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface RolePreferenceToggleProps {
  currentRole: 'active' | 'spectator';
  preferredRole: 'active' | 'spectator';
  onChangePreference: (newPreference: 'active' | 'spectator') => Promise<void>;
  disabled?: boolean;
}

export function RolePreferenceToggle({
  currentRole,
  preferredRole,
  onChangePreference,
  disabled = false,
}: RolePreferenceToggleProps) {
  const [isChanging, setIsChanging] = useState(false);

  const handleChange = async (newPreference: 'active' | 'spectator') => {
    if (newPreference === preferredRole || isChanging) return;
    
    setIsChanging(true);
    try {
      await onChangePreference(newPreference);
    } catch (error) {
      console.error('Failed to change role preference:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Your Role</CardTitle>
        <CardDescription className="text-xs">
          {currentRole === 'spectator' 
            ? 'Choose if you want to participate in the next round'
            : 'You are currently an active participant'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            variant={preferredRole === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleChange('active')}
            disabled={disabled || isChanging}
            className="flex-1"
          >
            {isChanging && preferredRole !== 'active' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Participant
          </Button>
          <Button
            variant={preferredRole === 'spectator' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleChange('spectator')}
            disabled={disabled || isChanging}
            className="flex-1"
          >
            {isChanging && preferredRole !== 'spectator' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Spectator
          </Button>
        </div>
        
        {currentRole !== preferredRole && (
          <p className="text-xs text-muted-foreground">
            {currentRole === 'spectator' && preferredRole === 'active' && (
              <>✓ You'll become a participant {currentRole === 'spectator' ? 'when a slot opens' : 'in the next round'}</>
            )}
            {currentRole === 'active' && preferredRole === 'spectator' && (
              <>✓ You'll remain a spectator in future rounds</>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
