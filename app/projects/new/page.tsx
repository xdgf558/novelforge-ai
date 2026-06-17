import { ProjectForm } from "@/components/project-form";
import { createProject } from "@/app/projects/actions";

export default function NewProjectPage() {
  return (
    <ProjectForm
      action={createProject}
      submitLabel="创建项目"
      subtitle="先保存项目基础信息；总设定档、角色库、章节编辑器和 AI 任务记录已接入。"
      title="新建小说项目"
    />
  );
}
