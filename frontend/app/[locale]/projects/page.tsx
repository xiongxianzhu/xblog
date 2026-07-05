export const revalidate = 3600;

import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { ProseHtml } from "@/components/prose-html";
import { getPage } from "@/lib/api";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });

  try {
    const page = await getPage("projects");
    return { title: page.title, description: page.title };
  } catch {
    return { title: t("fallbackTitle") };
  }
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  let page;
  try {
    page = await getPage("projects");
  } catch {
    notFound();
  }

  return (
    <PageShell title={page.title} description={t("description")} narrow>
      <PageViewTracker path="/projects" />
      <ProseHtml html={page.content_html} />
    </PageShell>
  );
}
