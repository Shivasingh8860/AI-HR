import { Zap, ArrowRight, UserPlus, LogIn, Eye, EyeOff, Mail, Lock, Shield, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { GoogleLogin } from "@react-oauth/google";
import { api } from "../api/client.js";

export default function Login() {
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else if (mode === "register") {
        await register(form);
        toast({ message: "Account created successfully!", type: "success" });
      } else if (mode === "forgot") {
        await api.post("/auth/forgot-password", { email: form.email });
        toast({ message: "Password reset link sent to your email.", type: "success" });
        setMode("login");
        return;
      }
      navigate("/");
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      if (serverMsg && typeof serverMsg === "string") {
        setError(serverMsg);
      } else if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
        setError("Cannot connect to server. Please verify the backend API (port 5000) and MongoDB are running.");
      } else {
        setError("Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onGoogleSuccess(response) {
    try {
      setLoading(true);
      await googleLogin(response.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Google authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
        
        {/* Left Side: Branding */}
        <section className="hidden space-y-6 lg:block animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-glow-primary">
              <Zap size={24} className="text-background fill-background" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Smart HR</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-text-primary">
              Streamline hiring with <span className="text-primary">automated matching.</span>
            </h2>
            <p className="max-w-md text-base text-text-secondary leading-relaxed">
              Parse resumes instantly, score candidates against job criteria, and track your recruitment pipeline in one place.
            </p>
          </div>

          <div className="grid gap-3 pt-2">
            {[
              { icon: Shield, title: "Role-Based Access", desc: "Dedicated HR and Admin views with data isolation." },
              { icon: CheckCircle2, title: "Multi-Factor Scoring", desc: "Evaluates skills, experience, and educational background." }
            ].map((feature, i) => (
              <div key={i} className="flex gap-3.5 p-3.5 rounded-xl bg-surface border border-border">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{feature.title}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Side: Form */}
        <section className="animate-fade-in flex flex-col justify-center">
          <div className="card w-full max-w-md border-border shadow-2xl lg:mx-auto bg-surface/70 backdrop-blur-xl p-8">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-text-primary">
                {mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Reset Password"}
              </h2>
              <p className="mt-1 text-text-muted text-xs">
                {mode === "login" ? "Enter your email and password to access your dashboard." : mode === "register" ? "Register to start managing your hiring pipeline." : "Enter your email to receive a password reset link."}
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 text-xs text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Full Name</label>
                  <input 
                    required
                    className="field" 
                    placeholder="Jane Doe"
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 text-text-muted" size={15} />
                  <input 
                    required
                    type="email"
                    className="field !pl-10" 
                    placeholder="name@company.com"
                    value={form.email} 
                    onChange={(e) => setForm({ ...form, email: e.target.value })} 
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Password</label>
                    {mode === "login" ? (
                      <button type="button" onClick={() => setMode("forgot")} className="text-[10px] font-semibold text-primary hover:underline">Forgot password?</button>
                    ) : (
                      <span className="text-[10px] text-text-muted">Min 8 characters</span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 text-text-muted" size={15} />
                    <input 
                      required
                      type={showPassword ? "text" : "password"}
                      minLength={mode === "register" ? 8 : 1}
                      className="field !pl-10 !pr-10" 
                      placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
                      value={form.password} 
                      onChange={(e) => setForm({ ...form, password: e.target.value })} 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-text-muted hover:text-text-primary"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary w-full h-11 mt-2 text-sm font-semibold"
              >
                {loading ? "Please wait..." : (
                  <span className="flex items-center gap-2">
                    {mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Link"}
                    <ArrowRight size={16} />
                  </span>
                )}
              </button>
            </form>

            {mode === "login" && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <div className="mt-5 space-y-4">
                <div className="relative flex items-center justify-center">
                  <div className="w-full border-t border-border"></div>
                  <span className="absolute bg-surface px-3 text-[10px] font-semibold uppercase tracking-wider text-text-muted">Or continue with</span>
                </div>
                
                <div className="flex justify-center">
                  <GoogleLogin 
                    onSuccess={onGoogleSuccess} 
                    onError={() => setError("Google login failed")}
                    theme="filled_black"
                    shape="pill"
                    width="100%"
                  />
                </div>
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-border text-center">
              <button 
                type="button" 
                className="text-xs font-semibold text-text-secondary hover:text-primary transition-colors"
                onClick={() => {
                  setError("");
                  setMode(mode === "login" ? "register" : "login");
                }}
              >
                {mode === "login" ? (
                  <span className="flex items-center gap-1.5 justify-center"><UserPlus size={14} /> Don't have an account? Sign up</span>
                ) : (
                  <span className="flex items-center gap-1.5 justify-center"><LogIn size={14} /> Already registered? Sign in</span>
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
