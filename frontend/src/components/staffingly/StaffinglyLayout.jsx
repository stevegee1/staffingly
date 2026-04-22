import SidebarNav from "./SidebarNav";
import TopBar from "./TopBar";
import AIChatbot from "@/components/chatbot/AIChatbot";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function StaffinglyLayout({
  user,
  currentPage,
  title,
  breadcrumbs,
  children,
  showChatbot = true,
  chatbotContext = "general",
  chatbotContextData = null,
  chatbotClientData = null,
  chatbotPayerRules = [],
}) {
  const { user: authUser } = useAuth();
  const resolvedUser = user || authUser;

  return (
    <div
      className="flex h-screen min-h-screen overflow-hidden"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <SidebarNav user={resolvedUser} currentPage={currentPage} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <TopBar user={resolvedUser} title={title} breadcrumbs={breadcrumbs} />
          <main className="p-5">{children}</main>
        </div>
      </div>
      {showChatbot && resolvedUser && (
        <AIChatbot
          user={resolvedUser}
          contextType={chatbotContext}
          contextData={chatbotContextData}
          clientData={chatbotClientData}
          payerRules={chatbotPayerRules}
        />
      )}
    </div>
  );
}
