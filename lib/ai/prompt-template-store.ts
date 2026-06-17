import { DEFAULT_AI_PROMPT_TEMPLATES } from "@/lib/ai/prompt-templates";
import { prisma } from "@/lib/prisma";

export async function syncDefaultPromptTemplatesForProject(projectId: string) {
  return prisma.$transaction(
    DEFAULT_AI_PROMPT_TEMPLATES.map((template) =>
      prisma.aiPromptTemplate.upsert({
        where: {
          projectId_key_version: {
            projectId,
            key: template.key,
            version: template.version,
          },
        },
        create: {
          projectId,
          key: template.key,
          name: template.name,
          taskType: template.taskType,
          version: template.version,
          outputFormat: template.outputFormat,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          contextNotes: template.contextNotes,
          responseSchema: template.responseSchema,
          status: "active",
        },
        update: {
          name: template.name,
          taskType: template.taskType,
          outputFormat: template.outputFormat,
          systemPrompt: template.systemPrompt,
          userPrompt: template.userPrompt,
          contextNotes: template.contextNotes,
          responseSchema: template.responseSchema,
          status: "active",
        },
      }),
    ),
  );
}

export async function ensureDefaultPromptTemplate(
  projectId: string,
  templateKey: string,
) {
  const template = DEFAULT_AI_PROMPT_TEMPLATES.find(
    (defaultTemplate) => defaultTemplate.key === templateKey,
  );

  if (!template) {
    throw new Error(`Default prompt template is missing: ${templateKey}.`);
  }

  return prisma.aiPromptTemplate.upsert({
    where: {
      projectId_key_version: {
        projectId,
        key: template.key,
        version: template.version,
      },
    },
    create: {
      projectId,
      key: template.key,
      name: template.name,
      taskType: template.taskType,
      version: template.version,
      outputFormat: template.outputFormat,
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      contextNotes: template.contextNotes,
      responseSchema: template.responseSchema,
      status: "active",
    },
    update: {
      name: template.name,
      taskType: template.taskType,
      outputFormat: template.outputFormat,
      systemPrompt: template.systemPrompt,
      userPrompt: template.userPrompt,
      contextNotes: template.contextNotes,
      responseSchema: template.responseSchema,
      status: "active",
    },
  });
}
