import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { BirthDatePicker } from "@/components/admin/birth-date-picker";
import { ContentWidthSelect as Select } from "@/components/ui/content-width-select";
import { getAdminErrorMessage } from "@/lib/admin-errors";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { type AdminUser, type AdminUserPayload, createAdminUser, updateAdminUser } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter } from "@/lib/navigation";
import { useAdminMessages } from "@/lib/use-admin-messages";

type Values = AdminUserPayload & {
  username: string;
};
export function AdminUserForm({ user }: { user?: AdminUser }) {
  const txt = useAdminMessages();
  const mode = user ? "edit" : "create";
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(values: Values) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload: AdminUserPayload = {
        nickname: values.nickname?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        gender: values.gender || null,
        birth_date: values.birth_date || null,
      };
      if (user) await updateAdminUser(user.id, payload);
      else
        await createAdminUser({
          ...payload,
          username: values.username.trim(),
        });
      await Promise.all([
        mutate((key) => Array.isArray(key) && key[0] === "admin-users"),
        mutate("auth-me"),
        mutate("admin-me"),
      ]);
      toast.success(user ? txt("m0376") : txt("m0377"));
      router.push("/admin/users");
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded border bg-card p-5 sm:p-6">
      {error ? <Alert type="error" showIcon title={localizeAdminNotice(error)} className="mb-4" /> : null}
      <Form
        layout="vertical"
        initialValues={user ?? {}}
        onFinish={save}
        disabled={saving}
        className="max-w-3xl"
      >
        <Form.Item
          name="username"
          label={txt("m0091")}
          extra={mode === "edit" ? txt("m0379") : txt("m0380")}
          rules={
            mode === "edit"
              ? []
              : [
                  {
                    required: true,
                    whitespace: true,
                    message: txt("m0381"),
                  },
                  {
                    pattern: /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/,
                    message: txt("m0382"),
                  },
                ]
          }
        >
          <Input maxLength={50} disabled={mode === "edit" || saving} autoComplete="off" />
        </Form.Item>
        <Form.Item name="nickname" label={txt("m0264")}>
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item
          name="email"
          label={txt("m0269")}
          rules={[
            {
              type: "email",
              message: txt("m0383"),
            },
          ]}
        >
          <Input maxLength={255} autoComplete="off" />
        </Form.Item>
        <Form.Item name="phone" label={txt("m0270")} extra={txt("m0384")}>
          <Input maxLength={20} autoComplete="off" />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="gender" label={txt("m0265")}>
            <Select
              allowClear
              placeholder={txt("m0294")}
              options={[
                {
                  value: "male",
                  label: txt("m0250"),
                },
                {
                  value: "female",
                  label: txt("m0251"),
                },
                {
                  value: "other",
                  label: txt("m0252"),
                },
              ]}
            />
          </Form.Item>
          <Form.Item name="birth_date" label={txt("m0266")}>
            <BirthDatePicker disabled={saving} />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button disabled={saving} onClick={() => router.push("/admin/users")}>
            {txt("m0217")}
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {user ? txt("m0385") : txt("m0280")}
          </Button>
        </div>
      </Form>
    </div>
  );
}
