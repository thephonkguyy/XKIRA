import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Video, 
  Wand2, 
  Wrench, 
  Cpu, 
  Settings, 
  Home,
  Clock,
  WifiOff,
  Menu,
  X,
  Sparkles,
  User
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import JobCenter from "./JobCenter";

const NAV_ITEMS = [
  { name: "Home", path: "/", icon: Home, shortName: "Home" },
  { name: "Chat", path: "/chat", icon: MessageSquare, shortName: "Chat" },
  { name: "Image Studio", path: "/image-studio", icon: ImageIcon, shortName: "Image" },
  { name: "Video Studio", path: "/video-studio", icon: Video, shortName: "Video" },
  { name: "Tools", path: "/tools", icon: Wrench, shortName: "Tools" },
  { name: "Prompt Lab", path: "/prompt-lab", icon: Wand2, shortName: "Prompt" },
  { name: "Model Hub", path: "/model-hub", icon: Cpu, shortName: "Models" },
  { name: "History", path: "/history", icon: Clock, shortName: "History" },
];

const MOBILE_PRIMARY_TABS = [
  { name: "Home", path: "/", icon: Home },
  { name: "Chat", path: "/chat", icon: MessageSquare },
  { name: "Image", path: "/image-studio", icon: ImageIcon },
  { name: "Video", path: "/video-studio", icon: Video },
  { name: "Tools", path: "/tools", icon: Wrench },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(state => state.user);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getCurrentPageTitle = () => {
    const item = NAV_ITEMS.find(n => n.path === location.pathname);
    if (item) return item.name;
    if (location.pathname === "/settings") return "Settings";
    return "XKIRA";
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-zinc-950 text-zinc-50 overflow-hidden font-sans selection:bg-zinc-800">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-indigo-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] bg-purple-500/10 rounded-full blur-[120px] sm:blur-[150px] pointer-events-none" />

      {/* Mobile Top Header (< md) */}
      <header className="md:hidden flex-shrink-0 z-30 h-14 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
            <span className="text-white font-bold text-xs">X</span>
          </div>
          <span className="font-bold text-sm tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
            XKIRA
          </span>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-xs font-medium text-zinc-300 truncate max-w-[140px]">
            {getCurrentPageTitle()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white rounded-xl bg-white/5 border border-white/5 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/75 backdrop-blur-md flex flex-col justify-end">
          <div 
            className="absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative bg-zinc-900 border-t border-white/10 rounded-t-3xl p-5 pb-safe max-h-[85dvh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mb-1" />
            
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">All XKIRA Workspaces</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="text-zinc-400 hover:text-white text-xs px-3 py-1.5 bg-white/5 rounded-xl min-h-[36px]"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pb-20">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-xs font-medium min-h-[48px]",
                      isActive
                        ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm"
                        : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white"
                    )
                  }
                >
                  <item.icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              ))}

              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 p-3.5 rounded-2xl border transition-all text-xs font-medium col-span-2 min-h-[48px]",
                    isActive
                      ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm"
                      : "bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/5 hover:text-white"
                  )
                }
              >
                <Settings className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Settings & Preferences</span>
              </NavLink>
            </div>
          </div>
        </div>
      )}

      {/* Desktop / Tablet Sidebar (Hidden on mobile) */}
      <aside className="hidden md:flex relative z-20 w-18 lg:w-64 flex-shrink-0 flex-col border-r border-white/5 bg-black/30 backdrop-blur-3xl transition-all duration-300">
        <div className="h-18 lg:h-20 flex items-center justify-center lg:justify-start lg:px-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.4)] cursor-pointer" onClick={() => navigate("/")}>
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <span className="hidden lg:block ml-3 font-bold text-lg tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400 cursor-pointer" onClick={() => navigate("/")}>
            XKIRA
          </span>
        </div>

        <nav className="flex-1 py-4 lg:py-6 px-2.5 lg:px-4 flex flex-col gap-1.5 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-4 py-3 rounded-2xl transition-all duration-200 group outline-none",
                  isActive
                    ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5 font-semibold"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                )
              }
              title={item.name}
            >
              <item.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-105 transition-transform duration-200" />
              <span className="hidden lg:block text-xs font-medium tracking-wide">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 lg:p-4 border-t border-white/5 space-y-1">
          <NavLink 
            to="/auth"
            className={({ isActive }) =>
              cn(
                "w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-4 py-3 rounded-2xl transition-all duration-200 group outline-none",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5 font-semibold"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )
            }
            title={user ? "Profile" : "Sign In"}
          >
            <User className="w-5 h-5 flex-shrink-0 group-hover:scale-105 transition-transform duration-200 text-indigo-400" />
            <span className="hidden lg:block text-xs font-medium truncate">
              {user ? user.username : "Sign In"}
            </span>
          </NavLink>

          <NavLink 
            to="/settings"
            className={({ isActive }) =>
              cn(
                "w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-4 py-3 rounded-2xl transition-all duration-200 group outline-none",
                isActive
                  ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/5 font-semibold"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              )
            }
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0 group-hover:rotate-90 transition-transform duration-300" />
            <span className="hidden lg:block text-xs font-medium">Settings</span>
          </NavLink>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        {isOffline && (
          <div className="flex-shrink-0 z-50 bg-red-500/90 text-white text-xs font-medium py-1.5 px-4 flex items-center justify-center gap-2 backdrop-blur-md">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You are offline. AI generation features will resume once connected.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full">
          <div className="w-full max-w-7xl mx-auto p-3.5 sm:p-5 md:p-6 lg:p-8 pb-28 md:pb-10 min-h-full flex flex-col">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (< md) with Safe Area handling */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-2xl border-t border-white/10 px-2 py-1 pb-safe flex items-center justify-around shadow-2xl">
        {MOBILE_PRIMARY_TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-w-[56px] min-h-[44px] transition-all touch-manipulation",
                isActive
                  ? "text-indigo-400 font-semibold"
                  : "text-zinc-500 hover:text-zinc-300"
              )
            }
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-medium">{tab.name}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-w-[56px] min-h-[44px] transition-all touch-manipulation",
            mobileMenuOpen ? "text-indigo-400 font-semibold" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">More</span>
        </button>
      </nav>

      {/* Persistent Global Job Center Indicator & Drawer */}
      <JobCenter />
    </div>
  );
}

