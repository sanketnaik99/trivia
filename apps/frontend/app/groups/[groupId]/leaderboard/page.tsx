'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGroupLeaderboard } from '@/app/lib/api/queries/groups';
import { useAuth, useUser } from '@clerk/nextjs';
import { useQueryClient } from '@tanstack/react-query';
import { GroupsSocketClient } from '@/app/lib/websocket';
import { ArrowLeft, Trophy, Users, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { LeaderboardTable } from '@/app/components/leaderboard-table';

export default function GroupLeaderboardPage() {
  const params = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'totalPoints' | 'lastUpdated'>('totalPoints');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { data: leaderboardData, isLoading, error } = useGroupLeaderboard(params.groupId as string, {
    page: currentPage,
    limit: 50,
    sortBy,
    order: sortOrder,
  });
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [socketClient, setSocketClient] = useState<GroupsSocketClient | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const groupId = params.groupId as string;

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!isSignedIn || !groupId) return;

    const setupSocket = async () => {
      try {
        const client = new GroupsSocketClient();
        await client.connect();

        // Subscribe to group events
        client.send('group:subscribe', { groupId });

        // Listen for leaderboard updates
        client.on('leaderboard:updated', () => {
          // Invalidate leaderboard query to refetch data
          queryClient.invalidateQueries({
            queryKey: ['groups', groupId, 'leaderboard']
          });
          // Track update time for visual feedback
          setLastUpdateTime(new Date());
        });

        // Handle reconnection
        client.on('disconnect', () => {
          console.log('Groups socket disconnected, will attempt to reconnect...');
        });

        client.on('reconnect_attempt', () => {
          console.log('Attempting to reconnect to groups socket...');
        });

        client.on('reconnect_failed', () => {
          console.error('Failed to reconnect to groups socket');
        });

        setSocketClient(client);
      } catch (error) {
        console.error('Failed to setup WebSocket connection:', error);
      }
    };

    setupSocket();

    // Cleanup function
    return () => {
      if (socketClient) {
        socketClient.send('group:unsubscribe', { groupId });
        socketClient.disconnect();
        setSocketClient(null);
      }
    };
  }, [isSignedIn, groupId, queryClient, socketClient]);

  const totalPages = leaderboardData?.pagination.totalPages || 1;

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              You need to sign in to view this leaderboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Leaderboard</CardTitle>
            <CardDescription>
              {error.message || 'Failed to load leaderboard data.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/groups/${groupId}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Group
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Group Leaderboard
              </h1>
              <p className="text-muted-foreground">
                {leaderboardData?.groupInfo.name || 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Group Summary Card */}
        {leaderboardData?.groupInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {leaderboardData.groupInfo.name}
              </CardTitle>
              <CardDescription>
                Track your group&apos;s trivia performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {leaderboardData.leaderboard.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {leaderboardData.groupInfo.totalGamesPlayed}
                  </div>
                  <div className="text-sm text-muted-foreground">Games Played</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {leaderboardData.leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                  Rankings based on total points earned from group trivia games
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: 'totalPoints' | 'lastUpdated') => {
                  setSortBy(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="totalPoints">Points</SelectItem>
                    <SelectItem value="lastUpdated">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => {
                  setSortOrder(value);
                  setCurrentPage(1);
                }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">High to Low</SelectItem>
                    <SelectItem value="asc">Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <LeaderboardTable
              entries={leaderboardData?.leaderboard || []}
              isLoading={isLoading}
              updatedAt={lastUpdateTime}
              currentUserId={user?.id}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}