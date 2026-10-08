import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  Laptop, 
  Smartphone, 
  Globe, 
  LogOut, 
  Trash2, 
  Check, 
  ShieldAlert, 
  UserPlus, 
  LogIn, 
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function Auth() {
  const { 
    token, 
    user, 
    sessions, 
    isLoading, 
    error, 
    signIn, 
    signUp, 
    signOut, 
    fetchSessions, 
    revokeSession, 
    revokeOtherSessions,
    clearError 
  } = useAuthStore();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors on tab toggle
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, [isSignUp, clearError]);

  // Load sessions if logged in
  useEffect(() => {
    if (token) {
      fetchSessions();
    }
  }, [token, fetchSessions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (isSignUp) {
      if (!username.trim()) return setLocalError("Username is required.");
      if (!email.trim()) return setLocalError("Email is required.");
      if (!password) return setLocalError("Password is required.");
      if (password.length < 6) return setLocalError("Password must be at least 6 characters.");
      if (password !== confirmPassword) return setLocalError("Passwords do not match.");

      const success = await signUp(username, email, password);
      if (success) {
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } else {
      if (!username.trim()) return setLocalError("Username or email is required.");
      if (!password) return setLocalError("Password is required.");

      const success = await signIn(username, password);
      if (success) {
        setUsername("");
        setPassword("");
      }
    }
  };

  // Helper to parse User-Agent
  const getDeviceIcon = (ua: string) => {
    const lower = ua.toLowerCase();
    if (lower.includes("mobi") || lower.includes("android") || lower.includes("iphone")) {
      return Smartphone;
    }
    return Laptop;
  };

  const parseUserAgent = (ua: string) => {
    const lower = ua.toLowerCase();
    if (lower.includes("chrome")) return "Chrome Browser";
    if (lower.includes("safari") && !lower.includes("chrome")) return "Safari Browser";
    if (lower.includes("firefox")) return "Firefox Browser";
    if (lower.includes("edge")) return "Edge Browser";
    if (lower.includes("android")) return "Android App";
    if (lower.includes("iphone")) return "iOS Client";
    return "Web Workstation";
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full relative w-full items-center justify-center py-4 sm:py-10">
      <AnimatePresence mode="wait">
        {!token ? (
          <motion.div 
            key="auth-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-md bg-zinc-900/50 backdrop-blur-2xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Soft decorative background radial glow */}
            <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-purple-500/10 rounded-full blur-[40px] pointer-events-none" />

            {/* Brand Title */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-4">
                <span className="text-white font-bold text-lg">X</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {isSignUp ? "Create Workspace" : "Access Station"}
              </h2>
              <p className="text-xs text-zinc-400 mt-1.5 text-center">
                {isSignUp ? "Register a free secure profile to save designs & models" : "Sign in with your secure credentials to authorize core API tasks"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username / Username-Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  {isSignUp ? "Username" : "Username or Email"}
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={isSignUp ? "e.g. xkira_artist" : "Enter username or email"}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-indigo-500/50 focus:bg-white/[0.04] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email (Signup only) */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. artist@xkira.ai"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-indigo-500/50 focus:bg-white/[0.04] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Password</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-indigo-500/50 focus:bg-white/[0.04] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Confirm Password (Signup only) */}
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.02] border border-white/5 focus:border-indigo-500/50 focus:bg-white/[0.04] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Error messages */}
              {(localError || error) && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{localError || error}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold tracking-wide active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isSignUp ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Create Free Workspace</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Access Secure Station</span>
                  </>
                )}
              </button>
            </form>

            {/* Switch Mode Footer */}
            <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center">
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-xs text-zinc-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
              >
                <span>{isSignUp ? "Already have a workstation?" : "New to XKIRA design platform?"}</span>
                <span className="font-semibold text-white group flex items-center gap-0.5 hover:text-indigo-400 transition-colors">
                  {isSignUp ? "Sign In" : "Sign Up"}
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </span>
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="profile-dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-2xl bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
          >
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[250px] h-[250px] bg-purple-500/5 rounded-full blur-[60px] pointer-events-none" />

            {/* Profile Overview Card */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 pb-6 border-b border-white/5">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                {/* Custom Initial Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/30 border border-white/10 flex items-center justify-center text-white text-2xl font-bold uppercase shadow-inner shadow-white/5">
                  {user?.username?.charAt(0) || <User className="w-7 h-7" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{user?.username}</h2>
                  <p className="text-xs text-zinc-400 flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{user?.email}</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Workstation ID: <span className="font-mono text-zinc-400">{user?.id}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl text-xs font-semibold tracking-wide transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>Disconnect</span>
              </button>
            </div>

            {/* Sessions Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Active Device Workstations</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">Manage and revoke connected device sessions for security protection</p>
                </div>
                <button
                  onClick={revokeOtherSessions}
                  disabled={sessions.length <= 1}
                  className="px-3 py-1.5 text-[10px] sm:text-xs font-semibold bg-white/5 hover:bg-indigo-600/15 border border-white/5 hover:border-indigo-500/30 text-indigo-400 disabled:opacity-40 rounded-lg transition-all"
                >
                  Revoke Other Devices
                </button>
              </div>

              {/* Sessions Grid */}
              <div className="grid grid-cols-1 gap-3 max-h-[280px] overflow-y-auto pr-1">
                {sessions.map((session) => {
                  const Icon = getDeviceIcon(session.userAgent);
                  const isCurrent = session.isCurrent;

                  return (
                    <div 
                      key={session.id}
                      className={`flex items-center justify-between p-4 bg-white/[0.01] border rounded-2xl transition-all ${
                        isCurrent ? "border-indigo-500/30 bg-indigo-500/[0.02]" : "border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 truncate">
                        <div className={`p-2.5 rounded-xl ${
                          isCurrent ? "bg-indigo-500/10 text-indigo-400" : "bg-white/5 text-zinc-400"
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="truncate text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-zinc-200">
                              {parseUserAgent(session.userAgent)}
                            </span>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-[9px] font-bold text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                                Current Station
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 flex items-center gap-2.5 mt-1 font-mono">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3 text-zinc-600" />
                              {session.ip}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-600" />
                              Active {getRelativeTime(session.lastActive)}
                            </span>
                          </p>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl active:scale-95 transition-all"
                          title="Revoke device access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
