import { ReactNode } from "react";
import { TopNav } from "./TopNav";

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="container py-8">{children}</main>
    </div>
  );
}
