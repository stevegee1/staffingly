import { useState, useEffect } from "react";
import { api } from "@/api";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

const SERVICE_CATEGORY_COLORS = {
  Preventive: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  Specialist: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Mental Health": { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  "Physical Therapy": { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  Diagnostic: { bg: "#f0fdfa", text: "#0f766e", border: "#99f6e4" },
  "Chronic Care": { bg: "#fefce8", text: "#a16207", border: "#fef08a" },
  Surgical: { bg: "#fdf2f8", text: "#9d174d", border: "#fbcfe8" },
  Other: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
};

function ServiceCard({ service, isAI }) {
  const colors = SERVICE_CATEGORY_COLORS[service.category] || SERVICE_CATEGORY_COLORS["Other"];
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isAI ? (
          <Sparkles className="w-4 h-4" style={{ color: colors.text }} />
        ) : (
          <CheckCircle2 className="w-4 h-4" style={{ color: colors.text }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm" style={{ color: colors.text }}>
            {service.name}
          </p>
          <span
            className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: colors.border, color: colors.text }}
          >
            {service.category}
          </span>
          {isAI && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
              AI Suggested
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{service.description}</p>
        {service.copay_note && (
          <p className="text-xs font-semibold mt-1" style={{ color: colors.text }}>
            💲 {service.copay_note}
          </p>
        )}
        {service.legal_note && (
          <p className="text-xs text-amber-700 mt-1 flex items-start gap-1">
            <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {service.legal_note}
          </p>
        )}
      </div>
    </div>
  );
}

export default function BenefitsPanel({ result, payer, serviceType, planType }) {
  const [loading, setLoading] = useState(false);
  const [aiServices, setAiServices] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("covered");

  // Parse covered services from Availity benefits_raw or derive from result data
  const coveredServices = [];

  if (result.copay_pcp !== null) {
    coveredServices.push({
      name: "Primary Care Visit",
      category: "Specialist",
      description: `In-network PCP visit. Patient copay applies.`,
      copay_note: result.copay_pcp != null ? `$${result.copay_pcp} copay` : null,
    });
  }
  if (result.copay_specialist !== null) {
    coveredServices.push({
      name: "Specialist Visit",
      category: "Specialist",
      description: "Covered specialist consultation.",
      copay_note: result.copay_specialist != null ? `$${result.copay_specialist} copay` : null,
    });
  }
  if (result.copay_er !== null) {
    coveredServices.push({
      name: "Emergency Room",
      category: "Other",
      description: "Emergency services covered.",
      copay_note: result.copay_er != null ? `$${result.copay_er} copay` : null,
    });
  }
  if (result.mental_health_parity) {
    coveredServices.push({
      name: "Mental Health Services",
      category: "Mental Health",
      description: "Mental health parity applies — same benefits as medical/surgical.",
      copay_note: "Same as medical plan",
    });
  }
  if (result.prior_auth_required === false) {
    coveredServices.push({
      name: "Services Without Prior Auth",
      category: "Preventive",
      description: "No prior authorization required for most services under this plan.",
    });
  }
  if (result.deductible_individual_total === 0) {
    coveredServices.push({
      name: "Preventive Care (No Deductible)",
      category: "Preventive",
      description: "Preventive services are covered at $0 deductible under this plan.",
    });
  }

  useEffect(() => {
    if (!payer) return;
    fetchAiSuggestions();
  }, [payer, serviceType, planType]);

  const fetchAiSuggestions = async () => {
    setLoading(true);
    const prompt = `You are a healthcare revenue cycle expert. A patient with the following insurance coverage just had eligibility verified:

Payer: ${payer}
Plan Type: ${planType || "PPO"}
Service Type Requested: ${serviceType}
Coverage Status: ${result.coverage_status}
Mental Health Parity: ${result.mental_health_parity ? "Yes" : "No/Unknown"}
Prior Auth Required: ${result.prior_auth_required === false ? "No" : result.prior_auth_required ? "Yes" : "Unknown"}

Based on this plan, suggest additional billable services the provider could legally offer this patient in the same visit or as follow-up care. 
These should be clinically appropriate and compliant with the plan's coverage.
For each service, note any compliance/legal considerations (e.g. "requires referral", "check medical necessity", "prior auth may be needed for >X visits").

Return 5-7 service suggestions. Be specific and practical for a healthcare provider.`;

    const res = await api.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: {
                  type: "string",
                  enum: [
                    "Preventive",
                    "Specialist",
                    "Mental Health",
                    "Physical Therapy",
                    "Diagnostic",
                    "Chronic Care",
                    "Surgical",
                    "Other",
                  ],
                },
                description: { type: "string" },
                copay_note: { type: "string" },
                legal_note: { type: "string" },
              },
            },
          },
        },
      },
    });

    setAiServices(res?.suggestions || []);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#f5f3ff" }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: "#6d28d9" }} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-slate-800 text-sm">
              Covered Benefits & Service Opportunities
            </h3>
            <p className="text-xs text-slate-400">
              What this plan covers + AI-suggested additional services for the provider
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="p-5 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab("covered")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "covered" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Covered Services ({coveredServices.length})
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "ai" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
            >
              <Sparkles className="w-3.5 h-3.5" /> AI Suggestions{" "}
              {aiServices ? `(${aiServices.length})` : ""}
            </button>
          </div>

          {/* Covered Services Tab */}
          {activeTab === "covered" && (
            <div className="space-y-2">
              {coveredServices.length > 0 ? (
                coveredServices.map((s, i) => <ServiceCard key={i} service={s} isAI={false} />)
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No benefit detail available from payer response
                </div>
              )}
            </div>
          )}

          {/* AI Suggestions Tab */}
          {activeTab === "ai" && (
            <div className="space-y-2">
              {loading ? (
                <div className="py-10 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#6d28d9" }} />
                  <p className="text-sm text-slate-500">
                    AI is analyzing coverage to suggest additional services…
                  </p>
                </div>
              ) : aiServices?.length > 0 ? (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-xs text-amber-800 mb-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      These are AI-generated suggestions for clinical consideration only. Always
                      verify medical necessity, payer policy, and applicable regulations before
                      billing.
                    </span>
                  </div>
                  {aiServices.map((s, i) => (
                    <ServiceCard key={i} service={s} isAI={true} />
                  ))}
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No suggestions available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
