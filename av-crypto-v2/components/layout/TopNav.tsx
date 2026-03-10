"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Package,
  ArrowLeftRight,
  Calendar,
  Users,
  Settings,
  Shield,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/custodians", label: "Custodians", icon: Building2 },
  { href: "/", label: "All Assets", icon: Package },
  { href: "/reconciliation", label: "Reconciliation", icon: ArrowLeftRight },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/access", label: "Access", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(212_80%_55%/0.15)] border border-[hsl(212_80%_55%/0.3)]">
              <Shield className="h-5 w-5 text-[hsl(212_80%_65%)]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                AV Crypto Dashboard
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Portfolio Management
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-[hsl(212_80%_55%/0.15)] text-[hsl(212_80%_65%)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="jira-badge">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.571 11.429L0 0h11.429v11.429l.142.142zm0 1.142L11.429 24H0l11.571-11.429zm1.142 0L24 24H12.571V12.571l-.142-.142zm0-1.142L12.571 0H24L12.713 11.429z" />
              </svg>
              Jira Ready
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
