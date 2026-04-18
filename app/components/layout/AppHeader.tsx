import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";

interface AppHeaderProps {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  onMenuToggle: () => void;
}

export default function AppHeader({ email, fullName, avatarUrl, onMenuToggle }: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
        aria-label="Toggle menu"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu email={email} fullName={fullName} avatarUrl={avatarUrl} />
      </div>
    </header>
  );
}
