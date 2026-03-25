import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import StaffinglyLayout from "@/components/staffingly/StaffinglyLayout";
import { Plus, Search, Building2, Edit2, X, CheckCircle } from "lucide-react";

const DUMMY_CLIENTS = [
  {
    id: "1",
    practice_name: "Sunrise Family Clinic",
    contact_name: "Dr. Maria Lopez",
    contact_email: "maria@sunrise.com",
    npi: "1234567890",
    emr_system: "Epic",
    active: true,
    assigned_specialists: ["dana@staffingly.com"],
    onboarded_at: "2025-06-10",
  },
  {
    id: "2",
    practice_name: "Lakeview Orthopedics",
    contact_name: "Dr. James Park",
    contact_email: "james@lakeview.com",
    npi: "0987654321",
    emr_system: "Cerner",
    active: true,
    assigned_specialists: ["drew@staffingly.com"],
    onboarded_at: "2025-08-22",
  },
  {
    id: "3",
    practice_name: "Metro Mental Health Associates",
    contact_name: "Dr. Aisha Rahman",
    contact_email: "aisha@metro-mh.com",
    npi: "1122334455",
    emr_system: "athenahealth",
    active: false,
    assigned_specialists: [],
    onboarded_at: "2025-03-01",
  },
];

function ClientDrawer({ client, onClose }) {
  const [form, setForm] = useState(
    client || {
      practice_name: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      npi: "",
      tax_id: "",
      emr_system: "",
      cloud_storage_type: "none",
      active: true,
      subdomain: "",
    }
  );

  const F = ({ label, field, type = "text", options = undefined }) => (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
        {label}
      </label>
      {options ? (
        <select
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        >
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          value={form[field] || ""}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          type={type}
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {client ? "Edit Client" : "Onboard New Client"}
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <F label="Practice Name *" field="practice_name" />
          <F label="Subdomain" field="subdomain" />
          <F label="Contact Name" field="contact_name" />
          <F label="Contact Email" field="contact_email" type="email" />
          <F label="Contact Phone" field="contact_phone" />
          <F label="NPI" field="npi" />
          <F label="Tax ID" field="tax_id" />
          <F label="Address" field="address" />
          <F
            label="EMR System"
            field="emr_system"
            options={["Epic", "Cerner", "athenahealth", "eClinicalWorks", "DrChrono", "Other"]}
          />
          <F
            label="Cloud Storage"
            field="cloud_storage_type"
            options={["none", "google_drive", "onedrive", "dropbox", "s3"]}
          />
          <div className="flex items-center gap-3 col-span-full">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-slate-700 font-medium">Client Active</label>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#0a7e87" }}
          >
            {client ? "Update Client" : "Onboard Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SAClients() {
  const [user, setUser] = useState(null);
  const [clients] = useState(DUMMY_CLIENTS);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [drawer, setDrawer] = useState(null);

  useEffect(() => {
    api.auth
      .me()
      .then((u) => setUser({ ...u, role: u.role || "super_admin" }))
      .catch(() => api.auth.redirectToLogin());
  }, []);

  const filtered = clients.filter((c) => {
    const matchSearch = `${c.practice_name} ${c.contact_name} ${c.npi}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchActive =
      filterActive === "all" || (filterActive === "active" ? c.active : !c.active);
    return matchSearch && matchActive;
  });

  return (
    <StaffinglyLayout
      user={user}
      currentPage="sa-clients"
      title="Client Registry"
      breadcrumbs={["Admin", "Clients"]}
    >
      {drawer !== null && (
        <ClientDrawer client={drawer === "add" ? null : drawer} onClose={() => setDrawer(null)} />
      )}

      <div className="space-y-5 max-w-[1400px] mx-auto">
        {/* Controls */}
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none w-52"
              />
            </div>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mr-3">
            <span className="font-bold text-slate-800">
              {clients.filter((c) => c.active).length}
            </span>{" "}
            active /<span className="font-bold text-slate-800">{clients.length}</span> total
          </div>
          <button
            onClick={() => setDrawer("add")}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold"
            style={{ backgroundColor: "#0a7e87" }}
          >
            <Plus className="w-4 h-4" /> Onboard Client
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: "#eef3ff" }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: "#293682" }} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{c.practice_name}</p>
                    <p className="text-xs text-slate-400">{c.contact_name}</p>
                  </div>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {c.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-500">
                <p>
                  NPI: <span className="font-mono text-slate-700">{c.npi}</span>
                </p>
                <p>
                  EMR: <span className="text-slate-700">{c.emr_system}</span>
                </p>
                <p>
                  Onboarded: <span className="text-slate-700">{c.onboarded_at}</span>
                </p>
                <p>
                  Specialists:{" "}
                  <span className="text-slate-700">
                    {c.assigned_specialists.length > 0
                      ? c.assigned_specialists.length
                      : "None assigned"}
                  </span>
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDrawer(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                  style={{ backgroundColor: "#293682" }}
                >
                  <CheckCircle className="w-3 h-3" /> View Cases
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaffinglyLayout>
  );
}
