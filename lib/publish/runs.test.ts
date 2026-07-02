import { describe, expect, it } from "vitest";

import { buildStandardPublishPackage } from "@/lib/publish-platforms";
import {
  describePublishUploadSelection,
  markAllSyncItemsForUpload,
} from "./runs";

describe("publish run services", () => {
  it("marks every sync item for forced upload while preserving known remote ids", () => {
    expect(
      markAllSyncItemsForUpload(
        [
          {
            contentHash: "hash_project",
            label: "项目",
            localId: "project_1",
            localType: "project",
            payload: {
              title: "照夜寒舟录",
            },
          },
          {
            contentHash: "hash_chapter",
            label: "第 1 章",
            localId: "chapter_1",
            localType: "chapter",
            payload: {
              title: "雨夜旧印",
            },
          },
        ],
        [
          {
            localId: "chapter_1",
            localType: "chapter",
            remoteId: "remote_chapter_1",
          },
        ],
      ),
    ).toEqual([
      {
        changeType: "create",
        contentHash: "hash_project",
        label: "项目",
        localId: "project_1",
        localType: "project",
        payload: {
          title: "照夜寒舟录",
        },
        remoteId: null,
      },
      {
        changeType: "update",
        contentHash: "hash_chapter",
        label: "第 1 章",
        localId: "chapter_1",
        localType: "chapter",
        payload: {
          title: "雨夜旧印",
        },
        remoteId: "remote_chapter_1",
      },
    ]);
  });

  it("describes chapter-scoped publish upload selection for run messages", () => {
    const standardPackage = {
      chapters: [
        {
          chapterNumber: 3,
          id: "chapter_3",
          title: "墙痕对质",
        },
      ],
    } as ReturnType<typeof buildStandardPublishPackage>;

    expect(
      describePublishUploadSelection(
        {
          chapterId: "chapter_3",
          scope: "chapter",
        },
        standardPackage,
      ),
    ).toBe("指定章节：第 3 章《墙痕对质》");
  });
});
