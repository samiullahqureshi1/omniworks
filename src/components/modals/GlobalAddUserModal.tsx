"use client";

import React, { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { addUserAction } from "@/app/actions/users";

export default function GlobalAddUserModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await addUserAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "User added successfully");
        setIsOpen(false);
        window.location.reload();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] p-0 flex flex-col h-[70vh] sm:h-auto sm:max-h-[85vh] overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background z-10 sticky top-0 shadow-sm">
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user account manually. They will receive an email with their credentials.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          <form id="add-user-form" onSubmit={handleAddSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input name="name" required placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" type="email" required placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select name="role" className="flex h-9 w-full rounded-xl border bg-background px-3 text-sm focus:ring-1 focus:ring-ring">
                <option value="MEMBER">Member</option>
                <option value="CLIENT">Client</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
          </form>
        </div>
        <DialogFooter className="px-6 py-4 border-t shrink-0 bg-background sticky bottom-0 z-10">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="add-user-form" disabled={isPending}>
            {isPending ? 'Adding...' : 'Add User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
