'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Settings, Trash2 } from 'lucide-react';
import { useUpdateGroup, useDeleteGroup } from '@/app/lib/api/queries/groups';

interface ManageGroupModalProps {
  groupId: string;
  currentName: string;
}

export function ManageGroupModal({ groupId, currentName }: ManageGroupModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [groupName, setGroupName] = useState(currentName);

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();

  const handleUpdateGroup = () => {
    if (!groupName.trim()) {
      return;
    }

    if (groupName.trim().length < 3 || groupName.trim().length > 50) {
      return;
    }

    updateGroupMutation.mutate(
      {
        groupId,
        data: { name: groupName.trim() },
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      }
    );
  };

  const handleDeleteGroup = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        setIsOpen(false);
      },
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setGroupName(currentName);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Manage Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Group</DialogTitle>
          <DialogDescription>
            Update group settings or delete the group. These actions can only be performed by group admins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {(updateGroupMutation.error || deleteGroupMutation.error) && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {updateGroupMutation.error instanceof Error
                ? updateGroupMutation.error.message
                : deleteGroupMutation.error instanceof Error
                ? deleteGroupMutation.error.message
                : 'An error occurred'}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={50}
            />
            <p className="text-sm text-muted-foreground">
              {groupName.length}/50 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleUpdateGroup}
              disabled={updateGroupMutation.isPending || deleteGroupMutation.isPending || groupName.trim() === currentName}
              className="flex-1 sm:flex-none"
            >
              {updateGroupMutation.isPending ? 'Updating...' : 'Update Name'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={updateGroupMutation.isPending || deleteGroupMutation.isPending} className="flex-1 sm:flex-none">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Group</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this group? This action cannot be undone and will:
                    <br /><br />
                    • Remove all members from the group
                    • Delete all invites and leaderboard data
                    • Make the group permanently inaccessible
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteGroup}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Group
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}