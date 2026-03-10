"use client";

import { Info, FileText, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DataDisclaimerProps {
  message: string;
  timestamp?: Date;
}

export function DataDisclaimer({ message, timestamp }: DataDisclaimerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
      <Info className="h-4 w-4 text-muted-foreground shrink-0" />
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
      {mounted && timestamp && (
        <span className="ml-auto text-xs text-muted-foreground mono shrink-0">
          Updated: {timestamp.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}

export function JiraDisclaimer() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[hsl(212_80%_55%/0.1)] border border-[hsl(212_80%_55%/0.2)]">
      <FileText className="h-4 w-4 text-[hsl(212_80%_65%)] shrink-0" />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Jira is the system of record.</span>
        {' '}All trading instructions, approvals, and audit trails are managed through Jira tickets.
      </p>
    </div>
  );
}

export function TaxDisclaimer() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-warning/10 border border-warning/20">
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Tax exports are preparer-ready.</span>
        {' '}This is not tax advice. Consult a qualified tax professional.
      </p>
    </div>
  );
}