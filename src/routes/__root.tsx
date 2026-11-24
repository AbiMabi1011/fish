/**
 * Root layout shared by every page: React Query, AuthProvider, OceanBackdrop,
 * SiteHeader, the current route (<Outlet />), and toast notifications.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useLocation,
} from "@tanstack/react-router";
import { AuthProvider } from "@/identity/AuthProvider";
import { SiteHeader } from "@/components/SiteHeader";
import { OceanBackdrop } from "@/components/OceanBackdrop";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="p-12 text-center">
      <h1>Page not found</h1>
      <Link to="/">Return home</Link>
    </main>
  ),
});

function RootLayout() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const isAquariumPage = pathname === "/aquarium";
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="ocean min-h-screen text-foreground">
          {!isAquariumPage && <OceanBackdrop />}
          <SiteHeader />
          <Outlet />
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
