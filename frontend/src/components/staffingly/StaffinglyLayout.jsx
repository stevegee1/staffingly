import SidebarNav from "./SidebarNav";
import TopBar from "./TopBar";
import AIChatbot from "@/components/chatbot/AIChatbot";

const NO_CHATBOT_PAGES = [];

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
  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: "#eef3ff", fontFamily: "'DM Sans', sans-serif" }}
    >
      <SidebarNav user={user} currentPage={currentPage} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar user={user} title={title} breadcrumbs={breadcrumbs} />
        <main className="flex-1 p-5 overflow-auto">{children}</main>
      </div>
      {showChatbot && user && (
        <AIChatbot
          user={user}
          contextType={chatbotContext}
          contextData={chatbotContextData}
          clientData={chatbotClientData}
          payerRules={chatbotPayerRules}
        />
      )}
    </div>
  );
}
