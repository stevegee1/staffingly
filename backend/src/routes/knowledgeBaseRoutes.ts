import { Router } from "express";
import createCrudRouter from "../lib/createCrudRouter.js";

const router = Router();

// Knowledge Base Entries CRUD
router.use(
  "/entries",
  createCrudRouter("knowledgeBaseEntry" as any, {
    filterField: "clientId",
    orderBy: { accessCount: "desc" },
  })
);

// Chatbot Conversations CRUD
router.use(
  "/conversations",
  createCrudRouter("chatbotConversation" as any, {
    filterField: "clientId",
    orderBy: { createdAt: "desc" },
  })
);

export default router;
