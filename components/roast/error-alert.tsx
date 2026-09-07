import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ErrorAlertProps {
  message: string;
}

// Purely presentational: `message` comes straight from the API/validation
// error state in the page component — nothing here is hardcoded.
export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <Alert
      variant="destructive"
      role="alert"
      className="w-full rounded-xl border-primary/30 bg-[var(--destructive-background)] px-4 py-3"
    >
      <AlertTriangle aria-hidden="true" className="size-4 text-primary" />
      <AlertDescription className="font-mono text-sm text-foreground">
        {message}
      </AlertDescription>
    </Alert>
  );
}
