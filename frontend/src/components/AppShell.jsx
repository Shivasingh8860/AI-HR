import { 
  BarChart3, BriefcaseBusiness, FileUp, LayoutDashboard, LogOut, Menu, 
  Settings, Shield, X, Zap, Search, Plus, User 
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import CommandPalette from "./CommandPalette.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const baseLinks = [
  { to: "/", label: "Candidates", icon: LayoutDashboard },
  { to: "/jobs", label: "Job Openings", icon: BriefcaseBusiness },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const links = user?.role === "Admin"
    ? [...baseLinks, { to: "/admin", label: "Admin Panel", icon: Shield }]
    : baseLinks;

  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === "u" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) {
        navigate("/upload");
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col">
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}

      {/* Desktop Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            
            {/* Left: Clickable Logo */}
            <Link 
              to="/" 
              title="Go to Dashboard" 
              className="flex items-center gap-2.5 group transition-transform shrink-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-background shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Zap size={20} className="fill-current" />
              </div>
              <div className="block">
                <div className="text-base font-extrabold tracking-tight text-text-primary group-hover:text-primary transition-colors flex items-center gap-1.5">
                  Smart HR
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-muted">
                    ATS
                  </span>
                </div>
              </div>
            </Link>

            {/* Center: Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary border border-transparent"
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2.5">
              {/* Quick Search Bar Trigger */}
              <button
                onClick={() => setPaletteOpen(true)}
                className="hidden lg:flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-text-muted hover:border-slate-600 hover:text-text-secondary transition-colors"
                title="Search candidates (Ctrl+K)"
              >
                <Search size={14} />
                <span>Search candidates...</span>
                <kbd className="rounded bg-elevated border border-border px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
                  Ctrl+K
                </kbd>
              </button>

              {/* Upload Resume Shortcut Button */}
              <Link
                to="/upload"
                className="btn btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-1.5"
                title="Upload new resumes"
              >
                <Plus size={15} />
                <span className="hidden sm:inline">Upload</span>
              </Link>

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface hover:bg-elevated p-1.5 pr-2.5 text-xs font-semibold transition-colors"
                >
                  <div className="h-7 w-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden sm:inline-block max-w-[110px] truncate text-xs font-medium">
                    {user?.name}
                  </span>
                </button>

                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 z-50 w-52 rounded-2xl border border-border bg-surface p-1.5 shadow-2xl animate-fade-in">
                      <div className="px-3 py-2 border-b border-border/70 mb-1">
                        <p className="text-xs font-bold text-text-primary truncate">{user?.name}</p>
                        <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                        <span className="inline-block mt-1 badge badge-primary text-[9px] py-0 px-1.5">
                          {user?.role}
                        </span>
                      </div>
                      <Link
                        to="/settings"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors"
                      >
                        <Settings size={14} />
                        Account Settings
                      </Link>
                      <button
                        onClick={() => { setProfileDropdownOpen(false); logout(); }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Drawer Trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-text-primary hover:bg-elevated transition-colors"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface/95 px-4 pt-3 pb-5 space-y-1.5 animate-fade-in">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                    isActive ? "bg-primary/10 text-primary" : "text-text-secondary hover:bg-white/5"
                  }`
                }
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            ))}
            <div className="pt-2 border-t border-border mt-2">
              <Link
                to="/settings"
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-text-secondary hover:bg-white/5"
              >
                <Settings size={16} />
                <span>Account Settings</span>
              </Link>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 pb-20 md:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Bar */}
      <nav className="fixed bottom-3 left-4 right-4 z-40 flex items-center justify-around rounded-2xl border border-border/90 bg-surface/95 p-1 shadow-2xl backdrop-blur-xl md:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 p-2 rounded-xl text-[10px] font-semibold transition-all ${
                isActive ? "text-primary bg-primary/10" : "text-text-muted hover:text-text-primary"
              }`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
