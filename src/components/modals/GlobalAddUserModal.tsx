"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogSubmitButton,
  formFieldLabel,
  formInputClass,
  formSelectClass,
} from "@/components/ui/FormDialog";
import { toast } from "sonner";
import { addUserAction } from "@/app/actions/users";

export default function GlobalAddUserModal({
  isOpen,
  setIsOpen,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const router = useRouter();
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
        router.refresh();
      }
    });
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Add New User"
      description="Create a new user account manually. They will receive an email with their credentials."
      footer={
        <>
          <FormDialogCancelButton onClick={() => setIsOpen(false)} disabled={isPending}>
            Cancel
          </FormDialogCancelButton>
          <FormDialogSubmitButton type="submit" form="add-user-form" disabled={isPending}>
            {isPending ? "Adding..." : "Add User"}
          </FormDialogSubmitButton>
        </>
      }
    >
      <form id="add-user-form" onSubmit={handleAddSubmit} className="p-6 space-y-4">
        <div className="space-y-2">
          <label className={formFieldLabel}>Name</label>
          <Input name="name" required placeholder="John Doe" className={formInputClass} />
        </div>
        <div className="space-y-2">
          <label className={formFieldLabel}>Email</label>
          <Input name="email" type="email" required placeholder="john@example.com" className={formInputClass} />
        </div>
        <div className="space-y-2">
          <label className={formFieldLabel}>Role</label>
          <select name="role" className={formSelectClass}>
            <option value="MEMBER">Member</option>
            <option value="CLIENT">Client</option>
            <option value="OWNER">Owner</option>
          </select>
        </div>
      </form>
    </FormDialog>
  );
}
