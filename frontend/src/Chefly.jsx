
import { useState } from "react";

const quickQuestions = [
  "Which ingredients need restocking?",
  "How can I reduce food waste?",
  "What should I prepare for busy days?",
  "How does demand prediction work?",
];

function getReply(question) {
  const q = question.toLowerCase();

  if (q.includes("restock") || q.includes("stock") || q.includes("ingredient")) {
    return "Based on the demonstration inventory, Paneer needs about 4 kg more, onions 4 kg more, and cream 2 L more to cover the illustrative demand estimates. Check your live inventory before ordering.";
  }

  if (q.includes("waste") || q.includes("spoil") || q.includes("expiry")) {
    return "To reduce food waste: 1) follow FEFO (First Expired, First Out), 2) prepare smaller batches during quiet periods, 3) record leftover quantities daily, and 4) compare actual sales with demand estimates. Track waste by ingredient to identify recurring problems.";
  }

  if (q.includes("busy") || q.includes("prepare") || q.includes("demand")) {
    return "In the sample forecast, Friday and Saturday show the highest demand. Consider preparing ingredients in stages, checking stock before service, and reviewing actual sales after each day. These are demo values, not predictions trained on historical restaurant sales.";
  }

  if (q.includes("predict") || q.includes("forecast") || q.includes("model")) {
    return "Demand forecasting estimates how much of an ingredient or menu item may be needed in the future. A production system can use historical sales, day of the week, seasonality, and events. This demonstration uses sample forecast data until real sales history and a validated forecasting model are connected.";
  }

  if (q.includes("recipe") || q.includes("cost") || q.includes("profit")) {
    return "For recipe costing, add the cost of every ingredient used in one serving. Cost per serving = sum of (quantity used × cost per unit). Estimated gross profit per serving = selling price − ingredient cost. Include other operating costs for a fuller profitability estimate.";
  }

  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) {
    return "Hello! I'm Chefly, your HarvestIQ kitchen assistant. I can help you think through inventory, demand planning, recipe costing, and waste reduction. What would you like to explore?";
  }

  return "I can help with ingredient stock, restocking, demand forecasts, recipe costing, and waste reduction. Try asking one of the suggested questions below, or ask me about a specific kitchen-planning task.";
}

export default function Chefly() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm Chefly 👋 Your HarvestIQ kitchen assistant. Ask me about stock, demand planning, recipe costs, or food waste.",
    },
  ]);
  const [input, setInput] = useState("");

  function sendMessage(text = input) {
    const question = text.trim();
    if (!question) return;

    const reply = getReply(question);
    setMessages((current) => [
      ...current,
      { role: "user", text: question },
      { role: "assistant", text: reply },
    ]);
    setInput("");
  }

  return (
    <div style={{
      position: "fixed", right: 22, bottom: 22, zIndex: 9999,
      fontFamily: "inherit", color: "#26392d"
    }}>
      {open && (
        <section style={{
          width: "min(365px, calc(100vw - 32px))",
          height: "min(520px, calc(100vh - 115px))",
          background: "#fffdf8", border: "1px solid #e5e4da",
          borderRadius: 18, overflow: "hidden",
          boxShadow: "0 15px 55px rgba(27,48,32,.22)",
          display: "flex", flexDirection: "column", marginBottom: 12
        }}>
          <header style={{
            padding: 17, background: "#244431", color: "#fffaf0",
            display: "flex", alignItems: "center", gap: 11
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 13,
              background: "#e7b47e", display: "grid", placeItems: "center",
              fontSize: 22
            }}>♨</div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", fontSize: 15 }}>Chefly</strong>
              <span style={{ fontSize: 11, color: "#d6e2d5" }}>
                HarvestIQ kitchen assistant
              </span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" style={{
              background: "transparent", color: "white", border: 0,
              fontSize: 23, cursor: "pointer"
            }}>×</button>
          </header>

          <div style={{
            padding: 14, overflowY: "auto", flex: 1,
            display: "flex", flexDirection: "column", gap: 12
          }}>
            {messages.map((message, index) => (
              <div key={index} style={{
                alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%", padding: "11px 13px", borderRadius: 13,
                borderBottomRightRadius: message.role === "user" ? 4 : 13,
                borderBottomLeftRadius: message.role === "assistant" ? 4 : 13,
                background: message.role === "user" ? "#315941" : "#f0efe6",
                color: message.role === "user" ? "#ffffff" : "#344338",
                fontSize: 12, lineHeight: 1.65, whiteSpace: "pre-wrap"
              }}>
                {message.text}
              </div>
            ))}

            {messages.length === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {quickQuestions.map((question) => (
                  <button key={question} onClick={() => sendMessage(question)} style={{
                    border: "1px solid #dfe3d8", borderRadius: 10,
                    padding: "9px 10px", textAlign: "left",
                    background: "#fffdf8", color: "#38533e",
                    fontSize: 11, cursor: "pointer"
                  }}>{question} ↗</button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }} style={{
            display: "flex", gap: 8, padding: 12,
            borderTop: "1px solid #e9e7df", background: "#fffdf8"
          }}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Chefly something..."
              aria-label="Message Chefly"
              style={{
                minWidth: 0, flex: 1, padding: "11px 12px",
                border: "1px solid #dedfd4", borderRadius: 10,
                outlineColor: "#638369", fontSize: 12, background: "#ffffff"
              }}
            />
            <button type="submit" aria-label="Send message" style={{
              background: "#d58b4c", color: "white", border: 0,
              borderRadius: 10, padding: "0 15px", cursor: "pointer",
              fontWeight: 800, fontSize: 16
            }}>↑</button>
          </form>
        </section>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => setOpen((value) => !value)} style={{
          border: "none", borderRadius: 30, padding: "13px 19px",
          background: "#244431", color: "#fffaf0",
          boxShadow: "0 6px 20px rgba(30,55,37,.25)",
          cursor: "pointer", fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", gap: 9
        }}>
          <span style={{ fontSize: 18 }}>✦</span>
          {open ? "Close Chefly" : "Ask Chefly"}
        </button>
      </div>
    </div>
  );
}
