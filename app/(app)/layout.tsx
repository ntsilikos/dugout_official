"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import AppSidebar from "@/app/components/layout/AppSidebar";
import { ToastProvider } from "@/app/components/ui/Toast";
import AppHeader from "@/app/components/layout/AppHeader";
import { TutorialProvider } from "@/app/components/tutorial/TutorialContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    createdAt: string;
  } | null>(null);

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
  }, []);

  // Auto-start the tutorial for users who signed up in the last 5 minutes
  // (and haven't already dismissed it). Older accounts see it only via the button.
  const isNewUser = user
    ? Date.now() - new Date(user.createdAt).getTime() < 5 * 60 * 1000
    : false;

  return (
    <ToastProvider>
      <TutorialProvider autoStart={isNewUser}>
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
      </TutorialProvider>
    </ToastProvider>
  );
}
