import { Button, Dropdown, Select } from "antd";
import { Languages } from "lucide-react";
import { useAdminLocale } from "@/lib/locale";
export function LocaleSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { locale, setLocale } = useAdminLocale();
  if (compact)
    return (
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          selectable: true,
          selectedKeys: [locale],
          items: [
            { key: "zh-CN", label: "简体中文" },
            { key: "zh-TW", label: "繁體中文" },
            { key: "en", label: "English" },
          ],
          onClick: ({ key }) => {
            if (key === "zh-CN" || key === "zh-TW" || key === "en") setLocale(key);
          },
        }}
      >
        <Button
          type="text"
          className={className}
          aria-label="管理后台语言"
          title="切换语言"
          icon={<Languages size={18} />}
        >
          <span>{locale === "en" ? "EN" : locale === "zh-TW" ? "繁" : "中"}</span>
        </Button>
      </Dropdown>
    );
  return (
    <Select
      aria-label="管理后台语言"
      value={locale}
      onChange={setLocale}
      suffixIcon={<Languages size={16} />}
      options={[
        { value: "zh-CN", label: "简体中文" },
        { value: "zh-TW", label: "繁體中文" },
        { value: "en", label: "English" },
      ]}
      style={{ minWidth: 118 }}
    />
  );
}
