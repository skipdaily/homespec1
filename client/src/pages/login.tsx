import { useEffect } from "react";
import { useLocation } from "wouter";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export default function Login() {
  const [, setLocation] = useLocation();

  // Check if user is already logged in
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });

  useEffect(() => {
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setLocation("/dashboard");
      }
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p>Loading...</p>
      </div>
    );
  }

  // If already logged in, redirect to dashboard
  if (session) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            redirectTo={`${window.location.origin}/dashboard`}
          />
        </CardContent>
      </Card>
    </div>
  );
}