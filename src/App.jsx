import { useState, useRef, useEffect } from "react";

/*
   AGENT DEFINITION
   System prompt = agent persona + domain knowledge + decision logic
*/
const AGENT = `You are Lishe, an expert Kenyan nutrition advisor powered by Claude AI.
"Lishe" means nutrition in Swahili.

## Character
- Warm and conversational — like a trusted friend who happens to be a nutritionist
- Reference Kenyan foods naturally: ugali, sukuma wiki, nyama choma, githeri, pilau,
  mukimo, nduma, viazi, kunde, matoke, mandazi, mahindi, and more
- Light Swahili naturally: "Sawa!", "Vizuri sana!", "Karibu!", "Pole sana"
- Practical — real meal ideas using locally available, affordable ingredients

## Agent Decision Logic — FOLLOW THIS EXACTLY
Before every response, ask yourself: "Do I have enough context to give specific useful advice?"

ASK ONE clarifying question when the request is too vague:
- "help me eat healthy"  →  Ask: "What's your main goal — weight, energy, a health condition, or just better habits?"
- "I want to lose weight"  →  Ask: "What does your current daily eating look like?"
- "I feel tired all the time"  →  Ask: "How many meals a day do you eat, and are you getting breakfast?"

ANSWER directly when you have enough context:
- "What are iron-rich Kenyan foods?" → Answer immediately, you know enough
- "Is ugali healthy?" → Answer with nuance right away
- "What should I eat for breakfast?" → Give 3–4 concrete Kenyan options

Hard rules:
1. MAX one question per response — never more than one
2. Never re-ask something the user already told you in this conversation
3. Build all future advice on what the user has already shared
4. When unsure whether to ask or answer: give your best advice + invite correction

## Formatting
- **bold** for food names and key nutrients
- Bullet lists for meal options and tips
- ## headers for detailed plan sections
- Keep it warm and clear, never clinical`;

/* MARKDOWN RENDERER */
function MD({ text }) {
  const inline = (s) =>
    s
      .replace(
        /\*\*(.*?)\*\*/g,
        '<strong style="color:#c8e6c9;font-weight:600">$1</strong>',
      )
      .replace(
        /\*([^*\n]+)\*/g,
        '<em style="color:#a5d6a7;font-style:italic">$1</em>',
      )
      .replace(
        /`([^`\n]+)`/g,
        '<code style="background:rgba(139,195,74,.13);padding:1px 5px;border-radius:3px;font-size:.87em;font-family:monospace">$1</code>',
      );

  const parse = (raw) => {
    const lines = raw.split("\n");
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      if (l.startsWith("## ")) {
        out.push(
          `<h2 style="color:#8bc34a;font-size:14.5px;font-weight:700;margin:13px 0 5px;letter-spacing:-.01em">${inline(l.slice(3))}</h2>`,
        );
        i++;
      } else if (l.startsWith("### ")) {
        out.push(
          `<h3 style="color:#aed581;font-size:13px;font-weight:600;margin:9px 0 3px">${inline(l.slice(4))}</h3>`,
        );
        i++;
      } else if (l.startsWith("- ") || l.startsWith("• ")) {
        const li = [];
        while (
          i < lines.length &&
          (lines[i].startsWith("- ") || lines[i].startsWith("• "))
        ) {
          li.push(
            `<li style="margin:3px 0;padding-left:2px">${inline(lines[i].slice(2))}</li>`,
          );
          i++;
        }
        out.push(
          `<ul style="margin:5px 0;padding-left:18px;list-style:disc">${li.join("")}</ul>`,
        );
      } else if (/^\d+\. /.test(l)) {
        const li = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          li.push(
            `<li style="margin:3px 0">${inline(lines[i].replace(/^\d+\. /, ""))}</li>`,
          );
          i++;
        }
        out.push(
          `<ol style="margin:5px 0;padding-left:18px">${li.join("")}</ol>`,
        );
      } else if (l.trim() === "") {
        out.push('<div style="height:5px"></div>');
        i++;
      } else {
        out.push(`<p style="margin:0 0 2px;line-height:1.65">${inline(l)}</p>`);
        i++;
      }
    }
    return out.join("");
  };

  return (
    <div
      style={{ fontSize: 13.5, color: "#dcedc8", lineHeight: 1.65 }}
      dangerouslySetInnerHTML={{ __html: parse(text) }}
    />
  );
}

/* MAIN COMPONENT */
export default function LisheAI() {
  const GREETING =
    "Habari! 👋 Mimi ni **Lishe** — mshauri wako wa lishe.\n\n" +
    '"Lishe" means nutrition in Swahili, and that\'s exactly what I do. ' +
    "I'm powered by Gemini AI and I know my Kenyan foods — from **ugali** to **pilau** to everything in between.\n\n" +
    "What brings you here today? Tell me your goal or challenge and let's get into it. 🥗";

  /* SESSION:full conversation history sent to the API on every call.
     Gemini uses plain strings for content,
     not arrays like the Anthropic API. */
  const [session, setSession] = useState([]);
  const [msgs, setMsgs] = useState([{ role: "ai", text: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height =
      Math.min(taRef.current.scrollHeight, 118) + "px";
  }, [input]);

  const send = async () => {
    if (!input.trim() || busy) return;
    const txt = input.trim();
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: txt }]);
    setBusy(true);

    /* Append user message to session */
    const nextSess = [...session, { role: "user", content: txt }];

    try {
      const r = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          max_tokens: 1024,
          messages: [{ role: "system", content: AGENT }, ...nextSess],
        }),
      });

      const d = await r.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));

      
      const reply = d.choices[0].message.content;

      /* Save assistant reply as plain string in session */
      setSession([...nextSess, { role: "assistant", content: reply }]);
      setMsgs((p) => [...p, { role: "ai", text: reply }]);
    } catch (e) {
      setMsgs((p) => [
        ...p,
        {
          role: "ai",
          text: `⚠️ Pole sana! Something went wrong.\n\n\`${e.message}\``,
        },
      ]);
    } finally {
      setBusy(false);
      taRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const msgCount = session.filter((m) => m.role === "user").length;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background:
          "linear-gradient(150deg,#030a04 0%,#071409 55%,#030a04 100%)",
        fontFamily: '"Inter",system-ui,sans-serif',
      }}
    >
      {/*HEADER */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "11px 16px",
          flexShrink: 0,
          background: "rgba(0,0,0,.55)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(139,195,74,.1)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            fontSize: 18,
            flexShrink: 0,
            background: "linear-gradient(135deg,#1b5e20,#2e7d32)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(139,195,74,.18)",
          }}
        >
          🥗
        </div>
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#dcedc8",
              letterSpacing: "-.02em",
            }}
          >
            Lishe AI
            <span
              style={{
                fontSize: 10,
                color: "#558b2f",
                fontWeight: 400,
                marginLeft: 7,
              }}
            >
            </span>
          </div>
          <div style={{ fontSize: 10.5, color: "#4caf50" }}>
            Kenyan Nutrition Advisor
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#4caf50",
                boxShadow: "0 0 5px #4caf50",
              }}
            />
            <span style={{ fontSize: 10, color: "#4caf50" }}>Online</span>
          </div>
          {msgCount > 0 && (
            <div style={{ fontSize: 9.5, color: "#2e7d32", marginTop: 2 }}>
              {msgCount} exchange{msgCount !== 1 ? "s" : ""} this session
            </div>
          )}
        </div>
      </header>

      {/* MESSAGES */}
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {m.role === "ai" && (
              <div
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: 8,
                  flexShrink: 0,
                  marginTop: 2,
                  background: "linear-gradient(135deg,#1b5e20,#2e7d32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                🥗
              </div>
            )}
            <div style={{ maxWidth: m.role === "user" ? "70%" : "80%" }}>
              <div
                style={{
                  padding: "10px 13px",
                  borderRadius:
                    m.role === "user"
                      ? "13px 13px 3px 13px"
                      : "3px 13px 13px 13px",
                  background:
                    m.role === "user"
                      ? "linear-gradient(135deg,#1b5e20,#2e7d32)"
                      : "rgba(255,255,255,.05)",
                  border:
                    m.role === "ai" ? "1px solid rgba(139,195,74,.08)" : "none",
                  boxShadow:
                    m.role === "user" ? "0 2px 10px rgba(27,94,32,.3)" : "none",
                }}
              >
                {m.role === "ai" ? (
                  <MD text={m.text} />
                ) : (
                  <span
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: "#dcedc8",
                    }}
                  >
                    {m.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {busy && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div
              style={{
                width: 27,
                height: 27,
                borderRadius: 8,
                flexShrink: 0,
                background: "linear-gradient(135deg,#1b5e20,#2e7d32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}
            >
              🥗
            </div>
            <div
              style={{
                padding: "11px 14px",
                borderRadius: "3px 13px 13px 13px",
                background: "rgba(255,255,255,.05)",
                border: "1px solid rgba(139,195,74,.08)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#66bb6a",
                    animation: `d 1.3s ease-in-out ${j * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/*  INPUT */}
      <footer
        style={{
          padding: "9px 12px 13px",
          flexShrink: 0,
          background: "rgba(0,0,0,.45)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(139,195,74,.09)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            background: "rgba(255,255,255,.04)",
            border: "1px solid rgba(139,195,74,.14)",
            borderRadius: 13,
            padding: "7px 7px 7px 13px",
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about food, nutrition, meal plans..."
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#dcedc8",
              fontSize: 13.5,
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              minHeight: 22,
              maxHeight: 118,
              overflowY: "auto",
              padding: "3px 0",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || busy}
            style={{
              width: 33,
              height: 33,
              borderRadius: 9,
              border: "none",
              flexShrink: 0,
              background:
                !input.trim() || busy
                  ? "rgba(139,195,74,.1)"
                  : "linear-gradient(135deg,#1b5e20,#2e7d32)",
              color: !input.trim() || busy ? "rgba(139,195,74,.25)" : "#a5d6a7",
              fontSize: 15,
              cursor: !input.trim() || busy ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                !input.trim() || busy ? "none" : "0 2px 8px rgba(27,94,32,.35)",
            }}
          >
            ↑
          </button>
        </div>
        <p
          style={{
            textAlign: "center",
            margin: "5px 0 0",
            fontSize: 9.5,
            color: "rgba(139,195,74,.18)",
          }}
        >
          Enter · send &nbsp;·&nbsp; Shift+Enter · newline
        </p>
      </footer>

      <style>{`
        @keyframes d {
          0%, 70%, 100% { transform: scale(.6); opacity: .3; }
          35% { transform: scale(1.1); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(139,195,74,.14); border-radius: 2px; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
