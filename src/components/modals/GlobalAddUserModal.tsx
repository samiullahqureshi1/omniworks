"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  FormDialog,
  FormDialogCancelButton,
  FormRoleSelect,
  FormDialogSubmitButton,
  formFieldLabel,
  formInputClass,
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
  const [isFormValid, setIsFormValid] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (!open) setIsFormValid(false);
    setIsOpen(open);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await addUserAction(formData);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(res.message || "User added successfully");
        setIsFormValid(false);
        setIsOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <FormDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Invite User"
      description="Send an invitation to join your workspace organization."
      footer={
        <>
          <FormDialogCancelButton onClick={() => handleOpenChange(false)} disabled={isPending}>
            Cancel
          </FormDialogCancelButton>
          <FormDialogSubmitButton type="submit" form="add-user-form" disabled={isPending || !isFormValid}>
            {isPending ? "Inviting..." : "Invite"}
          </FormDialogSubmitButton>
        </>
      }
    >
      <form
        id="add-user-form"
        onSubmit={handleAddSubmit}
        onInput={(event) => setIsFormValid(event.currentTarget.checkValidity())}
        className="px-6 pt-7 pb-6 space-y-5"
      >
        <div className="space-y-1.5">
          <label htmlFor="global-add-user-name" className={formFieldLabel}>Name</label>
          <Input id="global-add-user-name" name="name" required placeholder="e.g. John Doe" className={formInputClass} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="global-add-user-email" className={formFieldLabel}>Email Address</label>
          <Input id="global-add-user-email" name="email" type="email" required placeholder="e.g. john@example.com" className={formInputClass} />
        </div>
        <FormRoleSelect id="global-add-user-role" />
      </form>
    </FormDialog>
  );
}
