"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getOrganisationMemberListQueryKey,
  useOrganisationMemberInvite,
  extractErrorMessage,
  OrganisationRole,
} from "@repo/queries";
import type { InviteMemberDto } from "@repo/queries";

import { toast } from "@repo/ui/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";

import { TextField } from "@/components/forms/text-field";

interface InviteMemberDialogProps {
  organisationId: string;
}

export function InviteMemberDialog({ organisationId }: InviteMemberDialogProps) {
  const t = useTranslations("modals.inviteMember");
  const queryClient = useQueryClient();
  const { mutateAsync: inviteMember, isPending } = useOrganisationMemberInvite();

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [role, setRole] = useState<OrganisationRole>(OrganisationRole.MEMBER);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setName("");
      setSurname("");
      setRole(OrganisationRole.MEMBER);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);

    const payload: InviteMemberDto = {
      email: email.trim().toLowerCase(),
      role,
      ...(name.trim() ? { name: name.trim() } : {}),
      ...(surname.trim() ? { surname: surname.trim() } : {}),
    };

    try {
      await inviteMember({ id: organisationId, data: payload });
      await queryClient.invalidateQueries({
        queryKey: getOrganisationMemberListQueryKey(organisationId),
      });
      toast({
        title: t("successTitle"),
        description: t("successDescription"),
      });
      setOpen(false);
    } catch (err) {
      setError(extractErrorMessage(err) ?? t("errorTitle"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 size-4" />
          {t("button")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("desc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label={t("email")}
            type="email"
            name="email"
            id="invite-email"
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t("firstname")}
              type="text"
              name="name"
              id="invite-name"
              placeholder={t("firstnamePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label={t("surname")}
              type="text"
              name="surname"
              id="invite-surname"
              placeholder={t("surnamePlaceholder")}
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label
              htmlFor="invite-role"
              className="text-sm font-medium leading-none">
              {t("role")}
            </label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as OrganisationRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrganisationRole.MEMBER}>
                  {t("roleMember")}
                </SelectItem>
                <SelectItem value={OrganisationRole.OWNER}>
                  {t("roleOwner")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={isPending || !email.trim()}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
