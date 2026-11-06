import { Alert, Button, Form, Input } from "antd";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { BirthDatePicker } from "@/components/admin/birth-date-picker";
import { ContentWidthSelect as Select } from "@/components/ui/content-width-select";
import { type AdminUser, type AdminUserPayload, createAdminUser, updateAdminUser } from "@/lib/api";
import { toast } from "@/lib/feedback";
import { useRouter } from "@/lib/navigation";

type Values = AdminUserPayload & { username: string };
export function AdminUserForm({ user }: { user?: AdminUser }) {
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
      else await createAdminUser({ ...payload, username: values.username.trim() });
      await Promise.all([
        mutate((key) => Array.isArray(key) && key[0] === "admin-users"),
        mutate("auth-me"),
        mutate("admin-me"),
      ]);
      toast.success(user ? "用户已保存" : "用户已创建，请通过重置密码设置登录密码");
      router.push("/admin/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="rounded border bg-card p-5 sm:p-6">
      {error ? <Alert type="error" showIcon title={error} className="mb-4" /> : null}
      <Form
        layout="vertical"
        initialValues={user ?? {}}
        onFinish={save}
        disabled={saving}
        className="max-w-3xl"
      >
        <Form.Item
          name="username"
          label="用户名"
          extra={mode === "edit" ? "登录用户名不可修改" : "支持字母、数字、下划线、点和短横线"}
          rules={
            mode === "edit"
              ? []
              : [
                  { required: true, whitespace: true, message: "请输入用户名" },
                  { pattern: /^[a-zA-Z0-9_][a-zA-Z0-9_.-]*$/, message: "请输入有效的用户名" },
                ]
          }
        >
          <Input maxLength={50} disabled={mode === "edit" || saving} autoComplete="off" />
        </Form.Item>
        <Form.Item name="nickname" label="昵称">
          <Input maxLength={50} />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ type: "email", message: "请输入有效的邮箱" }]}>
          <Input maxLength={255} autoComplete="off" />
        </Form.Item>
        <Form.Item name="phone" label="手机号" extra="支持中国大陆手机号，可带 +86 前缀">
          <Input maxLength={20} autoComplete="off" />
        </Form.Item>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Form.Item name="gender" label="性别">
            <Select
              allowClear
              placeholder="未设置"
              options={[
                { value: "male", label: "男" },
                { value: "female", label: "女" },
                { value: "other", label: "其他" },
              ]}
            />
          </Form.Item>
          <Form.Item name="birth_date" label="出生日期">
            <BirthDatePicker disabled={saving} />
          </Form.Item>
        </div>

        <div className="flex justify-end gap-3 border-t pt-5">
          <Button disabled={saving} onClick={() => router.push("/admin/users")}>
            取消
          </Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            {user ? "保存修改" : "创建用户"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
