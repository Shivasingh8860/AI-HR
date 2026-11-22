import { KeyRound, User, Lock, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const { data } = await api.patch("/auth/me", payload);
      setUser(data.user);
      setCurrentPassword("");
      setNewPassword("");
      toast({ message: "Profile updated successfully.", type: "success" });
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to update settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8 animate-fade-in">
      <header>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">Settings</h1>
        <p className="mt-2 text-text-secondary text-base">Manage your account profile and password.</p>
      </header>

      <form onSubmit={saveProfile} className="card bg-surface/50 border-border space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <User size={16} /> Profile Details
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Full Name</label>
              <input
                className="field !bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>
            <div className="p-3 rounded-xl bg-background border border-border text-xs text-text-muted">
              Email Address: <span className="text-text-primary font-medium">{user?.email}</span> (Locked)
            </div>
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
            <KeyRound size={16} /> Change Password
          </div>
          <p className="text-xs text-text-muted">Leave blank if you do not want to change your password.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-text-muted" size={15} />
                <input
                  className="field !bg-background !pl-9 !pr-9"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Current password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
                >
                  {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-text-muted" size={15} />
                <input
                  className="field !bg-background !pl-9 !pr-9"
                  type={showNew ? "text" : "password"}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        </section>

        <button className="btn btn-primary w-full h-11" disabled={saving}>
          {saving ? "Saving Changes..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
