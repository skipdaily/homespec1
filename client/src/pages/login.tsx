import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, Home } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate("/dashboard");
          return;
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkSession();
  }, [navigate]);

  // Handle auth state changes (only for new sign-ins)
  useEffect(() => {
    if (isChecking) return; // Don't set up listener until initial check is done
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isChecking]);

  // Show loading state during initial session check
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Home className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Home Spec Tracker
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Sign in to manage your home projects
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {authError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          
          <Auth
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: { 
                  background: '#2563eb', 
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '12px 16px'
                },
                anchor: { 
                  color: '#2563eb',
                  textDecoration: 'none'
                },
                input: {
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  padding: '12px 16px',
                  fontSize: '14px'
                },
                label: {
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                },
                container: {
                  gap: '16px'
                }
              }
            }}
            providers={[]}
            theme="light"
            redirectTo={`${window.location.origin}/dashboard`}
            onlyThirdPartyProviders={false}
            magicLink={false}
            view="sign_in"
            showLinks={true}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Sign in',
                  link_text: "Don't have an account? Sign up"
                },
                sign_up: {
                  email_label: 'Email address', 
                  password_label: 'Create a password',
                  button_label: 'Create account',
                  link_text: 'Already have an account? Sign in'
                }
              }
            }}
            // @ts-ignore - onError prop missing in type definition
            onError={(error: { message: string }) => {
              console.error("Auth error:", error);
              setAuthError(error.message);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}