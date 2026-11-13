import { pageSeo } from "@/lib/seo";
export const revalidate = 3600;

import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { ProseHtml } from "@/components/prose-html";
import { getPage } from "@/lib/api";
import { prepareArticleContent } from "@/lib/article-headings";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "projects" });

  try {
    const page = await getPage("projects");
    return { ...(await pageSeo("/projects", locale)), title: page.title, description: page.title };
  } catch {
    return { ...(await pageSeo("/projects", locale)), title: t("fallbackTitle") };
  }
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("projects");

  let page: Awaited<ReturnType<typeof getPage>>;
  try {
    page = await getPage("projects");
  } catch {
    notFound();
  }

  return (
    <PageShell title={page.title} description={t("description")} narrow>
      <PageViewTracker path="/projects" />
      <ProseHtml html={prepareArticleContent(page.content_html).html} />
    </PageShell>
  );
}
