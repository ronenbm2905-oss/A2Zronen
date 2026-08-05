import type { Metadata } from "next";

import { ProjectDetail } from "@/components/projects/project-detail";

export const metadata: Metadata = {
  title: "פרטי פרויקט",
};

export default async function ProjectPage(props: PageProps<"/projects/[id]">) {
  const { id } = await props.params;

  return <ProjectDetail projectId={id} />;
}
