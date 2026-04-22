import { useAuthUserQuery, useEntityListQuery } from "@/lib/query";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import WelcomeCard from "@/components/staffingly/WelcomeCard";
import WorkflowCards from "@/components/staffingly/WorkflowCards";
import MetricCards from "@/components/staffingly/MetricCards";
import RecentActivity from "@/components/staffingly/RecentActivity";
import TeamOverview from "@/components/staffingly/TeamOverview";
import FinanceDashboardCards from "@/components/staffingly/FinanceDashboardCards";
import SystemHealthCard from "@/components/staffingly/SystemHealthCard";
import ClientPortalSummary from "@/components/staffingly/ClientPortalSummary";
import { Search, ClipboardList, Send, CheckCircle, XCircle } from "lucide-react";

function isSameDay(value, target = new Date()) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toDateString() === target.toDateString();
}

function isSameMonth(value, target = new Date()) {
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMonth() === target.getMonth() &&
    date.getFullYear() === target.getFullYear()
  );
}

export default function Dashboard() {
  const { data: user, isLoading: loading } = useAuthUserQuery({
    select: (u) => ({ ...u, role: u.role === "admin" ? "super_admin" : u.role || "super_admin" }),
  });
  const { data: eligibilityHistory = [] } = useEntityListQuery("EligibilityHistory", { limit: 100 }, null);
  const { data: priorAuthCases = [] } = useEntityListQuery("PriorAuthCase", { page: 1, limit: 100 }, null);

  const eligibilityToday = eligibilityHistory.filter((item) => isSameDay(item.createdAt)).length;
  const priorAuthToday = priorAuthCases.filter((item) => isSameDay(item.createdAt)).length;
  const inProgressCases = priorAuthCases.filter(
    (item) => !["APPROVED", "DENIED", "CLOSED"].includes(item.status)
  ).length;
  const submittedToday = priorAuthCases.filter((item) => item.submittedAt && isSameDay(item.submittedAt)).length;
  const approvedThisMonth = priorAuthCases.filter(
    (item) => item.approvedAt && isSameMonth(item.approvedAt)
  ).length;
  const deniedThisMonth = priorAuthCases.filter(
    (item) => item.deniedAt && isSameMonth(item.deniedAt)
  ).length;

  if (loading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#eef3ff" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center animate-pulse"
            style={{ backgroundColor: "#293682" }}
          >
            <div className="w-6 h-6 bg-white/50 rounded" />
          </div>
          <p className="text-sm text-slate-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isFinance = user.role === "finance_admin";
  const isSuperAdmin = user.role === "super_admin";
  const isSupervisor = user.role === "staffingly_supervisor";
  const isClientUser = user.role === "client_user";

  return (
    <StaffinglyLayout user={user} currentPage="dashboard" title="Dashboard" breadcrumbs={undefined}>
      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Welcome */}
        <WelcomeCard user={user} />

        {/* Finance Admin — special layout */}
        {isFinance && (
          <>
            <FinanceDashboardCards />
            <RecentActivity />
          </>
        )}

        {/* Client User — simplified */}
        {isClientUser && <ClientPortalSummary user={user} />}

        {/* All other roles */}
        {!isFinance && !isClientUser && (
          <>
            {/* Workflow entry points */}
            <WorkflowCards eligibilityCount={eligibilityToday} priorAuthCount={priorAuthToday} />

            {/* Metrics row */}
            <MetricCards
              metrics={[
                {
                  label: "Eligibility Today",
                  value: eligibilityToday,
                  trend: eligibilityToday,
                  icon: Search,
                  color: "#0a7e87",
                  bg: "#f0fdfa",
                },
                {
                  label: "Prior Auths In Progress",
                  value: inProgressCases,
                  trend: inProgressCases,
                  icon: ClipboardList,
                  color: "#293682",
                  bg: "#eef3ff",
                },
                {
                  label: "Submitted Today",
                  value: submittedToday,
                  trend: submittedToday,
                  icon: Send,
                  color: "#f6b037",
                  bg: "#fffbeb",
                },
                {
                  label: "Approved This Month",
                  value: approvedThisMonth,
                  trend: approvedThisMonth,
                  icon: CheckCircle,
                  color: "#15803d",
                  bg: "#f0fdf4",
                },
                {
                  label: "Denied This Month",
                  value: deniedThisMonth,
                  trend: deniedThisMonth,
                  icon: XCircle,
                  color: "#dc2626",
                  bg: "#fef2f2",
                },
              ]}
            />

            {/* Supervisor team overview */}
            {isSupervisor && <TeamOverview />}

            {/* Super Admin — team + system health */}
            {isSuperAdmin && (
              <>
                <TeamOverview />
                <SystemHealthCard />
              </>
            )}

            {/* Recent Activity */}
            <RecentActivity />
          </>
        )}
      </div>
    </StaffinglyLayout>
  );
}
