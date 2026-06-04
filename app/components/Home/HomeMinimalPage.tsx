import { Logo } from "../Icons/Logo";
import { NewFile } from "../NewFile";
import { Title } from "../Primitives/Title";

export function HomeMinimalPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[rgb(56,52,139)]">
      <header className="flex h-12 items-center px-4">
        <div className="w-32">
          <Logo />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-lg">
          <Title className="mb-6 text-white">Главная страница</Title>
          <NewFile />
        </div>
      </main>
    </div>
  );
}
