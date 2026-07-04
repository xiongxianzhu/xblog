export const revalidate = 3600;

import { notFound } from "next/navigation";

import { PageShell } from "@/components/page-shell";
import { PageViewTracker } from "@/components/page-view-tracker";
import { getPage } from "@/lib/api";

export async function generateMetadata() {
  try {
    const page = await getPage("projects");
    return { title: page.title, description: page.title };
  } catch {
    return { title: "项目" };
  }
}

export default async function ProjectsPage() {
  let page;
  try {
    page = await getPage("projects");
  } catch {
    notFound();
  }

  return (
    <PageShell title={page.title} description="作品集与 side projects。" narrow>
      <PageViewTracker path="/projects" />
      <div
        className="prose prose-lg max-w-none prose-headings:font-serif prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: page.content_html }}
      />
    </PageShell>
  );
}
