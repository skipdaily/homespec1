import { useState } from 'react';
import { supabase, testSupabaseConnection, checkDnsResolution } from '@/lib/supabase';
import { authFallback } from '@/lib/auth-fallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, WifiIcon, ServerIcon, Globe, AlertTriangle } from 'lucide-react';

export function DebugAuth() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'untested'|'online'|'offline'>('untested');
  const [dnsStatus, setDnsStatus] = useState<'untested'|'success'|'failure'>('untested');
  const [fallbackAuth, setFallbackAuth] = useState<any>(null);
  
  // Check if internet is connected at all
  const checkInternetConnectivity = async () => {
    try {
      // Try to fetch a reliable endpoint
      const response = await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors',
        cache: 'no-cache'
      });
      setNetworkStatus('online');
      return true;
    } catch (error) {
      setNetworkStatus('offline');
      return false;
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing network connection...');
    try {
      // First check general connectivity
      const hasInternet = await checkInternetConnectivity();
      if (!hasInternet) {
        setResult('No internet connection detected. Please check your network connection.');
        return;
      }
      
      // Then check DNS resolution
      const hasDns = await checkDnsResolution();
      setDnsStatus(hasDns ? 'success' : 'failure');
      
      if (!hasDns) {
        setResult(`DNS resolution issues detected. Your system cannot resolve domain names properly.
        
Troubleshooting steps:
1. Use these commands to test DNS resolution:
   - ping ${import.meta.env.VITE_SUPABASE_URL.replace('https://', '')}
   - nslookup ${import.meta.env.VITE_SUPABASE_URL.replace('https://', '')}
   
2. Try changing your DNS servers:
   - Windows: Network settings > Change adapter options > Properties > TCP/IPv4
   - Mac: System Preferences > Network > Advanced > DNS
   - Set to Google DNS: 8.8.8.8, 8.8.4.4
   - Or Cloudflare: 1.1.1.1, 1.0.0.1`);
        return;
      }
      
      // Test Supabase connection
      const supabaseConnected = await testSupabaseConnection();
      
      // Check fallback auth status
      const fallbackAuthData = authFallback.getLocalAuthState();
      setFallbackAuth(fallbackAuthData);
      
      if (!supabaseConnected) {
        setResult(`Cannot connect to Supabase API, but DNS resolution works.
        
This could be caused by:
1. Firewall blocking the connection
2. Network restrictions (common in corporate/school networks)
3. ISP interference
        
Try using a different network connection (mobile hotspot).
        
Fallback auth is ${fallbackAuthData ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
        return;
      }
      
      setResult(`Connection successful! Supabase API is reachable.
      
Fallback auth status: ${fallbackAuthData ? 'AVAILABLE (synced '+ new Date(fallbackAuthData.lastSync).toLocaleString() + ')' : 'NOT CONFIGURED'}`);
      
    } catch (error) {
      setResult(`Connection Error: ${error instanceof Error ? error.message : String(error)}`);
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
              <WifiIcon className={networkStatus === 'online' ? 'text-green-500' : 'text-gray-400'} size={16} />
              <span>Internet: {networkStatus === 'untested' ? 'Not tested' : networkStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className={dnsStatus === 'success' ? 'text-green-500' : 'text-gray-400'} size={16} />
              <span>DNS Resolution: {dnsStatus === 'untested' ? 'Not tested' : dnsStatus}</span>
            </div>
          </div>
          
          <Button 
            onClick={testConnection} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Supabase Connection'}
          </Button>
          
          {result && (
            <Alert variant={result.includes('Error') || result.includes('Cannot') ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Connection Test Results</AlertTitle>
              <AlertDescription>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {result}
                </pre>
              </AlertDescription>
            </Alert>
          )}
          
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertTitle>DNS Resolution Issues?</AlertTitle>
            <AlertDescription>
              <p className="mt-2 text-sm">If you're seeing "ERR_NAME_NOT_RESOLVED" errors:</p>
              <ol className="list-decimal pl-5 mt-2 text-sm space-y-1">
                <li>Try using your mobile phone as a hotspot</li>
                <li>Run these commands in your terminal:
                  <pre className="bg-gray-100 p-1 mt-1 rounded text-xs">
                    ping {import.meta.env.VITE_SUPABASE_URL.replace('https://', '')}{'\n'}
                    nslookup {import.meta.env.VITE_SUPABASE_URL.replace('https://', '')}
                  </pre>
                </li>
                <li>Flush your DNS cache:
                  <pre className="bg-gray-100 p-1 mt-1 rounded text-xs">
                    {/* Windows */}
                    ipconfig /flushdns{'\n\n'}
                    {/* Mac */}
                    sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
                  </pre>
                </li>
                <li>Try changing your DNS servers to Google (8.8.8.8) or Cloudflare (1.1.1.1)</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
