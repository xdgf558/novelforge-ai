import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { updateShortStorySeriesCharacter } from "@/app/series/actions";
import { SeriesCharacterForm } from "@/components/short-story-series/series-character-form";
import { prisma } from "@/lib/prisma";

type EditSeriesCharacterPageProps = {
  params: Promise<{
    seriesId: string;
    characterId: string;
  }>;
  searchParams?: Promise<{
    seriesError?: string;
  }>;
};

export default async function EditSeriesCharacterPage({
  params,
  searchParams,
}: EditSeriesCharacterPageProps) {
  const { seriesId, characterId } = await params;
  const query = await searchParams;
  const character = await prisma.shortStorySeriesCharacter.findFirst({
    where: {
      id: characterId,
      seriesId,
    },
    include: {
      series: {
        select: {
          title: true,
        },
      },
    },
  });

  if (!character) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-700 transition hover:text-signal-600"
          href={`/series/${seriesId}#series-characters`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          返回《{character.series.title}》
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-normal text-ink-950">
          编辑核心人物状态
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-700">
          只记录后续故事必须继承的累计状态；单篇角色档案仍在对应短故事项目中维护。
        </p>
      </header>

      {query?.seriesError === "duplicate-character" ? (
        <p className="rounded-md border border-ember-500/25 bg-ember-500/10 px-4 py-3 text-sm text-ember-500">
          系列中已经存在同名核心人物，请使用其他姓名或编辑原记录。
        </p>
      ) : null}

      <section className="rounded-lg border border-ink-950/10 bg-white p-5 shadow-panel">
        <SeriesCharacterForm
          action={updateShortStorySeriesCharacter.bind(
            null,
            seriesId,
            characterId,
          )}
          cancelHref={`/series/${seriesId}#series-characters`}
          character={character}
          submitLabel="保存人物状态"
        />
      </section>
    </div>
  );
}
