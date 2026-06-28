import { readStationCatPublishSecrets } from "@/lib/ai/local-config";
import { prisma } from "@/lib/prisma";
import { fetchStationCatPublishedChapterContent } from "@/lib/station-cat-chapter-content";
import { hashAudioSourceText, type ResolvedAudioSourceText } from "./text-source";

export type PublishedAudioSource = ResolvedAudioSourceText & {
  remoteChapterId: string;
  remoteUpdatedAt: string | null;
  remoteTitle: string;
};

export async function resolveWebsitePublishedAudioSource({
  chapterId,
  projectId,
}: {
  chapterId: string;
  projectId: string;
}): Promise<PublishedAudioSource> {
  const remote = await loadStationCatChapterRemote(projectId, chapterId);

  if (!remote?.remoteId) {
    throw new Error("这章还没有个人网站远端章节 ID，请先发布到 Station Cat。");
  }

  const stationCatSecrets = readStationCatPublishSecrets();
  const content = await fetchStationCatPublishedChapterContent({
    apiBaseUrl: remote.apiBaseUrl || stationCatSecrets.apiBaseUrl,
    remoteChapterId: remote.remoteId,
    token: remote.token || stationCatSecrets.token,
  });

  return {
    hash: hashAudioSourceText(content.body),
    remoteChapterId: content.remoteId,
    remoteTitle: content.title,
    remoteUpdatedAt: content.updatedAt,
    text: content.body,
    type: "publishedText",
  };
}

export async function loadStationCatPublishedChapterIds(projectId: string) {
  const states = await prisma.publishSyncState.findMany({
    where: {
      localType: "chapter",
      projectId,
      remoteId: {
        not: null,
      },
      target: {
        is: {
          platformKey: "station_cat",
          status: "active",
        },
      },
    },
    select: {
      localId: true,
    },
  });

  return new Set(states.map((state) => state.localId));
}

async function loadStationCatChapterRemote(projectId: string, chapterId: string) {
  const target = await prisma.publishTarget.findFirst({
    where: {
      platformKey: "station_cat",
      projectId,
      status: "active",
      syncStates: {
        some: {
          localId: chapterId,
          localType: "chapter",
          remoteId: {
            not: null,
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      apiBaseUrl: true,
      tokenSecret: true,
      syncStates: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 1,
        where: {
          localId: chapterId,
          localType: "chapter",
          remoteId: {
            not: null,
          },
        },
        select: {
          remoteId: true,
        },
      },
    },
  });
  const syncState = target?.syncStates[0];

  if (!target || !syncState?.remoteId) {
    return null;
  }

  return {
    apiBaseUrl: target.apiBaseUrl,
    remoteId: syncState.remoteId,
    token: target.tokenSecret,
  };
}
