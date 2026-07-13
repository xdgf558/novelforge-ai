import { createShortStorySeries } from "@/app/series/actions";
import { SeriesForm } from "@/components/short-story-series/series-form";

export default function NewShortStorySeriesPage() {
  return (
    <SeriesForm
      action={createShortStorySeries}
      submitLabel="创建系列"
      subtitle="系列档案只管理跨篇共享资料。每篇故事仍保留自己的短故事蓝图、写作单元、整篇审校和完整成稿。"
      title="新建系列短故事"
    />
  );
}
