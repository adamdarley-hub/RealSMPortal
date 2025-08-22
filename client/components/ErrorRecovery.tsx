import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface ErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  isRetrying?: boolean;
  showOfflineIndicator?: boolean;
}

export function ErrorRecovery({
  error,
  onRetry,
  isRetrying = false,
  showOfflineIndicator = false,
}: ErrorRecoveryProps) {
  const getErrorType = (errorMessage: string) => {
    if (
      errorMessage.includes("FullStory") ||
      errorMessage.includes("analytics")
    ) {
      return "analytics";
    }
    if (errorMessage.includes("timeout")) {
      return "timeout";
    }
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("Failed to fetch")
    ) {
      return "network";
    }
    return "general";
  };

  const getErrorAdvice = (errorType: string) => {
    switch (errorType) {
      case "analytics":
        return "Analytics interference detected. Try refreshing the page or disabling browser extensions.";
      case "timeout":
        return "The server is taking longer than expected. Please wait a moment and try again.";
      case "network":
        return "Check your internet connection and try again.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  };

  const errorType = getErrorType(error);
  const advice = getErrorAdvice(errorType);

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {showOfflineIndicator ? (
            <WifiOff className="w-12 h-12 text-red-500" />
          ) : (
            <AlertCircle className="w-12 h-12 text-yellow-500" />
          )}
        </div>
        <CardTitle className="text-lg">Connection Issue</CardTitle>
        <CardDescription>{advice}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
          <strong>Error details:</strong> {error}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={onRetry} disabled={isRetrying} className="w-full">
            {isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </>
            )}
          </Button>

          {errorType === "analytics" && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          <div className="flex items-center justify-center gap-2">
            <Wifi className="w-3 h-3" />
            {navigator.onLine ? "Online" : "Offline"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
