import { Bot, Check, Database, History, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { generateReply, retrieveContext } from "./ai";
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
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [editedReply, setEditedReply] = useState("");
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [activeKbBrandId, setActiveKbBrandId] = useState(initialBrands[0].id);
  const [kbDraft, setKbDraft] = useState<{ type: PolicyType; title: string; body: string }>({
    type: "Return policy",
    title: "",
    body: ""
  });

  const conversation = conversations.find((item) => item.id === activeConversationId) ?? conversations[0];
  const brand = brands.find((item) => item.id === conversation.brandId) ?? brands[0];
  const activeKbBrand = brands.find((item) => item.id === activeKbBrandId) ?? brands[0];
  const latestCustomerMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.sender === "customer");

  const retrievedContext = useMemo(() => {
    return retrieveContext(latestCustomerMessage?.text || "", brand);
  }, [brand, latestCustomerMessage?.text]);

  function addMessage(sender: MessageSender, text: string) {
    if (!text.trim()) return;
    const message = {
      id: `m-${Date.now()}`,
      sender,
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setConversations((current) =>
      current.map((item) =>
        item.id === conversation.id ? { ...item, messages: [...item.messages, message] } : item
      )
    );
    setDraft("");
    setSuggestion(null);
    setEditedReply("");
  }

  function handleGenerate() {
    const result = generateReply({ brand, conversation, retrievedContext });
    setSuggestion(result);
    setEditedReply(result.text);
    setLogs((current) => [
      {
        id: `log-${Date.now()}`,
        customerMessage: latestCustomerMessage?.text || "",
        brand: brand.name,
        context: retrievedContext,
        aiResponse: result.text,
        editedResponse: "",
        finalResponse: "",
        timestamp: new Date().toISOString()
      },
      ...current
    ]);
  }

  function approveReply() {
    if (!editedReply.trim()) return;
    addMessage("agent", editedReply);
    setLogs((current) =>
      current.map((log, index) =>
        index === 0 ? { ...log, editedResponse: editedReply, finalResponse: editedReply } : log
      )
    );
  }

  function addKbEntry() {
    if (!kbDraft.title.trim() || !kbDraft.body.trim()) return;
    setBrands((current) =>
      current.map((item) =>
        item.id === activeKbBrand.id
          ? { ...item, policies: [...item.policies, { id: `kb-${Date.now()}`, ...kbDraft }] }
          : item
      )
    );
    setKbDraft({ type: "Return policy", title: "", body: "" });
  }

  function updateKbEntry(entryId: string, field: keyof KnowledgeBaseEntry, value: string) {
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
  }

  function deleteKbEntry(entryId: string) {
    setBrands((current) =>
      current.map((item) =>
        item.id === activeKbBrand.id
          ? { ...item, policies: item.policies.filter((entry) => entry.id !== entryId) }
          : item
      )
    );
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
                  setSuggestion(null);
                  setEditedReply("");
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
          <button className="primary-action" onClick={handleGenerate}>
            <RefreshCw size={16} />
            {suggestion ? "Regenerate Reply" : "Generate Reply"}
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
              <textarea value={editedReply} onChange={(event) => setEditedReply(event.target.value)} />
              <button className="approve" onClick={approveReply}>
                <Check size={16} />
                Approve & Send
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
            </article>
          ))
        )}
      </section>
    </main>
  );
}
