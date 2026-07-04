export const revalidate = 3600;

import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { getPage } from "@/lib/api";

export async function generateMetadata() {
  try {
    const page = await getPage("about");
    return { title: page.title, description: page.title };
  } catch {
    return { title: "关于" };
  }
}

export default async function AboutPage() {
  let page;
  try {
    page = await getPage("about");
  } catch {
    notFound();
  }

  return (
    <PageShell title={page.title} description="关于作者与这个博客。" narrow>
      <PageViewTracker path="/about" />
      <div
        className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: page.content_html }}
      />
    </PageShell>
  );
}
