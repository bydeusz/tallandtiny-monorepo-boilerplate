"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getOrganisationMemberListQueryKey,
  useOrganisationMemberRemove,
  extractErrorMessage,
} from "@repo/queries";
import type { OrganisationMemberResponseDto } from "@repo/queries";

import { Button } from "@repo/ui/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@repo/ui/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/ui/dialog";

import { TextField } from "@/components/forms/text-field";

interface RemoveMemberDialogProps {
  member: OrganisationMemberResponseDto;
  organisationId: string;
  disabled?: boolean;
}

export function RemoveMemberDialog({
  member,
  organisationId,
  disabled,
}: RemoveMemberDialogProps) {
  const t = useTranslations("modals.removeMember");
  const queryClient = useQueryClient();
  const { mutateAsync: removeMember } = useOrganisationMemberRemove();

  const fullName = `${member.user.name} ${member.user.surname}`.trim();

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setInputValue("");
      setError(null);
    }
  }, [open]);

  const isConfirmed = inputValue.trim() === fullName;

  const handleRemove = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await removeMember({ id: organisationId, userId: member.userId });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationMemberListQueryKey(organisationId),
      });
      setOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err) ?? t("errorTitle"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          disabled={disabled}
          aria-label={t("button")}>
          <Trash2 className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("desc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            name="confirmName"
            id="confirmName"
            type="text"
            label={`${t("label")} "${fullName}"`}
            placeholder={t("placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="destructive"
            disabled={!isConfirmed || isLoading}
            onClick={handleRemove}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
