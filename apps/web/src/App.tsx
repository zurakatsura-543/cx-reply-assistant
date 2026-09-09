import { Bot, Check, Database, History, MessageSquare, Pencil, Plus, RefreshCw, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  approveAiReply,
  createKnowledgeEntry,
  deleteMessage,
  deleteKnowledgeEntry,
  generateAiReply,
  getAiLogs,
  getBrands,
  getConversations,
  sendMessage,
  updateKnowledgeEntry
} from "./api";
import type { ApiAiLog } from "./api";
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

type ActiveView = "conversation" | "logs";

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function mapApiLog(log: ApiAiLog, brands: Brand[]): AiLog {
  return {
    id: log.id,
    conversationId: log.conversationId,
    brandId: log.brandId,
    customerMessage: log.customerMessage,
    brand: brands.find((item) => item.id === log.brandId)?.name ?? "Unknown brand",
    context: log.retrievedContext,
    aiResponse: log.aiGeneratedResponse,
    editedResponse: log.agentEditedResponse ?? "",
    finalResponse: log.finalResponse ?? "",
    confidence: log.confidence,
    guardrail: log.guardrail,
    modelName: log.modelName,
    promptTokens: log.promptTokens,
    completionTokens: log.completionTokens,
    timestamp: log.createdAt
  };
}

function normalizeKbTitle(title: string) {
  return title.trim().toLowerCase();
}

export function App() {
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState(initialConversations[0].id);
  const [mode, setMode] = useState<MessageSender>("agent");
  const [activeView, setActiveView] = useState<ActiveView>("conversation");
  const [draft, setDraft] = useState("");
  const [suggestionsByConversation, setSuggestionsByConversation] = useState<Record<string, AiSuggestion | null>>({});
  const [editedRepliesByConversation, setEditedRepliesByConversation] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [contextByConversation, setContextByConversation] = useState<Record<string, KnowledgeBaseEntry[]>>({});
  const [activeKbBrandId, setActiveKbBrandId] = useState(initialBrands[0].id);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [editingKbEntryId, setEditingKbEntryId] = useState<string | null>(null);
  const [editingKbDraft, setEditingKbDraft] = useState<{ title: string; body: string }>({
    title: "",
    body: ""
  });
  const [pendingSaveKbEntryId, setPendingSaveKbEntryId] = useState<string | null>(null);
  const [pendingDeleteKbEntryId, setPendingDeleteKbEntryId] = useState<string | null>(null);
  const [kbNotice, setKbNotice] = useState<string | null>(null);
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

  useEffect(() => {
    if (!conversation?.id || brands.length === 0) return;

    async function loadLogs() {
      try {
        const apiLogs = await getAiLogs(conversation.id);
        setLogs(apiLogs.map((log) => mapApiLog(log, brands)));
        setApiError(null);
      } catch (error) {
        setApiError("Could not load saved AI logs from the API.");
      }
    }

    void loadLogs();
  }, [brands, conversation?.id]);

  const activeLog = useMemo(() => logs.find((log) => !log.finalResponse) ?? logs[0], [logs]);

  async function addMessage(sender: MessageSender, text: string) {
    if (!text.trim()) return;
    setSendStatus("sending");
    try {
      const updatedConversation = await sendMessage(conversation.id, sender, text);
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? updatedConversation : item))
      );
      setDraft("");
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: null }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: "" }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: [] }));
      setSendStatus("sent");
      window.setTimeout(() => setSendStatus("idle"), 1200);
      setApiError(null);
    } catch (error) {
      setSendStatus("idle");
      setApiError("Could not send message through the API.");
    }
  }

  async function removeMessage(messageId: string) {
    try {
      const updatedConversation = await deleteMessage(conversation.id, messageId);
      setConversations((current) =>
        current.map((item) => (item.id === conversation.id ? updatedConversation : item))
      );
      setPendingDeleteMessageId(null);
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: null }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: "" }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: [] }));
      setApiError(null);
    } catch (error) {
      setApiError("Could not delete the message through the API.");
    }
  }

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await generateAiReply(conversation.id, Boolean(suggestion));
      setSuggestionsByConversation((current) => ({ ...current, [conversation.id]: result.suggestion }));
      setEditedRepliesByConversation((current) => ({ ...current, [conversation.id]: result.suggestion.text }));
      setContextByConversation((current) => ({ ...current, [conversation.id]: result.retrievedContext }));
      setLogs((current) => [mapApiLog(result.log, brands), ...current]);
      setActiveView("conversation");
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
      if (result.log) {
        setLogs((current) => current.map((log) => (log.id === result.log?.id ? mapApiLog(result.log, brands) : log)));
      }
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
    const isDuplicate = activeKbBrand.policies.some(
      (entry) => entry.type === kbDraft.type && normalizeKbTitle(entry.title) === normalizeKbTitle(kbDraft.title)
    );

    if (isDuplicate) {
      setKbNotice("That policy already exists for this brand. Edit the existing card instead of adding a duplicate.");
      return;
    }

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
      setKbNotice(null);
      setApiError(null);
    } catch (error) {
      setApiError("Could not create the knowledge base entry.");
    }
  }

  function startEditingKbEntry(entry: KnowledgeBaseEntry) {
    setEditingKbEntryId(entry.id);
    setEditingKbDraft({ title: entry.title, body: entry.body });
    setPendingSaveKbEntryId(null);
    setPendingDeleteKbEntryId(null);
  }

  async function saveKbEntry(entryId: string) {
    if (!editingKbDraft.title.trim() || !editingKbDraft.body.trim()) return;
    const currentEntry = activeKbBrand.policies.find((entry) => entry.id === entryId);
    const isDuplicate = activeKbBrand.policies.some(
      (entry) =>
        entry.id !== entryId &&
        entry.type === currentEntry?.type &&
        normalizeKbTitle(entry.title) === normalizeKbTitle(editingKbDraft.title)
    );

    if (isDuplicate) {
      setKbNotice("Another card already uses this policy title. Keep one source of truth for RAG.");
      return;
    }

    const previousBrands = brands;
    setBrands((current) =>
      current.map((item) =>
        item.id === activeKbBrand.id
          ? {
              ...item,
              policies: item.policies.map((entry) =>
                entry.id === entryId
                  ? { ...entry, title: editingKbDraft.title, body: editingKbDraft.body }
                  : entry
              )
            }
          : item
      )
    );
    try {
      await updateKnowledgeEntry(activeKbBrand.id, entryId, editingKbDraft);
      setEditingKbEntryId(null);
      setPendingSaveKbEntryId(null);
      setKbNotice(null);
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
      setPendingDeleteKbEntryId(null);
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

      <nav className="view-tabs" aria-label="Workspace views">
        <button className={activeView === "conversation" ? "active" : ""} onClick={() => setActiveView("conversation")}>
          <MessageSquare size={16} />
          Conversation
        </button>
        <button className={activeView === "logs" ? "active" : ""} onClick={() => setActiveView("logs")}>
          <History size={16} />
          AI Logs
          {logs.length > 0 && <span>{logs.length}</span>}
        </button>
      </nav>

      {activeView === "conversation" && (
      <div className="conversation-view">
      <section className="workspace">
        <div className="left-rail">
          <aside className="sidebar">
            <div className="panel-title">
              <MessageSquare size={18} />
              <h2>Conversations</h2>
            </div>
            {conversations.map((item) => {
              const itemBrand = brands.find((brandItem) => brandItem.id === item.brandId);
              const lastMessage = [...item.messages].reverse()[0];
              return (
                <button
                  className={`conversation-tab ${item.id === conversation.id ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    setActiveConversationId(item.id);
                    setActiveKbBrandId(item.brandId);
                  }}
                >
                  <span>{item.customerName}</span>
                  <small>{itemBrand?.name}</small>
                  {lastMessage && <em>{lastMessage.text}</em>}
                </button>
              );
            })}
          </aside>

          {mode === "agent" && (
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
          )}
        </div>

        <section className="conversation-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">{brand.name}</p>
              <h2>{conversation.customerName}</h2>
              {latestCustomerMessage && (
                <p className="latest-message">Latest: {latestCustomerMessage.text}</p>
              )}
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
            {conversation.messages.map((message) => {
              const isConfirmingDelete = pendingDeleteMessageId === message.id;

              return (
                <div className={`message ${message.sender}`} key={message.id}>
                  <div className="message-header">
                    <span>{message.sender === "agent" ? "Agent" : conversation.customerName}</span>
                    <button
                      aria-label="Delete message"
                      onClick={() => setPendingDeleteMessageId(message.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p>{message.text}</p>
                  <small>{formatTimestamp(message.timestamp)}</small>
                  {isConfirmingDelete && (
                    <div className="message-delete-confirm">
                      <p>Delete this message?</p>
                      <div>
                        <button className="danger-action" onClick={() => removeMessage(message.id)}>
                          Delete
                        </button>
                        <button className="secondary-action" onClick={() => setPendingDeleteMessageId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="composer">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={mode === "customer" ? "Send a new customer message..." : "Write a manual agent reply..."}
            />
            <button
              className={sendStatus === "sent" ? "sent" : ""}
              onClick={() => addMessage(mode, draft)}
              disabled={sendStatus === "sending"}
            >
              <Send size={16} />
              {sendStatus === "sending" ? "Sending..." : sendStatus === "sent" ? "Sent" : "Send"}
            </button>
          </div>
        </section>

      </section>
      <section className="knowledge-section">
        <div className="section-heading">
          <div className="panel-title">
            <Pencil size={18} />
            <h2>Brand Knowledge Base</h2>
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
            {activeKbBrand.policies.map((entry) => {
              const isEditing = editingKbEntryId === entry.id;
              const isConfirmingSave = pendingSaveKbEntryId === entry.id;
              const isConfirmingDelete = pendingDeleteKbEntryId === entry.id;

              return (
                <article className="kb-entry" key={entry.id}>
                  <div className="kb-entry-header">
                    <span className="policy-chip">{entry.type}</span>
                    <div className="kb-actions">
                      {isEditing ? (
                        <>
                          <button
                            className="icon-action"
                            aria-label="Save KB entry"
                            onClick={() => {
                              setPendingSaveKbEntryId(entry.id);
                              setPendingDeleteKbEntryId(null);
                            }}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            className="icon-muted"
                            aria-label="Cancel KB edit"
                            onClick={() => {
                              setEditingKbEntryId(null);
                              setPendingSaveKbEntryId(null);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <button className="icon-action" aria-label="Edit KB entry" onClick={() => startEditingKbEntry(entry)}>
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        className="icon-danger"
                        aria-label="Delete KB entry"
                        onClick={() => {
                          setPendingDeleteKbEntryId(entry.id);
                          setPendingSaveKbEntryId(null);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <>
                      <input
                        value={editingKbDraft.title}
                        onChange={(event) => setEditingKbDraft({ ...editingKbDraft, title: event.target.value })}
                      />
                      <textarea
                        value={editingKbDraft.body}
                        onChange={(event) => setEditingKbDraft({ ...editingKbDraft, body: event.target.value })}
                      />
                    </>
                  ) : (
                    <>
                      <h3>{entry.title}</h3>
                      <p>{entry.body}</p>
                    </>
                  )}

                  {isConfirmingSave && (
                    <div className="save-confirm">
                      <p>Save this policy change?</p>
                      <div>
                        <button className="confirm-action" onClick={() => saveKbEntry(entry.id)}>
                          Save
                        </button>
                        <button className="secondary-action" onClick={() => setPendingSaveKbEntryId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {isConfirmingDelete && (
                    <div className="delete-confirm">
                      <p>Delete this knowledge entry?</p>
                      <div>
                        <button className="danger-action" onClick={() => deleteKbEntry(entry.id)}>
                          Delete
                        </button>
                        <button className="secondary-action" onClick={() => setPendingDeleteKbEntryId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="kb-create">
            <h3>Add Policy Note</h3>
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
            {kbNotice && <p className="inline-warning">{kbNotice}</p>}
          </div>
        </div>
      </section>
      </div>
      )}

      {activeView === "logs" && (
      <section className="logs-section">
        <div className="panel-title">
          <History size={18} />
          <h2>AI Logs for {conversation.customerName}</h2>
        </div>
        {logs.length === 0 ? (
          <p className="empty">No saved logs for this conversation yet. Generate an AI reply, then refresh to confirm it persists.</p>
        ) : (
          logs.map((log) => (
            <article className="log-entry" key={log.id}>
              <div className="log-meta">
                <span>{formatTimestamp(log.timestamp)} · {log.brand}</span>
                <span className={`confidence ${log.confidence.toLowerCase().replace(" ", "-")}`}>
                  {log.confidence}
                </span>
              </div>
              <p>
                <strong>Guardrail:</strong> {log.guardrail}
              </p>
              <p>
                <strong>Customer:</strong> {log.customerMessage}
              </p>
              {log.context.length > 0 && (
                <p>
                  <strong>Retrieved:</strong> {log.context.map((entry) => entry.title).join(", ")}
                </p>
              )}
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
      )}
    </main>
  );
}
