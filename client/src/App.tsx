import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { type Session } from "@supabase/supabase-js";
import { ensureStorageBucket } from "./lib/supabase-storage";

// Components
import Navbar from "./components/layout/navbar";
import Home from "./pages/home";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Project from "./pages/project";
import Room from "./pages/room";
import Performance from "./pages/performance";
import NotFound from "./pages/not-found";

// Tutorial Components
import { TutorialProvider } from "./components/tutorial/TutorialContext";
import { TutorialStep } from "./components/tutorial/TutorialStep";

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  params?: { [key: string]: string | undefined };
}

// Protected Route wrapper
function PrivateRoute({ component: Component, params }: PrivateRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setSession(session);
        setLoading(false);
        
        // Only redirect if not already on login page and no session
        if (!session) {
          navigate("/login");
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setSession(session);
        
        // Invalidate session query to keep navbar in sync
        queryClient.invalidateQueries({ queryKey: ["session"] });
        
        // Handle sign out
        if (event === "SIGNED_OUT") {
          navigate("/login");
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null; // Let the redirect happen
  }

  return <Component {...params} />;
}

// Public Project Route
function PublicProjectRoute({ params }: { params: { id: string } }) {
  return <Project {...params} />;
}

function Router() {
  useEffect(() => {
    // Ensure storage bucket exists when app initializes
    ensureStorageBucket().catch(console.error);
  }, []);

  return (
    <>
      <Navbar />
      <TutorialStep />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard">
          {() => <PrivateRoute component={Dashboard} />}
        </Route>
        <Route path="/project/:id">
          {(params) => <PublicProjectRoute params={params} />}
        </Route>
        <Route path="/project/:id/edit">
          {(params) => <PrivateRoute component={Project} params={params} />}
        </Route>
        <Route path="/room/:id">
          {(params) => <PrivateRoute component={Room} params={params} />}
        </Route>
        <Route path="/performance">
          {() => <PrivateRoute component={Performance} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TutorialProvider>
        <Router />
        <Toaster />
      </TutorialProvider>
    </QueryClientProvider>
  );
}

export default App;