"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MarketplaceConnectCard from "@/app/components/marketplace/MarketplaceConnectCard";

interface Connection {
  id: string;
  marketplace: string;
  marketplace_username: string | null;
  is_active: boolean;
}

const MARKETPLACES = [
  {
    id: "ebay",
    name: "eBay",
    icon: "eB",
    iconBg: "bg-blue-600",
    description: "List on the world's largest card marketplace",
    connectUrl: "/api/ebay/connect",
  },
  {
    id: "tiktok",
    name: "TikTok Shop",
    icon: "TT",
    iconBg: "bg-black",
    description: "Reach 170M+ active US users on TikTok",
    connectUrl: "/api/tiktok/connect",
  },
];

const COMING_SOON = [
  { name: "Shopify", icon: "S", iconBg: "bg-green-600" },
  { name: "Walmart", icon: "W", iconBg: "bg-blue-500" },
  { name: "Whatnot", icon: "W", iconBg: "bg-yellow-500" },
  { name: "Square", icon: "Sq", iconBg: "bg-gray-800" },
  { name: "MyCardPost", icon: "MC", iconBg: "bg-indigo-800" },
  { name: "Loupe", icon: "L", iconBg: "bg-red-600" },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  } | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [config, setConfig] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email || "",
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
          createdAt: user.created_at,
        });
      }
    });

    fetch("/api/marketplace/connections")
      .then((res) => res.json())
      .then((data) => setConnections(data.connections || []))
      .catch(() => {});

    fetch("/api/config/status")
      .then((res) => res.json())
      .then((data) => setConfig(data || {}))
      .catch(() => {});
  }, []);

  const handleDisconnect = async (marketplace: string) => {
    await fetch("/api/marketplace/connections", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marketplace }),
    });
    setConnections((prev) =>
      prev.filter((c) => c.marketplace !== marketplace)
    );
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const isConnected = (marketplace: string) =>
    connections.some((c) => c.marketplace === marketplace && c.is_active);

  const getUsername = (marketplace: string) =>
    connections.find((c) => c.marketplace === marketplace)
      ?.marketplace_username;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">SETTINGS</h1>

      {/* Account */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="font-semibold text-[var(--text-primary)] mb-4">Account</h2>
        {user && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--bg-green-glow)] flex items-center justify-center text-2xl font-bold text-[var(--green)]">
                  {(user.fullName || user.email)[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-[var(--text-primary)]">{user.fullName || "User"}</p>
                <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--text-muted)]">
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Connected Marketplaces */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="font-semibold text-[var(--text-primary)] mb-2">
          Marketplace Connections
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Connect your accounts to cross-list cards across multiple marketplaces.
        </p>
        <div className="space-y-3">
          {MARKETPLACES.map((mp) => (
            <MarketplaceConnectCard
              key={mp.id}
              id={mp.id}
              name={mp.name}
              icon={mp.icon}
              iconBg={mp.iconBg}
              description={mp.description}
              isConnected={isConnected(mp.id)}
              isConfigured={config[mp.id] === true}
              username={getUsername(mp.id)}
              onConnect={() => {
                window.location.href = mp.connectUrl;
              }}
              onDisconnect={() => handleDisconnect(mp.id)}
            />
          ))}
        </div>
      </div>

      {/* Coming Soon */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="font-semibold text-[var(--text-primary)] mb-2">Coming Soon</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          More marketplace integrations are on the way.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {COMING_SOON.map((mp) => (
            <div
              key={mp.name}
              className="flex items-center gap-2 p-3 bg-[var(--bg-primary)] rounded-lg opacity-60"
            >
              <div
                className={`w-8 h-8 rounded flex items-center justify-center text-white font-bold text-xs ${mp.iconBg}`}
              >
                {mp.icon}
              </div>
              <span className="text-sm text-[var(--text-secondary)]">{mp.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sign Out */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h2 className="font-semibold text-red-600 mb-2">Sign Out</h2>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
