import { Button, Dropdown } from "antd";
import { Languages } from "lucide-react";
import { useState } from "react";
import { AdminMenuArrow } from "@/components/admin/admin-menu-arrow";
import { ContentWidthSelect as Select } from "@/components/ui/content-width-select";
import { useAdminLocale } from "@/lib/locale";
import { useAdminMessages } from "@/lib/use-admin-messages";
export function LocaleSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const txt = useAdminMessages();
  const { locale, setLocale } = useAdminLocale();
  const [open, setOpen] = useState(false);
  if (compact)
    return (
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          selectable: true,
          selectedKeys: [locale],
          items: [
            {
              key: "zh-CN",
              label: "简体中文",
            },
            {
              key: "zh-TW",
              label: "繁體中文",
            },
            {
              key: "en",
              label: "English",
            },
          ],
          onClick: ({ key }) => {
            setOpen(false);
            if (key === "zh-CN" || key === "zh-TW" || key === "en") setLocale(key);
          },
        }}
      >
        <Button
          type="text"
          className={className}
          aria-label={txt("m0741")}
          aria-haspopup="menu"
          aria-expanded={open}
          title={txt("m0742")}
          icon={<Languages size={18} />}
        >
          <span>{locale === "en" ? "EN" : locale === "zh-TW" ? "繁" : "中"}</span>
          <AdminMenuArrow open={open} />
        </Button>
      </Dropdown>
    );
  return (
    <Select
      aria-label={txt("m0741")}
      value={locale}
      onChange={setLocale}
      prefix={<Languages size={16} aria-hidden />}
      options={[
        {
          value: "zh-CN",
          label: "简体中文",
        },
        {
          value: "zh-TW",
          label: "繁體中文",
        },
        {
          value: "en",
          label: "English",
        },
      ]}
      style={{
        minWidth: 118,
      }}
    />
  );
}
