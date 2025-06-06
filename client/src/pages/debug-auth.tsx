import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, WifiIcon, ServerIcon, Globe, AlertTriangle } from 'lucide-react';

export function DebugAuth() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'untested'|'online'|'offline'>('untested');
  const [dnsStatus, setDnsStatus] = useState<'untested'|'success'|'failure'>('untested');
  
  // Check if internet is connected at all
  const checkInternetConnectivity = async () => {
    try {
      // Try to fetch a reliable endpoint
      const response = await fetch('https://www.google.com/generate_204', {
        mode: 'no-cors', // This prevents CORS issues during the connectivity check
        cache: 'no-cache'
      });
      setNetworkStatus('online');
      return true;
    } catch (error) {
      setNetworkStatus('offline');
      return false;
    }
  };

  // Check if DNS resolution works for common domains
  const checkDnsResolution = async () => {
    try {
      // Try multiple domains to confirm DNS is working
      await fetch('https://cloudflare.com/cdn-cgi/trace', { mode: 'no-cors' });
      await fetch('https://api.github.com', { mode: 'no-cors' });
      setDnsStatus('success');
      return true;
    } catch (error) {
      setDnsStatus('failure');
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
      if (!hasDns) {
        setResult('DNS resolution issues detected. Your system cannot resolve domain names properly.');
        return;
      }
      
      // Test Supabase domain specifically
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      setResult(`Testing connection to ${supabaseUrl}...`);
      
      // Try a basic fetch to the root of the domain first (with no-cors)
      try {
        await fetch(`${supabaseUrl}`, { mode: 'no-cors' });
      } catch (e) {
        setResult(`ERROR: Cannot reach Supabase domain. DNS resolution failure for: ${supabaseUrl}\n\nTroubleshooting steps:\n1. Try using a different network (mobile hotspot)\n2. Check if a VPN is blocking the connection\n3. Flush your DNS cache (ipconfig /flushdns on Windows)`);
        return;
      }
      
      // Now try the actual API endpoint
      const response = await fetch(`${supabaseUrl}/auth/v1/`, {
        method: 'GET',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      const text = await response.text();
      setResult(`Connection successful!\nStatus: ${response.status}\nResponse: ${text}`);
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide specific error guidance
      if (errorMessage.includes('ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `DNS RESOLUTION ERROR: Your system cannot resolve the Supabase domain name.\n\nPossible causes and solutions:\n1. DNS server issues - Try using a different DNS server (8.8.8.8 or 1.1.1.1)\n2. Hosts file conflict - Check if your hosts file has entries for Supabase\n3. Network/ISP restrictions - Try from a different network\n4. VPN interference - Disable any active VPN\n5. Try accessing directly from browser: ${import.meta.env.VITE_SUPABASE_URL}`;
      }
      
      setResult(`Connection Error: ${errorMessage}`);
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
            <Alert variant={result.includes('Error') || result.includes('ERROR') ? 'destructive' : 'default'}>
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
                <li>Flush your DNS cache (command varies by operating system)</li>
                <li>Try changing your DNS servers to Google (8.8.8.8) or Cloudflare (1.1.1.1)</li>
                <li>Disable any VPN services or proxy settings</li>
                <li>Check if your ISP is blocking the domain</li>
              </ol>
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
