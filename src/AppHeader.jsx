import { ModeToggle } from "./components/misc/mode-toggle";

export function AppHeader({ user }) {
  const name =
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  return (
    <header className="flex h-16 items-center border-b px-4 w-full">
      <h1 className="text-sm font-medium text-muted-foreground">
        Good day,{" "}
        <span className="text-foreground font-semibold">{name}</span>
      </h1>

      {/* Spacer pushes everything after it to the right */}
      <div className="ml-auto" />

      <ModeToggle />
    </header>
  );
}
