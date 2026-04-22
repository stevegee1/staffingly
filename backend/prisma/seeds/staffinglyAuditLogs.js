const AUDIT_LOGS = [
  {
    id: "staff-audit-001",
    userEmail: "alex@staffingly.com",
    action: "UPDATE",
    entityType: "SecuritySettings",
    entityId: "sec-001",
    description: "Updated security settings",
    metadata: JSON.stringify({
      role: "staffingly_admin",
      module: "SecuritySettings",
      oldValue: "session_timeout=6",
      newValue: "session_timeout=8",
      ipAddress: "192.168.1.10",
      type: "warning",
      clientName: "Platform",
    }),
    createdAt: new Date("2026-03-01T09:02:11Z"),
  },
  {
    id: "staff-audit-002",
    userEmail: "jordan@staffingly.com",
    action: "EXPORT",
    entityType: "Payroll",
    entityId: "payroll-feb",
    description: "Exported payroll report",
    metadata: JSON.stringify({
      role: "finance_admin",
      module: "Payroll",
      ipAddress: "10.0.0.5",
      type: "info",
      clientName: "Platform",
    }),
    createdAt: new Date("2026-03-01T08:44:30Z"),
  },
  {
    id: "staff-audit-003",
    userEmail: "unknown@89.34.12.1",
    action: "FAILED_LOGIN",
    entityType: "Auth",
    entityId: null,
    description: "Failed login attempt detected",
    metadata: JSON.stringify({
      role: "unknown",
      module: "Auth",
      ipAddress: "89.34.12.1",
      type: "danger",
      clientName: "Platform",
    }),
    createdAt: new Date("2026-03-01T07:30:00Z"),
  },
  {
    id: "staff-audit-004",
    userEmail: "morgan@staffingly.com",
    action: "CREATE",
    entityType: "Clients",
    entityId: "client-248",
    description: "Onboarded new client: Sunrise Clinic",
    metadata: JSON.stringify({
      role: "staffingly_admin",
      module: "Clients",
      newValue: "Sunrise Clinic",
      ipAddress: "10.0.0.8",
      type: "success",
      clientName: "Sunrise Family Clinic",
    }),
    createdAt: new Date("2026-02-28T15:10:45Z"),
  },
  {
    id: "staff-audit-005",
    userEmail: "casey@staffingly.com",
    action: "APPROVE",
    entityType: "Cases",
    entityId: "PA-00411",
    description: "Approved PA #00411 for Medicaid",
    metadata: JSON.stringify({
      role: "staffingly_supervisor",
      module: "Cases",
      oldValue: "status=submitted",
      newValue: "status=approved",
      ipAddress: "10.0.0.22",
      type: "success",
      clientName: "Metro Mental Health Associates",
    }),
    createdAt: new Date("2026-02-28T11:05:20Z"),
  },
  {
    id: "staff-audit-006",
    userEmail: "dana@staffingly.com",
    action: "LOGIN_LOCKED",
    entityType: "Auth",
    entityId: null,
    description: "Account locked after repeated login failures",
    metadata: JSON.stringify({
      role: "staffingly_specialist",
      module: "Auth",
      oldValue: "failed_attempts=4",
      newValue: "account_locked=true",
      ipAddress: "10.0.0.44",
      type: "danger",
      clientName: "Platform",
    }),
    createdAt: new Date("2026-02-27T16:55:00Z"),
  },
];

export async function seedStaffinglyAuditLogs(prisma) {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [...new Set(AUDIT_LOGS.map((item) => item.userEmail).filter(Boolean))],
      },
    },
    select: { id: true, email: true },
  });

  const userIdByEmail = Object.fromEntries(users.map((user) => [user.email, user.id]));

  for (const log of AUDIT_LOGS) {
    await prisma.staffinglyAuditLog.upsert({
      where: { id: log.id },
      update: {
        ...log,
        userId: log.userEmail ? (userIdByEmail[log.userEmail] ?? null) : null,
      },
      create: {
        ...log,
        userId: log.userEmail ? (userIdByEmail[log.userEmail] ?? null) : null,
      },
    });
  }

  console.log(`✅ Seeded ${AUDIT_LOGS.length} staffingly audit logs`);
}
