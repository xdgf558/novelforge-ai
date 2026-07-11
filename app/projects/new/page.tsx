import { ProjectForm } from "@/components/project-form";
import { createProject } from "@/app/projects/actions";

export default function NewProjectPage() {
  return (
    <ProjectForm
      action={createProject}
      submitLabel="创建项目"
      subtitle="选择长篇连载或短故事，再保存作品的基础信息。"
      title="新建创作项目"
    />
  );
}
