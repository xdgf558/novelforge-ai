import Link from "next/link";
import { BookOpenText, Database, FileText, LayoutDashboard } from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
};

const navItems = [
  {
    href: "/",
    label: "项目",
    icon: LayoutDashboard,
  },
  {
    href: "/projects/new",
    label: "新建",
    icon: FileText,
  },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-ink-950/10 bg-white/82 backdrop-blur lg:fixed lg:inset-y-0 lg:left-0 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 px-5 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink-950 text-white shadow-panel">
              <BookOpenText aria-hidden="true" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-950">NovelForge AI</p>
              <p className="text-xs text-ink-700">长篇连载创作工作台</p>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:flex-col lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-ink-700 transition hover:bg-paper-100 hover:text-ink-950"
                  href={item.href}
                  key={item.href}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden border-t border-ink-950/10 p-5 lg:block">
            <div className="flex items-start gap-3 rounded-lg bg-paper-50 p-3 text-sm text-ink-700">
              <Database aria-hidden="true" className="mt-0.5 h-4 w-4 text-signal-600" />
              <p>本地 SQLite 持久化，已启用项目、设定档与角色库。</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-h-screen flex-1 lg:pl-72">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
