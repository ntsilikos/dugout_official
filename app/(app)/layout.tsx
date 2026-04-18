"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AppSidebar from "@/app/components/layout/AppSidebar";
import { ToastProvider } from "@/app/components/ui/Toast";
import AppHeader from "@/app/components/layout/AppHeader";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({
          email: user.email || "",
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatarUrl: user.user_metadata?.avatar_url || null,
        });
      }
    });
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen bg-[var(--bg-primary)]">
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader
            email={user?.email || ""}
            fullName={user?.fullName || null}
            avatarUrl={user?.avatarUrl || null}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
