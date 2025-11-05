'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGroupActivity } from '@/app/lib/api/queries/groups';
import { GroupActivity } from '@/app/lib/api/schemas/group.schema';
import { Calendar, Trophy, Gamepad2 } from 'lucide-react';

interface RecentActivityProps {
  groupId: string;
}

export function RecentActivity({ groupId }: RecentActivityProps) {
  const { data: activityData, isLoading } = useGroupActivity(groupId, { limit: 10 });

  const activities = activityData?.activities || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No recent activity yet</p>
        <p className="text-sm">Start playing to see your group&apos;s activity here!</p>
      </div>
    );
  }

  const getActivityIcon = (type: GroupActivity['type']) => {
    switch (type) {
      case 'leaderboard_update':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'room_created':
        return <Gamepad2 className="h-4 w-4 text-blue-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityText = (activity: GroupActivity) => {
    switch (activity.type) {
      case 'leaderboard_update':
        return `${activity.user.displayName} earned ${activity.data.points} points`;
      case 'room_created':
        return `${activity.user.displayName} created room ${activity.data.roomCode}`;
      default:
        return `${activity.user.displayName} performed an action`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
          <div className="shrink-0">
            {getActivityIcon(activity.type)}
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {activity.user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {getActivityText(activity)}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatTimestamp(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}