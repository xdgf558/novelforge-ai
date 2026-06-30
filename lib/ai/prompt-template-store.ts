import { DEFAULT_AI_PROMPT_TEMPLATES } from "@/lib/ai/prompt-templates";
import { prisma } from "@/lib/prisma";

type DefaultPromptTemplate = (typeof DEFAULT_AI_PROMPT_TEMPLATES)[number];

export async function syncDefaultPromptTemplatesForProject(projectId: string) {
  return prisma.$transaction(
    DEFAULT_AI_PROMPT_TEMPLATES.flatMap((template) =>
      [
        prisma.aiPromptTemplate.upsert(
          defaultPromptTemplateUpsertArgs(projectId, template),
        ),
        deactivateOlderActivePromptTemplateVersionsQuery(projectId, template),
      ],
    ),
  );
}

export async function ensureDefaultPromptTemplate(
  projectId: string,
  templateKey: string,
) {
  const template = findDefaultPromptTemplate(templateKey);

  if (!template) {
    throw new Error(`Default prompt template is missing: ${templateKey}.`);
  }

  const activeTemplate = await prisma.aiPromptTemplate.findFirst({
    where: {
      projectId,
      key: templateKey,
      status: "active",
    },
    orderBy: {
      version: "desc",
    },
  });

  if (activeTemplate && activeTemplate.version >= template.version) {
    return activeTemplate;
  }

  const defaultTemplate = await upsertDefaultPromptTemplateForProject(
    projectId,
    template,
  );
  await deactivateOlderActivePromptTemplateVersions(projectId, template);

  return defaultTemplate;
}

function upsertDefaultPromptTemplateForProject(
  projectId: string,
  template: DefaultPromptTemplate,
) {
  return prisma.aiPromptTemplate.upsert(
    defaultPromptTemplateUpsertArgs(projectId, template),
  );
}

function defaultPromptTemplateUpsertArgs(
  projectId: string,
  template: DefaultPromptTemplate,
) {
  return {
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
  };
}

function deactivateOlderActivePromptTemplateVersions(
  projectId: string,
  template: DefaultPromptTemplate,
) {
  return deactivateOlderActivePromptTemplateVersionsQuery(projectId, template);
}

function deactivateOlderActivePromptTemplateVersionsQuery(
  projectId: string,
  template: DefaultPromptTemplate,
) {
  return prisma.aiPromptTemplate.updateMany({
    where: {
      projectId,
      key: template.key,
      version: {
        lt: template.version,
      },
      status: "active",
    },
    data: {
      status: "inactive",
    },
  });
}

export function findDefaultPromptTemplate(templateKey: string) {
  return DEFAULT_AI_PROMPT_TEMPLATES.find(
    (defaultTemplate) => defaultTemplate.key === templateKey,
  );
}
