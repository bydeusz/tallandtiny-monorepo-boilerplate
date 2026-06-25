"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useAuth } from "@repo/auth";
import { useMailContactSupport, extractErrorMessage } from "@repo/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Button } from "@repo/ui/components/ui/button";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { Label } from "@repo/ui/components/ui/label";
import { useToast } from "@repo/ui/hooks/use-toast";

import { TextField } from "@/components/forms/text-field";

export function ContactForm() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = useTranslations("forms.support");
  const { toast } = useToast();
  const { mutateAsync, isPending } = useMailContactSupport();

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const fullName = `${user.name ?? ""} ${user.surname ?? ""}`.trim();
    setName(fullName);
    setEmail(user.email ?? "");
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setAttachment(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("fileTypeError"),
      });
      e.target.value = "";
      setAttachment(null);
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description: t("fileSizeError"),
      });
      e.target.value = "";
      setAttachment(null);
      return;
    }

    setAttachment(file);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await mutateAsync({
        data: {
          name,
          email,
          subject,
          message,
          ...(attachment ? { attachment } : {}),
        },
      });

      setSubject("");
      setMessage("");
      setAttachment(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast({
        title: t("successTitle"),
        description: t("success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("errorTitle"),
        description:
          extractErrorMessage(err) ??
          (err instanceof Error ? err.message : "Something went wrong"),
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            label={t("name")}
            required
            type="text"
            name="name"
            id="name"
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!!user?.id}
          />
          <TextField
            label={t("email")}
            required
            type="email"
            name="email"
            id="email"
            placeholder="john@doe.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!user?.id}
          />
          <TextField
            label={t("subject")}
            required
            type="text"
            name="subject"
            id="subject"
            placeholder={t("subjectPlaceholder")}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="message">
              {t("message")}
              <span className="text-destructive"> *</span>
            </Label>
            <Textarea
              id="message"
              name="message"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attachment">{t("attachment")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              id="attachment"
              name="attachment"
              accept=".jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="block w-full cursor-pointer text-sm text-foreground
                file:mr-4 file:cursor-pointer file:rounded-md file:border-0
                file:px-4 file:py-2 file:text-sm
                file:bg-muted file:text-foreground file:hover:bg-accent"
            />
            <p className="text-xs text-muted-foreground">{t("attachmentHelp")}</p>
          </div>
          <div className="pt-2">
            <Button variant="default" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
