import { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection, checkDnsResolution } from '@/lib/supabase';
import { authFallback } from '@/lib/auth-fallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, WifiIcon, ServerIcon, Globe, AlertTriangle, RefreshCw, Network } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function DebugAuth() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'untested'|'online'|'offline'|'restricted'>('untested');
  const [dnsStatus, setDnsStatus] = useState<'untested'|'success'|'failure'|'partial'>('untested');
  const [fallbackAuth, setFallbackAuth] = useState<any>(null);
  const [detailedNetworkInfo, setDetailedNetworkInfo] = useState<Record<string, boolean>>({});
  const [connectionAttemptCount, setConnectionAttemptCount] = useState(0);
  
  useEffect(() => {
    checkInternetBasic();
  }, []);

  const checkInternetBasic = async () => {
    try {
      const supabaseDomain = import.meta.env.VITE_SUPABASE_URL;
      
      await fetch(`${supabaseDomain}/rest/v1/?cacheblock=${Date.now()}`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
      
      setNetworkStatus('online');
      return true;
    } catch (error) {
      setNetworkStatus('offline');
      return false;
    }
  };
  
  const checkInternetConnectivity = async () => {
    try {
      const endpoints = {
        'supabase': `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        'self_origin': `${window.location.origin}/favicon.ico`
      };
      
      const results: Record<string, boolean> = {};
      
      await Promise.all(Object.entries(endpoints).map(async ([name, url]) => {
        try {
          const options: RequestInit = {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000)
          };
          
          if (name === 'supabase') {
            options.headers = { 
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY
            };
          }
          
          await fetch(url, options);
          results[name] = true;
        } catch (e) {
          results[name] = false;
          console.error(`Connection test failed for ${name}:`, e);
        }
      }));
      
      setDetailedNetworkInfo(results);
      
      const successCount = Object.values(results).filter(Boolean).length;
      if (successCount === Object.keys(endpoints).length) {
        setNetworkStatus('online');
        return true;
      } else if (successCount > 0) {
        setNetworkStatus('restricted');
        return true;
      } else {
        setNetworkStatus('offline');
        return false;
      }
    } catch (error) {
      setNetworkStatus('offline');
      return false;
    }
  };

  const runDnsTest = async () => {
    const domains = {
      'supabase_api': import.meta.env.VITE_SUPABASE_URL
    };
    
    const results: Record<string, boolean> = {};
    let successCount = 0;
    let tries = 0;
    
    for (const [name, url] of Object.entries(domains)) {
      tries++;
      try {
        await fetch(`${url}/rest/v1/`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000)
        });
        results[name] = true;
        successCount++;
      } catch (e) {
        results[name] = false;
        console.error(`DNS test failed for ${name}:`, e);
      }
    }
    
    setDetailedNetworkInfo(prev => ({ ...prev, ...results }));
    
    if (successCount === tries) {
      setDnsStatus('success');
      return true;
    } else {
      setDnsStatus('failure');
      return false;
    }
  };

  const tryDirectSupabaseConnection = async () => {
    try {
      const opts = [
        { headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY } },
        { headers: { 
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, 
            Accept: 'application/json' as string, 
            'Content-Type': 'application/json' as string
          }
        },
        { headers: { 
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY, 
            'User-Agent': 'Mozilla/5.0' as string
          }
        }
      ];
      
      for (const opt of opts) {
        try {
          const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
            ...opt,
            cache: 'no-store',
            signal: AbortSignal.timeout(5000) // Add a 5-second timeout
          });
          if (res.ok) {
            console.log("Connection successful with options:", opt);
            return true;
          } else {
            console.warn("Connection returned status:", res.status, res.statusText);
          }
        } catch (e) {
          console.warn("Connection attempt failed:", e);
        }
      }
      
      return false;
    } catch (e) {
      return false;
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setConnectionAttemptCount(prev => prev + 1);
    setResult('Testing connection to Supabase...');
    
    try {
      const hasInternet = await checkInternetConnectivity();
      
      if (!hasInternet) {
        setResult(`Cannot connect to Supabase API.

Troubleshooting steps:
1. Check your Wi-Fi or cable connection
2. Restart your router/modem
3. Try connecting through a mobile hotspot
4. Disable any VPN or proxy services
5. If on a public/work/school network, they may be blocking API connections`);
        return;
      }
      
      const supabaseConnected = await testSupabaseConnection();
      
      try {
        const fallbackAuthData = authFallback?.getLocalAuthState?.();
        setFallbackAuth(fallbackAuthData);
      } catch (e) {
        console.error("Fallback auth not available:", e);
      }
      
      if (!supabaseConnected) {
        const directConnectionWorks = await tryDirectSupabaseConnection();
        
        if (directConnectionWorks) {
          setResult(`Connection succeeded with alternative method!
          
Your network appears to have some restrictions, but we found a way through.
Refresh the page and try logging in again.`);
          return;
        }
        
        setResult(`Cannot connect to the Supabase API.
        
This could be caused by:
1. Firewall blocking the connection (port 443)
2. Network restrictions (common in corporate/school networks)
3. ISP interference or content filtering
4. Anti-virus/security software blocking the connection
        
Try using a different network connection (mobile hotspot) or VPN.
        
Fallback auth is ${fallbackAuth ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
        return;
      }
      
      setResult(`Success! Connection to Supabase API is working properly.
      
Network status: ${networkStatus}
DNS resolution: ${dnsStatus}
      
Fallback auth status: ${fallbackAuth ? 'AVAILABLE (synced '+ new Date(fallbackAuth.lastSync).toLocaleString() + ')' : 'NOT CONFIGURED'}`);
      
    } catch (error) {
      setResult(`Connection test error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServerIcon className="h-5 w-5" /> Supabase Connection Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <WifiIcon 
                className={
                  networkStatus === 'online' ? 'text-green-500' : 
                  networkStatus === 'restricted' ? 'text-yellow-500' :
                  'text-gray-400'
                } 
                size={16} 
              />
              <span>Internet: {networkStatus === 'untested' ? 'Not tested' : networkStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe 
                className={
                  dnsStatus === 'success' ? 'text-green-500' : 
                  dnsStatus === 'partial' ? 'text-yellow-500' :
                  'text-gray-400'
                } 
                size={16} 
              />
              <span>DNS Resolution: {dnsStatus === 'untested' ? 'Not tested' : dnsStatus}</span>
            </div>
          </div>
          
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Test</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 mt-4">
              <Button 
                onClick={testConnection} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Testing...' : 'Test Supabase Connection'}
              </Button>
              
              {result && (
                <Alert variant={result.includes('Success') ? 'default' : 'destructive'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Connection Test Results</AlertTitle>
                  <AlertDescription>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                      {result}
                    </pre>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={checkInternetConnectivity} variant="outline" size="sm">
                  <WifiIcon className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                <Button onClick={testSupabaseConnection} variant="outline" size="sm">
                  <ServerIcon className="mr-2 h-4 w-4" />
                  Supabase API
                </Button>
                <Button onClick={tryDirectSupabaseConnection} variant="outline" size="sm">
                  <Network className="mr-2 h-4 w-4" />
                  Direct Connect
                </Button>
                <Button onClick={testConnection} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Full Test
                </Button>
              </div>
              
              {Object.entries(detailedNetworkInfo).length > 0 && (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Detailed Network Status</AlertTitle>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    {Object.entries(detailedNetworkInfo).map(([name, success]) => (
                      <div key={name} className="flex items-center text-xs">
                        <div className={`w-2 h-2 rounded-full mr-1 ${success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        {name}: {success ? 'OK' : 'Failed'}
                      </div>
                    ))}
                  </div>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          
          <Alert variant="default">
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>Connection Issues?</AlertTitle>
            <AlertDescription>
              <p className="mt-2 text-sm">Most common solutions for connection errors:</p>
              <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
                <li><strong>Mobile Hotspot:</strong> Connect via your phone's hotspot to bypass network restrictions</li>
                <li><strong>Use Public DNS:</strong> Change your DNS to Google (8.8.8.8) or Cloudflare (1.1.1.1)</li>
                <li><strong>Check Firewall:</strong> Make sure your firewall allows connections to *.supabase.co</li>
                <li><strong>Network Switch:</strong> Try a different network (home vs work/school)</li>
                <li><strong>Browser Incognito:</strong> Try an incognito/private window to bypass extensions</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
