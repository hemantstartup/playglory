import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { setAuthTokenGetter, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Users from "@/pages/users";
import Turfs from "@/pages/turfs";
import Matches from "@/pages/matches";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

setAuthTokenGetter(() => localStorage.getItem("glory_token"));

function ProtectedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("glory_token");
  
  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false
    }
  });

  useEffect(() => {
    if (!token || isError || (user && user.role !== "admin")) {
      if (!isLoading) {
        localStorage.removeItem("glory_token");
        setLocation("/login");
      }
    }
  }, [token, isError, user, isLoading, setLocation]);

  if (isLoading || !user) {
    return <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">Loading...</div>;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
}

function Router() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (location === "/") {
      setLocation("/dashboard");
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/turfs"><ProtectedRoute component={Turfs} /></Route>
      <Route path="/matches"><ProtectedRoute component={Matches} /></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
