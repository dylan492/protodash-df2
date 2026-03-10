import { ExternalLink } from "lucide-react";

interface JiraLinkProps {
  ticketId: string | null;
  className?: string;
}

export function JiraLink({ ticketId, className = "" }: JiraLinkProps) {
  if (!ticketId) return null;

  // You can customize the Jira base URL here
  const jiraBaseUrl = "https://alumniventures.atlassian.net/browse";

  return (
    <a
      href={`${jiraBaseUrl}/${ticketId}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`jira-badge inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity ${className}`}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 11.429L0 0h11.429v11.429l.142.142zm0 1.142L11.429 24H0l11.571-11.429zm1.142 0L24 24H12.571V12.571l-.142-.142zm0-1.142L12.571 0H24L12.713 11.429z" />
      </svg>
      {ticketId}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
