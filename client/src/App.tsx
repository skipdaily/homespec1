import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "./lib/queryClient";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { type Session } from "@supabase/supabase-js";

// Components
import Navbar from "./components/layout/navbar";
import Home from "./pages/home";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Project from "./pages/project";
import Room from "./pages/room";
import NotFound from "./pages/not-found";

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  params?: Record<string, string>;
}

// Protected Route wrapper
function PrivateRoute({ component: Component, params }: PrivateRouteProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    window.location.href = "/login";
    return null;
  }

  return <Component {...params} />;
}

function Router() {
  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/dashboard">
          {() => <PrivateRoute component={Dashboard} />}
        </Route>
        <Route path="/project/:id">
          {(params) => <PrivateRoute component={Project} params={params} />}
        </Route>
        <Route path="/room/:id">
          {(params) => <PrivateRoute component={Room} params={params} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;