import { 
  Trash2, Users, Briefcase, FileText, Star, Shield, Activity, Plus, Edit, 
  UserCheck, UserX, Key, ArrowRightLeft, Eye, X, Check, Search, Filter 
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [hrStats, setHrStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [reassignSource, setReassignSource] = useState(null);
  const [activityUser, setActivityUser] = useState(null);
  const [activityData, setActivityData] = useState({ candidates: [], jobs: [] });
  const [loadingActivity, setLoadingActivity] = useState(false);

  function loadStats() {
    setLoading(true);
    api.get("/admin/hr-stats")
      .then(({ data }) => setHrStats(data.hrStats || []))
      .catch(() => toast({ message: "Failed to load HR recruiter accounts.", type: "error" }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleToggleStatus(user) {
    if (user._id === currentUser?.id) {
      toast({ message: "You cannot change the status of your own account.", type: "error" });
      return;
    }
    try {
      const { data } = await api.patch(`/admin/hr/${user._id}/toggle-status`);
      toast({ message: data.message, type: "success" });
      setHrStats((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: data.isActive } : u))
      );
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to update user status.", type: "error" });
    }
  }

  async function handleDelete(user) {
    if (user._id === currentUser?.id) {
      toast({ message: "You cannot delete your own account.", type: "error" });
      return;
    }

    const reassign = window.confirm(
      `Delete "${user.name}"?\n\nClick OK to reassign all their candidates and jobs to you (Admin).\nClick Cancel to abort.`
    );
    if (!reassign) return;

    try {
      const { data } = await api.delete(`/admin/hr/${user._id}`, { data: { reassignToAdmin: true } });
      toast({ message: data.message, type: "success" });
      loadStats();
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to delete user.", type: "error" });
    }
  }

  async function openActivity(user) {
    setActivityUser(user);
    setLoadingActivity(true);
    try {
      const { data } = await api.get(`/admin/hr/${user._id}/activity`);
      setActivityData({ candidates: data.candidates || [], jobs: data.jobs || [] });
    } catch {
      toast({ message: "Failed to load recruiter activity.", type: "error" });
    } finally {
      setLoadingActivity(false);
    }
  }

  const filteredUsers = hrStats.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.isActive !== false) ||
      (statusFilter === "suspended" && u.isActive === false);
    return matchesSearch && matchesStatus;
  });

  const totalCandidates = hrStats.reduce((sum, u) => sum + (u.candidateCount || 0), 0);
  const totalJobs = hrStats.reduce((sum, u) => sum + (u.jobCount || 0), 0);
  const activeHRCount = hrStats.filter((u) => u.isActive !== false).length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
            <Shield size={15} /> Administration & HR Control
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Recruiter Management
          </h1>
          <p className="mt-1 text-text-secondary text-sm">
            Control recruiter access, monitor pipeline activity, and manage permissions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary self-start sm:self-auto flex items-center gap-2"
        >
          <Plus size={18} /> Add Recruiter
        </button>
      </header>

      {/* Aggregate Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Recruiters"
          value={hrStats.length}
          sub={`${activeHRCount} active account(s)`}
          color="text-primary"
        />
        <StatCard
          icon={FileText}
          label="Total Candidates"
          value={totalCandidates}
          sub="Across all recruiters"
          color="text-secondary"
        />
        <StatCard
          icon={Briefcase}
          label="Total Job Posts"
          value={totalJobs}
          sub="Active & closed roles"
          color="text-accent"
        />
        <StatCard
          icon={Activity}
          label="System Health"
          value="100%"
          sub="All services operational"
          color="text-primary"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface/50 p-3.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-2.5 text-text-muted" />
          <input
            className="field !bg-background !pl-9 text-xs"
            placeholder="Search recruiters by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-text-muted" />
          <select
            className="field !bg-background !w-36 py-2 text-xs cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Recruiter List Cards */}
      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-elevated rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <Users size={32} className="mx-auto text-text-muted mb-3" />
          <h3 className="text-base font-bold text-text-primary">No recruiters found</h3>
          <p className="text-xs text-text-muted mt-1">Try adjusting your search or add a new recruiter.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((hr) => {
            const isSelf = hr._id === currentUser?.id;
            const isActive = hr.isActive !== false;

            return (
              <div
                key={hr._id}
                className={`card flex flex-col justify-between border transition-all ${
                  isActive ? "border-border hover:border-primary/30" : "border-rose-500/20 bg-rose-500/[0.02]"
                }`}
              >
                <div>
                  {/* Top user header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                        {hr.name?.[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-text-primary truncate max-w-[140px]">
                            {hr.name}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate max-w-[170px]">{hr.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge ${hr.role === "Admin" ? "badge-accent" : "badge-secondary"} text-[10px]`}>
                        {hr.role}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                          isActive ? "text-primary" : "text-rose-400"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-primary" : "bg-rose-400"}`} />
                        {isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                  </div>

                  {/* Activity Stats Box */}
                  <div className="grid grid-cols-3 gap-2 my-4 p-2.5 rounded-xl bg-background border border-border">
                    <div className="text-center">
                      <div className="text-base font-extrabold text-text-primary">{hr.candidateCount || 0}</div>
                      <div className="text-[10px] text-text-muted uppercase font-medium">Candidates</div>
                    </div>
                    <div className="text-center border-x border-border">
                      <div className="text-base font-extrabold text-text-primary">{hr.jobCount || 0}</div>
                      <div className="text-[10px] text-text-muted uppercase font-medium">Jobs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base font-extrabold text-amber">{hr.shortlistedCount || 0}</div>
                      <div className="text-[10px] text-text-muted uppercase font-medium">Shortlisted</div>
                    </div>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openActivity(hr)}
                      className="btn btn-secondary text-xs py-1.5 justify-center flex items-center gap-1.5"
                      title="Inspect candidates and jobs uploaded by this user"
                    >
                      <Eye size={13} /> View Data
                    </button>
                    <button
                      onClick={() => setEditUser(hr)}
                      className="btn btn-secondary text-xs py-1.5 justify-center flex items-center gap-1.5"
                      title="Edit recruiter profile, role, or password"
                    >
                      <Edit size={13} /> Edit User
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isSelf}
                      onClick={() => handleToggleStatus(hr)}
                      className={`btn text-xs py-1.5 justify-center flex items-center gap-1.5 ${
                        isActive
                          ? "btn-secondary text-amber hover:bg-amber/10 border-amber/20"
                          : "btn-secondary text-primary hover:bg-primary/10 border-primary/20"
                      }`}
                      title={isActive ? "Suspend recruiter login" : "Activate recruiter account"}
                    >
                      {isActive ? (
                        <>
                          <UserX size={13} /> Suspend
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} /> Activate
                        </>
                      )}
                    </button>
                    <button
                      disabled={isSelf}
                      onClick={() => setReassignSource(hr)}
                      className="btn btn-secondary text-xs py-1.5 justify-center flex items-center gap-1.5"
                      title="Transfer candidate and job records to another HR"
                    >
                      <ArrowRightLeft size={13} /> Reassign
                    </button>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => handleDelete(hr)}
                      className="btn btn-secondary text-xs py-1.5 w-full justify-center text-rose-400 hover:bg-rose-500/10 border-rose-500/20 flex items-center gap-1.5"
                    >
                      <Trash2 size={13} /> Delete Account
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Add New Recruiter */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadStats();
          }}
        />
      )}

      {/* Modal 2: Edit Recruiter */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null);
            loadStats();
          }}
        />
      )}

      {/* Modal 3: Reassign Data */}
      {reassignSource && (
        <ReassignDataModal
          sourceUser={reassignSource}
          allUsers={hrStats}
          onClose={() => setReassignSource(null)}
          onSuccess={() => {
            setReassignSource(null);
            loadStats();
          }}
        />
      )}

      {/* Modal 4: View Recruiter Activity */}
      {activityUser && (
        <ActivityModal
          user={activityUser}
          data={activityData}
          loading={loadingActivity}
          onClose={() => setActivityUser(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-muted">{label}</span>
        <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${color}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-black text-text-primary tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-text-muted">{sub}</div>
    </div>
  );
}

// Modal: Add User
function AddUserModal({ onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "HR" });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/hr", form);
      toast({ message: data.message, type: "success" });
      onSuccess();
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to create recruiter.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md bg-surface border-border shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Add New Recruiter</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Full Name</label>
            <input
              required
              className="field"
              placeholder="e.g. Sarah Jenkins"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Email Address</label>
            <input
              required
              type="email"
              className="field"
              placeholder="sarah@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Temporary Password</label>
            <input
              required
              type="password"
              minLength={8}
              className="field"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Account Role</label>
            <select
              className="field cursor-pointer"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="HR">HR Recruiter</option>
              <option value="Admin">Administrator</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal: Edit User
function EditUserModal({ user, onClose, onSuccess }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    role: user.role || "HR",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role
      };
      if (form.password) payload.password = form.password;

      const { data } = await api.patch(`/admin/hr/${user._id}`, payload);
      toast({ message: data.message, type: "success" });
      onSuccess();
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to update recruiter.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md bg-surface border-border shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Edit Account: {user.name}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Full Name</label>
            <input
              required
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Email Address</label>
            <input
              required
              type="email"
              className="field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Account Role</label>
            <select
              className="field cursor-pointer"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="HR">HR Recruiter</option>
              <option value="Admin">Administrator</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Reset Password (optional)
            </label>
            <input
              type="password"
              minLength={8}
              className="field"
              placeholder="Leave blank to keep current"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary flex-1">
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal: Reassign Data
function ReassignDataModal({ sourceUser, allUsers, onClose, onSuccess }) {
  const toast = useToast();
  const [targetUserId, setTargetUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eligibleTargets = allUsers.filter((u) => u._id !== sourceUser._id);

  async function submit(e) {
    e.preventDefault();
    if (!targetUserId) return;
    setSubmitting(true);
    try {
      const { data } = await api.post("/admin/hr/reassign", {
        fromUserId: sourceUser._id,
        toUserId: targetUserId
      });
      toast({ message: data.message, type: "success" });
      onSuccess();
    } catch (err) {
      toast({ message: err.response?.data?.message || "Failed to reassign data.", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md bg-surface border-border shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h2 className="text-lg font-bold text-text-primary">Reassign Recruiter Data</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 pt-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            Transfer all <strong>{sourceUser.candidateCount || 0} candidate(s)</strong> and{" "}
            <strong>{sourceUser.jobCount || 0} job posting(s)</strong> currently owned by{" "}
            <span className="text-primary font-semibold">{sourceUser.name}</span> to another team member.
          </p>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Target Recruiter</label>
            <select
              required
              className="field cursor-pointer"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value="">Select recipient...</option>
              {eligibleTargets.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role} - {u.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting || !targetUserId} className="btn btn-primary flex-1">
              {submitting ? "Reassigning..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal: View Activity
function ActivityModal({ user, data, loading, onClose }) {
  const [tab, setTab] = useState("candidates");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-2xl bg-surface border-border shadow-2xl animate-fade-in max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Activity: {user.name}</h2>
            <p className="text-xs text-text-muted">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 pt-3 border-b border-border pb-2">
          <button
            onClick={() => setTab("candidates")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              tab === "candidates" ? "bg-primary text-background" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Candidates ({data.candidates.length})
          </button>
          <button
            onClick={() => setTab("jobs")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              tab === "jobs" ? "bg-primary text-background" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Job Postings ({data.jobs.length})
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-text-muted animate-pulse">Loading activity...</div>
          ) : tab === "candidates" ? (
            data.candidates.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">No candidates uploaded by this recruiter.</div>
            ) : (
              data.candidates.map((c) => (
                <div key={c._id} className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border">
                  <div>
                    <Link
                      to={`/candidates/${c._id}`}
                      className="text-xs font-bold text-text-primary hover:text-primary transition-colors"
                    >
                      {c.name}
                    </Link>
                    <div className="text-[10px] text-text-muted">{c.email || "No email"} · {c.experienceYears || 0}y exp</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-muted text-[10px]">{c.stage || "new"}</span>
                    {c.shortlisted && <Star size={12} className="text-amber fill-amber" />}
                  </div>
                </div>
              ))
            )
          ) : data.jobs.length === 0 ? (
            <div className="py-12 text-center text-xs text-text-muted">No job postings created by this recruiter.</div>
          ) : (
            data.jobs.map((j) => (
              <div key={j._id} className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border">
                <div>
                  <div className="text-xs font-bold text-text-primary">{j.title}</div>
                  <div className="text-[10px] text-text-muted">{j.department} · {j.minExperienceYears}+ yrs</div>
                </div>
                <span className={`badge ${j.status === "open" ? "badge-primary" : "badge-muted"} text-[10px]`}>
                  {j.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn btn-secondary text-xs py-1.5 px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
