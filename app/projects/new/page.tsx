import { ProjectForm } from "@/components/project-form";
import { createProject } from "@/app/projects/actions";

export default function NewProjectPage() {
  return (
    <ProjectForm
      action={createProject}
      submitLabel="创建项目"
      subtitle="先保存项目基础信息；总设定档、人物和章节会在后续阶段接入。"
      title="新建小说项目"
    />
  );
}

