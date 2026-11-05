import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/identity/AuthProvider";
import mascot from "@/assets/mascot.png";
import { AvatarChooser } from './AvatarChooser';
import { Button } from './ui/button';

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <header className="site-nav sticky top-0 z-20 mb-8">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={mascot} alt="" className="h-8 w-8" />
            <span className="brand hidden sm:inline">Treasure Count</span>
          </Link>
          <Link to="/" className="nav-link" activeOptions={{ exact: true }} activeProps={{ className: "nav-link-active" }}>Play</Link>
          <Link to="/journey" className="nav-link" activeProps={{ className: "nav-link-active" }}>Journey</Link>
          <Link to="/aquarium" className="nav-link" activeProps={{ className: "nav-link-active" }}>Aquarium</Link>
          <Link to="/leaderboard" className="nav-link" activeProps={{ className: "nav-link-active" }}>Leaderboard</Link>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <AvatarChooser />
            <Button variant="ghost" className="nav-link px-1" onClick={async () => { await signOut(); navigate({ to: "/auth", replace: true }); }}>Sign out</Button>
          </div>
        ) : (
          <Link to="/auth" className="btn-ghost py-2">Sign in</Link>
        )}
      </nav>
    </header>
  );
}
