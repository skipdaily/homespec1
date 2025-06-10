import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoIcon, ServerIcon, DatabaseIcon, RefreshCw, BrainCircuitIcon } from 'lucide-react';

interface ServerStatus {
  status: string;
  timestamp: string;
  environment: string;
  storageMode: string;
  database: {
    connected: boolean;
    connectionState: {
      configured: boolean;
      connected: boolean;
      error: string | null;
    };
  };
  version: string;
}

export function DebugServerStatus() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/debug/status');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerIcon className="h-5 w-5" />
          Server Status
        </CardTitle>
        <CardDescription>
          Check the current state of the backend server and its components
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && !status && (
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        )}

        {status && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.status === 'OK' ? 'success' : 'destructive'}>
                {status.status}
              </Badge>
              <Badge variant="outline">
                {status.environment}
              </Badge>
              <Badge variant={status.storageMode === 'database' ? 'default' : 'secondary'}>
                Storage: {status.storageMode}
              </Badge>
              <Badge variant={status.database.connected ? 'success' : 'destructive'}>
                Database: {status.database.connected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="storage">Storage</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Environment:</div>
                  <div>{status.environment}</div>
                  <div className="font-medium">Version:</div>
                  <div>{status.version}</div>
                  <div className="font-medium">Timestamp:</div>
                  <div>{new Date(status.timestamp).toLocaleString()}</div>
                </div>
              </TabsContent>

              <TabsContent value="database" className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Status:</div>
                  <div>
                    {status.database.connected ? (
                      <span className="text-green-600">Connected</span>
                    ) : (
                      <span className="text-red-600">Disconnected</span>
                    )}
                  </div>
                  <div className="font-medium">Configured:</div>
                  <div>{status.database.connectionState.configured ? 'Yes' : 'No'}</div>
                  {status.database.connectionState.error && (
                    <>
                      <div className="font-medium">Error:</div>
                      <div className="text-red-600">{status.database.connectionState.error}</div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="storage" className="space-y-2 mt-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Mode:</div>
                  <div>
                    {status.storageMode === 'database' && (
                      <span className="text-blue-600">Database (Real data)</span>
                    )}
                    {status.storageMode === 'mock' && (
                      <span className="text-amber-600">Mock (In-memory data)</span>
                    )}
                    {status.storageMode === 'simple' && (
                      <span className="text-red-600">Simple (Emergency fallback)</span>
                    )}
                  </div>
                  <div className="font-medium">Database Dependency:</div>
                  <div>
                    {status.storageMode === 'database' ? (
                      <span className="text-green-600">Required</span>
                    ) : (
                      <span className="text-gray-600">Not required</span>
                    )}
                  </div>
                </div>

                <Alert>
                  <BrainCircuitIcon className="h-4 w-4" />
                  <AlertTitle>Storage Info</AlertTitle>
                  <AlertDescription>
                    Using database storage - data will persist.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button 
                onClick={fetchStatus} 
                variant="outline" 
                size="sm" 
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh Status'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
