"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { useAuth } from "@repo/auth";
import { useUserDelete, extractErrorMessage } from "@repo/queries";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/molecules";
import {
  Button,
  Skeleton,
} from "@repo/ui/atoms";

import { TextField } from "@/components/forms/text-field";

export function DeleteUser() {
  const formT = useTranslations("forms.user-delete");
  const modalT = useTranslations("modals.delete");
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { mutateAsync } = useUserDelete();

  const fullName = user ? `${user.name} ${user.surname}`.trim() : "";

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

  const handleDelete = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      await mutateAsync({ id: user.id });
      setOpen(false);
      await logout();
    } catch (err) {
      setError(extractErrorMessage(err) ?? modalT("error.title"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formT("title")}</CardTitle>
        <CardDescription>{formT("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isAuthLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 size-4" />
                {formT("deleteButton")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{modalT("title")}</DialogTitle>
                <DialogDescription>{modalT("desc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <TextField
                  name="confirmName"
                  id="confirmName"
                  type="text"
                  label={`${modalT("label")} "${fullName}"`}
                  placeholder={modalT("placeholder")}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>{modalT("error.title")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!isConfirmed || isLoading}
                  onClick={handleDelete}>
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {modalT("button")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </CardContent>
    </Card>
  );
}
