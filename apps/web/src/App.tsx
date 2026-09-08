import { Bot, Check, Database, History, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  approveAiReply,
  createKnowledgeEntry,
  deleteKnowledgeEntry,
  generateAiReply,
  getBrands,
  getConversations,
  sendMessage,
  updateKnowledgeEntry
} from "./api";
import { initialBrands, initialConversations, policyTypes } from "./data";
import type {
  AiLog,
  AiSuggestion,
  Brand,
  Conversation,
  KnowledgeBaseEntry,
  MessageSender,
  PolicyType
} from "./types";

export function App() {
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(initialConversations[0].id);
  const [mode, setMode] = useState<MessageSender>("agent");
  const [draft, setDraft] = useState("");
  const [suggestionsByConversation, setSuggestionsByConversation] = useState<Record<string, AiSuggestion | null>>({});
  const [editedRepliesByConversation, setEditedRepliesByConversation] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [contextByConversation, setContextByConversation] = useState<Record<string, KnowledgeBaseEntry[]>>({});
  const [activeKbBrandId, setActiveKbBrandId] = useState(initialBrands[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [kbDraft, setKbDraft] = useState<{ type: PolicyType; title: string; body: string }>({
    type: "Return policy",
    title: "",
    body: ""
  });

  const conversation = conversations.find((item) => item.id === activeConversationId) ?? conversations[0];
  const brand = brands.find((item) => item.id === conversation.brandId) ?? brands[0];
  const activeKbBrand = brands.find((item) => item.id === activeKbBrandId) ?? brands[0];
  const suggestion = suggestionsByConversation[conversation.id] ?? null;
  const editedReply = editedRepliesByConversation[conversation.id] ?? "";
  const retrievedContext = contextByConversation[conversation.id] ?? [];
  const latestCustomerMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.sender === "customer");

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const [apiBrands, apiConversations] = await Promise.all([getBrands(), getConversations()]);
        setBrands(apiBrands);
        setConversations(apiConversations);
        setActiveConversationId(apiConversations[0]?.id ?? initialConversations[0].id);
        setActiveKbBrandId(apiBrands[0]?.id ?? initialBrands[0].id);
        setApiError(null);
      } catch (error) {
        setApiError("Could not reach the NestJS API. Start it with npm run dev:api.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkspace();
  }, []);

  const activeLog = useMemo(() => logs[0], [logs]);

  async function addMessage(sender: MessageSender, text: string) {
    if (!text.trim()) return;
    try {
      const updatedConversation = await sendMessage(conversation.id, sender, text);
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? updatedConversation : item))
      );
      setDraft("");
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: null }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: "" }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: [] }));
      setApiError(null);
    } catch (error) {
      setApiError("Could not send message through the API.");
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await generateAiReply(conversation.id, Boolean(suggestion));
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: result.suggestion }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: result.suggestion.text }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: result.retrievedContext }));
      setLogs((current) => [
        {
          id: result.log.id,
          customerMessage: result.log.customerMessage,
          brand: brand.name,
          context: result.retrievedContext,
          aiResponse: result.log.aiGeneratedResponse,
          editedResponse: "",
          finalResponse: result.log.finalResponse ?? "",
          timestamp: result.log.createdAt
        },
        ...current
      ]);
      setApiError(null);
    } catch (error) {
      setApiError("Could not generate an AI reply through the API.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function approveReply() {
    if (!editedReply.trim()) return;
    setIsApproving(true);
    try {
      const result = await approveAiReply(conversation.id, editedReply);
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? result.conversation : item))
      );
      setLogs((current) =>
        current.map((log, index) =>
          index === 0 ? { ...log, editedResponse: editedReply, finalResponse: editedReply } : log
        )
      );
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: null }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: "" }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: [] }));
      setApiError(null);
    } catch (error) {
      setApiError("Could not approve the AI reply through the API.");
    } finally {
      setIsApproving(false);
    }
  }

  async function addKbEntry() {
    if (!kbDraft.title.trim() || !kbDraft.body.trim()) return;
    try {
      const createdEntry = await createKnowledgeEntry(activeKbBrand.id, kbDraft);
      setBrands((current) =>
        current.map((item) =>
          item.id === activeKbBrand.id
            ? { ...item, policies: [...item.policies, createdEntry] }
            : item
        )
      );
      setKbDraft({ type: "Return policy", title: "", body: "" });
      setApiError(null);
    } catch (error) {
      setApiError("Could not create the knowledge base entry.");
    }
  }

  async function updateKbEntry(entryId: string, field: keyof KnowledgeBaseEntry, value: string) {
    const previousBrands = brands;
    setBrands((current) =>
      current.map((item) =>
        item.id === activeKbBrand.id
          ? {
              ...item,
              policies: item.policies.map((entry) =>
                entry.id === entryId ? { ...entry, [field]: value } : entry
              )
            }
          : item
      )
    );
    try {
      await updateKnowledgeEntry(activeKbBrand.id, entryId, { [field]: value });
      setApiError(null);
    } catch (error) {
      setBrands(previousBrands);
      setApiError("Could not update the knowledge base entry.");
    }
  }

  async function deleteKbEntry(entryId: string) {
    try {
      await deleteKnowledgeEntry(activeKbBrand.id, entryId);
      setBrands((current) =>
        current.map((item) =>
          item.id === activeKbBrand.id
            ? { ...item, policies: item.policies.filter((entry) => entry.id !== entryId) }
            : item
        )
      );
      setApiError(null);
    } catch (error) {
      setApiError("Could not delete the knowledge base entry.");
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Datastraw Assessment</p>
          <h1>AI-Powered CX Reply Assistant</h1>
        </div>
        <div className="mode-toggle" aria-label="Conversation side">
          <button className={mode === "customer" ? "active" : ""} onClick={() => setMode("customer")}>
            Customer
          </button>
          <button className={mode === "agent" ? "active" : ""} onClick={() => setMode("agent")}>
            Agent
          </button>
        </div>
      </section>

      {isLoading && <div className="status-banner">Loading workspace from NestJS API...</div>}
      {apiError && <div className="status-banner error">{apiError}</div>}

      <section className="workspace">
        <aside className="sidebar">
          <h2>Conversations</h2>
          {conversations.map((item) => {
            const itemBrand = brands.find((brandItem) => brandItem.id === item.brandId);
            return (
              <button
                className={`conversation-tab ${item.id === conversation.id ? "selected" : ""}`}
                key={item.id}
                onClick={() => {
                  setActiveConversationId(item.id);
                }}
              >
                <span>{item.customerName}</span>
                <small>{itemBrand?.name}</small>
              </button>
            );
          })}
        </aside>

        <section className="conversation-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{brand.name}</p>
              <h2>{conversation.customerName}</h2>
            </div>
            <div className="order-box">
              <span>{conversation.order.orderId}</span>
              <strong>{conversation.order.status}</strong>
            </div>
          </div>

          <div className="order-grid">
            <div>
              <span>Item</span>
              <strong>{conversation.order.item}</strong>
            </div>
            <div>
              <span>Delivered</span>
              <strong>{conversation.order.deliveredAt}</strong>
            </div>
            <div>
              <span>Value</span>
              <strong>{conversation.order.value}</strong>
            </div>
          </div>

          <div className="messages">
            {conversation.messages.map((message) => (
              <div className={`message ${message.sender}`} key={message.id}>
                <span>{message.sender === "agent" ? "Agent" : conversation.customerName}</span>
                <p>{message.text}</p>
                <small>{message.timestamp}</small>
              </div>
            ))}
          </div>

          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={mode === "customer" ? "Send a new customer message..." : "Write a manual agent reply..."}
            />
            <button onClick={() => addMessage(mode, draft)}>
              <Send size={16} />
              Send
            </button>
          </div>
        </section>

        <section className="assistant-panel">
          <div className="panel-title">
            <Bot size={18} />
            <h2>AI Reply</h2>
          </div>
          <button className="primary-action" onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw size={16} />
            {isGenerating ? "Generating..." : suggestion ? "Regenerate Reply" : "Generate Reply"}
          </button>

          <div className="context-box">
            <div className="panel-title">
              <Database size={16} />
              <h3>Retrieved Context</h3>
            </div>
            {retrievedContext.length === 0 ? (
              <p className="empty">No relevant brand knowledge found.</p>
            ) : (
              retrievedContext.map((entry) => (
                <article key={entry.id}>
                  <strong>
                    {entry.type}: {entry.title}
                  </strong>
                  <p>{entry.body}</p>
                </article>
              ))
            )}
          </div>

          {suggestion && (
            <div className="suggestion">
              <span className={`confidence ${suggestion.confidence.toLowerCase().replace(" ", "-")}`}>
                {suggestion.confidence}
              </span>
              <p className="guardrail">{suggestion.guardrail}</p>
              <textarea
                className="reply-editor"
                value={editedReply}
                onChange={(event) =>
                  setEditedRepliesByConversation((current) => ({
                    ...current,
                    [conversation.id]: event.target.value
                  }))
                }
              />
              <button className="approve" onClick={approveReply} disabled={isApproving}>
                <Check size={16} />
                {isApproving ? "Approving..." : "Approve & Send"}
              </button>
            </div>
          )}
        </section>
      </section>

      <section className="knowledge-section">
        <div className="section-heading">
          <div className="panel-title">
            <Pencil size={18} />
            <h2>Knowledge Base Manager</h2>
          </div>
          <select value={activeKbBrandId} onChange={(event) => setActiveKbBrandId(event.target.value)}>
            {brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="kb-layout">
          <div className="kb-list">
            {activeKbBrand.policies.map((entry) => (
              <article className="kb-entry" key={entry.id}>
                <select
                  value={entry.type}
                  onChange={(event) => updateKbEntry(entry.id, "type", event.target.value)}
                >
                  {policyTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
                <input value={entry.title} onChange={(event) => updateKbEntry(entry.id, "title", event.target.value)} />
                <textarea value={entry.body} onChange={(event) => updateKbEntry(entry.id, "body", event.target.value)} />
                <button className="icon-danger" aria-label="Delete KB entry" onClick={() => deleteKbEntry(entry.id)}>
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>

          <div className="kb-create">
            <h3>Add Knowledge</h3>
            <select
              value={kbDraft.type}
              onChange={(event) => setKbDraft({ ...kbDraft, type: event.target.value as PolicyType })}
            >
              {policyTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <input
              value={kbDraft.title}
              onChange={(event) => setKbDraft({ ...kbDraft, title: event.target.value })}
              placeholder="Policy title"
            />
            <textarea
              value={kbDraft.body}
              onChange={(event) => setKbDraft({ ...kbDraft, body: event.target.value })}
              placeholder="Policy details"
            />
            <button onClick={addKbEntry}>
              <Plus size={16} />
              Add Entry
            </button>
          </div>
        </div>
      </section>

      <section className="logs-section">
        <div className="panel-title">
          <History size={18} />
          <h2>AI Logs</h2>
        </div>
        {logs.length === 0 ? (
          <p className="empty">Generation logs will appear after the first AI reply.</p>
        ) : (
          logs.map((log) => (
            <article className="log-entry" key={log.id}>
              <span>
                {new Date(log.timestamp).toLocaleString()} · {log.brand}
              </span>
              <p>
                <strong>Customer:</strong> {log.customerMessage}
              </p>
              <p>
                <strong>AI:</strong> {log.aiResponse}
              </p>
              {log.finalResponse && (
                <p>
                  <strong>Final:</strong> {log.finalResponse}
                </p>
              )}
              {activeLog?.id === log.id && !log.finalResponse && (
                <p>
                  <strong>Status:</strong> Waiting for agent approval
                </p>
              )}
            </article>
          ))
        )}
      </section>
    </main>
  );
}
