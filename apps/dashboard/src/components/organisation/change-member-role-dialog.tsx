"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getOrganisationMemberListQueryKey,
  useOrganisationMemberUpdateRole,
  OrganisationRole,
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

interface ChangeMemberRoleDialogProps {
  member: OrganisationMemberResponseDto;
  organisationId: string;
  disabled?: boolean;
}

export function ChangeMemberRoleDialog({
  member,
  organisationId,
  disabled,
}: ChangeMemberRoleDialogProps) {
  const t = useTranslations("modals.changeRole");
  const queryClient = useQueryClient();
  const { mutateAsync: updateRole } = useOrganisationMemberUpdateRole();

  const fullName = `${member.user.name} ${member.user.surname}`.trim();
  const isOwner = member.role === OrganisationRole.OWNER;
  const action = isOwner ? "demote" : "promote";
  const nextRole = isOwner ? OrganisationRole.MEMBER : OrganisationRole.OWNER;

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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateRole({
        id: organisationId,
        userId: member.userId,
        data: { role: nextRole },
      });
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
          variant="outline"
          size="icon"
          disabled={disabled}
          aria-label={t(`${action}.button`)}>
          <ShieldCheck className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`${action}.title`)}</DialogTitle>
          <DialogDescription>{t(`${action}.desc`)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField
            name="confirmName"
            id="confirmName"
            type="text"
            label={`${t(`${action}.label`)} "${fullName}"`}
            placeholder={t(`${action}.placeholder`)}
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
            variant={isOwner ? "destructive" : "default"}
            disabled={!isConfirmed || isLoading}
            onClick={handleSubmit}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(`${action}.button`)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
