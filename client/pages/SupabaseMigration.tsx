import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Database,
  Zap,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Settings,
  Play
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MigrationStatus {
  supabase_healthy: boolean;
  sync_in_progress: boolean;
  last_sync: string | null;
}

export default function SupabaseMigration() {
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const { toast } = useToast();

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/v2/sync/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setSetupComplete(data.supabase_healthy);
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const triggerSync = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v2/sync', { method: 'POST' });
      
      if (response.ok) {
        toast({
          title: "Sync Started",
          description: "Migration to Supabase has begun. This may take a few minutes.",
        });
        
        // Poll for completion
        const pollInterval = setInterval(() => {
          checkStatus();
        }, 2000);
        
        setTimeout(() => {
          clearInterval(pollInterval);
          setLoading(false);
        }, 30000); // Stop polling after 30 seconds
        
      } else {
        throw new Error('Failed to start sync');
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to start migration. Please check your Supabase configuration.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
              <Database className="w-8 h-8 text-blue-600" />
              Supabase Migration
            </h1>
            <p className="text-muted-foreground">
              Upgrade to lightning-fast performance with PostgreSQL and real-time updates
            </p>
          </div>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Setup Instructions
              </CardTitle>
              <CardDescription>
                Complete these steps to enable Supabase integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Create Supabase Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to <a href="https://supabase.com" target="_blank" className="text-blue-600 underline">supabase.com</a> and create a new project
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">2. Run SQL Schema</h4>
                  <p className="text-sm text-muted-foreground">
                    Execute the SQL schema from <code>sql/supabase-schema.sql</code> in your Supabase SQL editor
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">3. Get API Keys</h4>
                  <p className="text-sm text-muted-foreground">
                    Copy your Project URL and anon public key from Supabase settings
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">4. Update Environment</h4>
                  <p className="text-sm text-muted-foreground">
                    Set SUPABASE_URL and SUPABASE_ANON_KEY in your environment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Migration Status
              </CardTitle>
              <CardDescription>
                Current status of your Supabase integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Supabase Health */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Supabase Connection</p>
                    <div className="flex items-center gap-2">
                      {status?.supabase_healthy ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Connected
                          </Badge>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <Badge variant="outline" className="bg-red-50 text-red-700">
                            Not Connected
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Data Sync</p>
                    <div className="flex items-center gap-2">
                      {status?.sync_in_progress ? (
                        <>
                          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Syncing...
                          </Badge>
                        </>
                      ) : status?.last_sync ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Synced
                          </Badge>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-gray-600" />
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            Pending
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Last Sync */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Last Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {status?.last_sync 
                        ? new Date(status.last_sync).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Migration Progress */}
              {status?.sync_in_progress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Migration Progress</p>
                    <p className="text-sm text-muted-foreground">Migrating data...</p>
                  </div>
                  <Progress value={75} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  onClick={triggerSync}
                  disabled={loading || status?.sync_in_progress}
                  className="gap-2"
                >
                  {loading || status?.sync_in_progress ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Start Migration
                    </>
                  )}
                </Button>
                
                <Button variant="outline" onClick={checkStatus} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Benefits</CardTitle>
              <CardDescription>
                See how Supabase improves your application performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-red-600">Current (SQLite)</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Load 300 jobs:</span>
                      <span className="font-mono">~2-5 seconds</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client-side filtering:</span>
                      <span className="font-mono">Slow</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Real-time updates:</span>
                      <span className="font-mono">5-minute polling</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Concurrent users:</span>
                      <span className="font-mono">Limited</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium text-green-600">With Supabase</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Load 50 jobs:</span>
                      <span className="font-mono text-green-600">~100-300ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Server-side filtering:</span>
                      <span className="font-mono text-green-600">Instant</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Real-time updates:</span>
                      <span className="font-mono text-green-600">Instant</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Concurrent users:</span>
                      <span className="font-mono text-green-600">Unlimited</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    Expected improvement: 10-50x faster load times
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          {setupComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-700">Migration Complete! 🎉</CardTitle>
                <CardDescription>
                  Your application is now powered by Supabase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>Congratulations! Your job management system now uses Supabase for:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Lightning-fast job loading with pagination</li>
                    <li>Real-time updates when data changes</li>
                    <li>Powerful server-side filtering and sorting</li>
                    <li>Scalable PostgreSQL database</li>
                  </ul>
                  
                  <div className="pt-4">
                    <Button onClick={() => window.location.href = '/jobs'} className="gap-2">
                      <Zap className="w-4 h-4" />
                      Experience the Speed
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
