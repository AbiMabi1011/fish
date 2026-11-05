import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Outlet,createRootRouteWithContext,Link,useLocation} from '@tanstack/react-router';
import {AuthProvider} from '@/identity/AuthProvider';
import {SiteHeader} from '@/components/SiteHeader';
import {OceanBackdrop} from '@/components/OceanBackdrop';
import {Toaster} from '@/components/ui/sonner';
export const Route=createRootRouteWithContext<{queryClient:QueryClient}>()({component:Root,notFoundComponent:()=> <main className="p-12 text-center"><h1>Page not found</h1><Link to="/">Return home</Link></main>});
function Root(){const aquarium=useLocation({select:location=>location.pathname})==="/aquarium";const {queryClient}=Route.useRouteContext();return <QueryClientProvider client={queryClient}><AuthProvider><div className="ocean min-h-screen text-foreground">{!aquarium&&<OceanBackdrop/>}<SiteHeader/><Outlet/></div><Toaster/></AuthProvider></QueryClientProvider>;}
