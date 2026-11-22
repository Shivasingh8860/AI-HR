import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client.js";
import { TrendingUp, Users, Star, Target, CheckCircle2 } from "lucide-react";

export default function Analytics() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get("/analytics").then(({ data }) => setAnalytics(data));
  }, []);

  if (!analytics) return <AnalyticsSkeleton />;

  const distribution = Object.entries(analytics.distribution || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));
  const COLORS = ["#10b981", "#38bdf8", "#8b5cf6", "#f59e0b", "#f43f5e"];

  return (
    <div className="space-y-8 animate-fade-in">
      <header>
        <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
          <TrendingUp size={15} /> Recruitment Metrics
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">Analytics</h1>
        <p className="mt-2 text-text-secondary text-base">
          Overview of talent pool distribution, top skills, and average match rates.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard icon={Users} label="Total Candidates" value={analytics.total} sub="In active database" color="text-primary" />
        <MetricCard icon={Star} label="Shortlisted" value={analytics.shortlisted} sub="Marked for interview" color="text-secondary" />
        <MetricCard icon={Target} label="Average Match" value={`${analytics.averageScore}%`} sub="Overall fit score" color="text-accent" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartContainer title="Top Candidate Skills" sub="Most frequent skills across uploaded resumes">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.commonSkills} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e222d" vertical={false} />
              <XAxis dataKey="skill" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e222d", borderRadius: "8px", fontSize: "12px" }}
                itemStyle={{ color: "#f8fafc" }}
              />
              <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Candidate Experience Breakdown" sub="Experience level segmentation across applicants">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie 
                data={distribution} 
                dataKey="value" 
                nameKey="name" 
                innerRadius={70} 
                outerRadius={95} 
                paddingAngle={4}
                stroke="none"
              >
                {distribution.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: "#0f1117", borderColor: "#1e222d", borderRadius: "8px", fontSize: "12px" }}
                itemStyle={{ color: "#f8fafc" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {distribution.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-text-muted">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </ChartContainer>
      </div>

      <section className="card bg-surface flex items-center justify-between p-6">
        <div>
          <h2 className="text-base font-bold text-text-primary">Pipeline Health</h2>
          <p className="text-xs text-text-secondary mt-0.5">Automated scoring and text extraction are functioning normally.</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <CheckCircle2 size={20} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white/5 border border-white/10 ${color}`}>
          <Icon size={18} />
        </div>
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Metrics</div>
      </div>
      <div className="text-xs font-medium text-text-secondary">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-text-primary tracking-tight">{value}</div>
      <div className="mt-1.5 text-xs text-text-muted">{sub}</div>
    </div>
  );
}

function ChartContainer({ title, sub, children }) {
  return (
    <section className="card">
      <div className="mb-6">
        <h2 className="text-base font-bold text-text-primary tracking-tight">{title}</h2>
        <p className="text-xs text-text-muted mt-0.5">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-16 w-1/3 bg-elevated rounded-xl" />
      <div className="grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-elevated rounded-xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 bg-elevated rounded-xl" />
        <div className="h-80 bg-elevated rounded-xl" />
      </div>
    </div>
  );
}
