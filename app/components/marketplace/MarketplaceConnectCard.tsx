"use client";

interface MarketplaceConnectCardProps {
  id: string;
  name: string;
  icon: string;
  iconBg: string;
  description: string;
  isConnected: boolean;
  isConfigured?: boolean;
  username?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function MarketplaceConnectCard({
  name,
  icon,
  iconBg,
  description,
  isConnected,
  isConfigured = true,
  username,
  onConnect,
  onDisconnect,
}: MarketplaceConnectCardProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${iconBg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {isConnected && username
              ? `Connected as ${username}`
              : !isConfigured
              ? "Awaiting API credentials"
              : description}
          </p>
        </div>
      </div>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Connected
          </span>
          <button
            onClick={onDisconnect}
            className="text-xs text-[var(--text-muted)] hover:text-red-600 font-medium cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      ) : !isConfigured ? (
        <span
          className="px-3 py-1.5 bg-[var(--bg-card-hover)] text-[var(--text-muted)] text-xs font-medium rounded-lg cursor-not-allowed"
          title="API credentials need to be added before this marketplace can be connected"
        >
          Coming Soon
        </span>
      ) : (
        <button
          onClick={onConnect}
          className="px-3 py-1.5 bg-[var(--green)] text-white text-xs font-medium rounded-lg hover:bg-[var(--green-hover)] transition-colors cursor-pointer"
        >
          Connect
        </button>
      )}
    </div>
  );
}
