import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { Suspense, useState } from "react";
import { AdminLoginBrand } from "@/components/admin/admin-login-brand";
import Link from "@/components/link";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { resetPassword } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";
import { cn } from "@/lib/utils";

function ResetPasswordForm() {
  const txt = useAdminMessages();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!token) {
      toast.error(txt("m0001"), {
        description: txt("m0002"),
      });
      return;
    }
    if (password.length < 8) {
      toast.error(txt("m0003"), {
        description: txt("m0004"),
      });
      return;
    }
    if (password !== confirmPassword) {
      toast.error(txt("m0005"));
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      toast.success(txt("m0006"), {
        description: txt("m0007"),
      });
      router.replace("/admin");
    } catch (err) {
      toast.error(txt("m0008"), {
        description: getAdminErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="admin-login-screen relative z-10 w-full max-w-[26rem]">
      <AdminLoginBrand subtitle={txt("m0010")} />

      <div className="admin-login-panel">
        <div className="border-b border-border/70 px-6 py-5">
          <h1 className="text-lg font-semibold tracking-tight">{txt("m0011")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{txt("m0012")}</p>
        </div>
        <form className="px-6 py-6" onSubmit={handleSubmit}>
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="new-password">{txt("m0013")}</FieldLabel>
              <Input
                id="new-password"
                type="password"
                className="admin-login-input h-11 rounded-[2px]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">{txt("m0014")}</FieldLabel>
              <Input
                id="confirm-password"
                type="password"
                className="admin-login-input h-11 rounded-[2px]"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={8}
                required
              />
            </Field>
            <Button
              type="submit"
              className={cn("h-11 w-full rounded-[2px] active:scale-[0.99]")}
              disabled={loading || !token}
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  {txt("m0015")}
                </>
              ) : (
                txt("m0016")
              )}
            </Button>
            <Button type="button" variant="ghost" className="h-10 w-full rounded-[2px]" asChild>
              <Link href="/admin">
                <ArrowLeftIcon className="size-4" />
                {txt("m0017")}
              </Link>
            </Button>
          </FieldGroup>
        </form>
      </div>
    </div>
  );
}
export default function AdminResetPasswordPage() {
  useAdminMessages();
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
