import { useState, useRef, useEffect } from "react";

const APP_URL = "https://moneycoach-app.vercel.app";

const TEST_PERSONA = {
  name: "Ravi Kumar",
  age: 28,
  job: "Software Engineer",
  salary: 85000,
  city: "Bangalore",
  cards: ["HDFC Regalia", "SBI SimplyCLICK"],
  loans: ["Home Loan ₹35L", "Car Loan ₹6L"],
};

const TEST_SCENARIOS = [
  { id:1, icon:"💰", label:"Income & Plan Setup",   desc:"Add salary + freelance income, set savings goals" },
  { id:2, icon:"🏠", label:"Fixed Expenses",         desc:"Add rent, electricity, internet, mobile bills" },
  { id:3, icon:"💸", label:"Daily Expense Logging",  desc:"Log food, travel, grocery expenses for the month" },
  { id:4, icon:"🏦", label:"Loan Management",        desc:"Add home loan and car loan, check EMI tracker" },
  { id:5, icon:"💳", label:"Credit Card Setup",      desc:"Add HDFC Regalia + SBI SimplyCLICK, test smart guide" },
  { id:6, icon:"📊", label:"Dashboard Review",       desc:"Check balance calculation, spending insights" },
  { id:7, icon:"📈", label:"Charts & History",       desc:"Review monthly trends, category breakdown" },
  { id:8, icon:"🔁", label:"Recurring Tab",          desc:"Verify carry-forward items appear correctly" },
  { id:9, icon:"🔐", label:"Auth Flow",              desc:"Test Google login, session persistence" },
  { id:10,icon:"📱", label:"Mobile UX",              desc:"Check layout on phone, bottom nav, safe areas" },
];

export default function MoneyCoachTestBot() {
  const [messages,   setMessages]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [activeTest, setActiveTest] = useState(null);
  const [report,     setReport]     = useState(null);
  const [tab,        setTab]        = useState("scenarios"); // scenarios | chat | report
  const [chatInput,  setChatInput]  = useState("");
  const bottomRef = useRef(null);

  useEffect(()=>{
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  },[messages]);

  const addMsg = (role, text, type="normal") => {
    setMessages(p=>[...p,{ role, text, type, ts:Date.now() }]);
  };

  const callClaude = async (systemPrompt, userMsg) => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: systemPrompt,
        messages:[{ role:"user", content:userMsg }],
      }),
    });
    const data = await res.json();
    return data.content?.[0]?.text || "No response";
  };

  const runScenario = async (scenario) => {
    setActiveTest(scenario.id);
    setTab("chat");
    setLoading(true);

    addMsg("system", `🧪 Running: ${scenario.icon} ${scenario.label}`, "system");

    const system = `You are a QA tester for Money Coach, a personal finance app. 
You are playing the role of ${TEST_PERSONA.name}, ${TEST_PERSONA.age}, ${TEST_PERSONA.job} from ${TEST_PERSONA.city}.
Salary: ₹${TEST_PERSONA.salary.toLocaleString("en-IN")}/month.

App URL: ${APP_URL}

Your task: Test the "${scenario.label}" feature.
${scenario.desc}

Provide:
1. Step-by-step what you tried as a real user
2. What worked well ✅
3. What was confusing or broken ❌
4. UX suggestions 💡
5. Bug report if any 🐛

Be specific, realistic and helpful. Write as if you actually used the app.
Format with clear sections. Keep it practical and actionable.`;

    try {
      const response = await callClaude(system,
        `Test the "${scenario.label}" feature of Money Coach app as ${TEST_PERSONA.name}. 
         Give detailed feedback on UX, bugs, and improvements.`
      );
      addMsg("bot", response, "feedback");
    } catch(e) {
      addMsg("bot", "❌ Error calling AI. Check your connection.", "error");
    }

    setLoading(false);
  };

  const runFullReport = async () => {
    setTab("report");
    setLoading(true);
    setReport(null);

    const system = `You are a senior QA engineer and UX reviewer for Money Coach — 
a personal finance PWA built with React + Firebase, available on Web, Android Play Store, and iOS App Store.

App: ${APP_URL}
User persona: ${TEST_PERSONA.name}, ${TEST_PERSONA.age}, Software Engineer, Bangalore
Monthly income: ₹${TEST_PERSONA.salary.toLocaleString("en-IN")}

Features to review:
- Dashboard with remaining balance (income - fixed - savings - EMI - expenses)
- Plan tab: Income, Fixed Expenses, Savings, Future Reserve (2-column grid)
- Expenses tab: log daily expenses with categories
- Loans tab: EMI calculator, outstanding balance
- Credit Cards tab: smart usage guide, utilization tracker
- Charts tab: monthly history, spending breakdown
- Recurring tab: auto carry-forward items
- Insights tab: smart suggestions
- Settings: load test data, reset, name, dark mode
- Auth: Google + Apple Sign In + Guest

Provide a comprehensive test report with:
1. Executive Summary (overall score /100)
2. Feature-by-feature review
3. Critical bugs found
4. UX issues
5. Performance observations
6. Top 5 improvements recommended
7. What's working great

Format as a structured report. Be specific and actionable.`;

    try {
      const response = await callClaude(system,
        `Generate a comprehensive QA test report for Money Coach app. 
         Test all features thoroughly as ${TEST_PERSONA.name} and provide detailed feedback.`
      );
      setReport(response);
    } catch(e) {
      setReport("❌ Error generating report. Please try again.");
    }

    setLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || loading) return;
    const q = chatInput.trim();
    setChatInput("");
    addMsg("user", q);
    setLoading(true);

    const system = `You are an expert QA tester and UX reviewer for Money Coach app (${APP_URL}).
User persona: ${TEST_PERSONA.name}, ${TEST_PERSONA.age}, Software Engineer, ₹85,000/month.
App stack: React + Vite + Firebase + PWA + Android/iOS.
Answer questions about app testing, bugs, UX improvements. Be specific and helpful.`;

    try {
      const response = await callClaude(system, q);
      addMsg("bot", response);
    } catch(e) {
      addMsg("bot", "❌ Error. Try again.", "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      minHeight:"100vh", background:"#0F172A", color:"#E2E8F0" }}>

      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1E293B,#334155)",
        padding:"16px 20px", borderBottom:"1px solid #334155",
        display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:24 }}>🤖</span>
            <div>
              <p style={{ margin:0, fontSize:16, fontWeight:800, color:"#F1F5F9" }}>
                Money Coach Test Bot
              </p>
              <p style={{ margin:0, fontSize:11, color:"#64748B" }}>
                AI-powered QA tester · Persona: {TEST_PERSONA.name}
              </p>
            </div>
          </div>
        </div>
        <a href={APP_URL} target="_blank" rel="noreferrer"
          style={{ padding:"7px 14px", borderRadius:8, background:"#2563EB",
            color:"#fff", textDecoration:"none", fontSize:12, fontWeight:700 }}>
          Open App ↗
        </a>
      </div>

      {/* Persona card */}
      <div style={{ margin:"16px 16px 0", padding:"12px 14px", borderRadius:12,
        background:"#1E293B", border:"1px solid #334155" }}>
        <p style={{ margin:"0 0 6px", fontSize:11, fontWeight:700, color:"#64748B",
          textTransform:"uppercase", letterSpacing:"1px" }}>Test Persona</p>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {[
            { label:"Name",   value:TEST_PERSONA.name },
            { label:"Job",    value:TEST_PERSONA.job },
            { label:"City",   value:TEST_PERSONA.city },
            { label:"Income", value:`₹${TEST_PERSONA.salary.toLocaleString("en-IN")}/mo` },
          ].map(s=>(
            <div key={s.label}>
              <p style={{ margin:0, fontSize:10, color:"#64748B" }}>{s.label}</p>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, margin:"16px 16px 0",
        background:"#1E293B", borderRadius:12, padding:4,
        border:"1px solid #334155" }}>
        {[
          { k:"scenarios", l:"🧪 Test Scenarios" },
          { k:"chat",      l:"💬 Chat with Bot" },
          { k:"report",    l:"📋 Full Report" },
        ].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            flex:1, padding:"9px 6px", borderRadius:9, border:"none",
            background:tab===t.k?"#334155":"transparent",
            color:tab===t.k?"#F1F5F9":"#64748B",
            fontFamily:"inherit", fontSize:12, fontWeight:700,
            cursor:"pointer",
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── SCENARIOS TAB ── */}
      {tab==="scenarios" && (
        <div style={{ padding:"16px" }}>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#64748B" }}>
            Select a scenario to run AI-powered testing and get detailed feedback
          </p>
          {TEST_SCENARIOS.map(s=>(
            <div key={s.id} style={{ background:"#1E293B", borderRadius:12, marginBottom:8,
              border:`1px solid ${activeTest===s.id?"#2563EB":"#334155"}`,
              overflow:"hidden" }}>
              <button onClick={()=>runScenario(s)}
                disabled={loading}
                style={{ width:"100%", padding:"12px 14px", background:"none", border:"none",
                  display:"flex", alignItems:"center", gap:12, cursor:loading?"default":"pointer",
                  textAlign:"left", fontFamily:"inherit" }}>
                <span style={{ fontSize:24, flexShrink:0 }}>{s.icon}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#E2E8F0" }}>
                    {s.label}
                  </p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748B" }}>{s.desc}</p>
                </div>
                {loading && activeTest===s.id ? (
                  <span style={{ fontSize:12, color:"#2563EB", fontWeight:700 }}>Running...</span>
                ) : (
                  <span style={{ fontSize:16, color:"#334155" }}>›</span>
                )}
              </button>
            </div>
          ))}

          <button onClick={runFullReport} disabled={loading}
            style={{ width:"100%", marginTop:8, padding:"14px", borderRadius:12, border:"none",
              background:loading?"#334155":"linear-gradient(135deg,#7C3AED,#4F46E5)",
              color:loading?"#64748B":"#fff",
              fontFamily:"inherit", fontSize:14, fontWeight:800,
              cursor:loading?"default":"pointer" }}>
            {loading?"Generating...":"🚀 Generate Full Test Report"}
          </button>
        </div>
      )}

      {/* ── CHAT TAB ── */}
      {tab==="chat" && (
        <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 280px)" }}>
          <div style={{ flex:1, overflowY:"auto", padding:"16px" }}>
            {messages.length===0 && (
              <div style={{ textAlign:"center", padding:"40px 20px" }}>
                <p style={{ fontSize:32, margin:"0 0 8px" }}>💬</p>
                <p style={{ fontSize:14, color:"#64748B" }}>
                  Run a test scenario or ask the bot anything about Money Coach
                </p>
                <p style={{ fontSize:12, color:"#475569", marginTop:8 }}>
                  e.g. "What UX issues might users face in the Plan tab?"
                </p>
              </div>
            )}
            {messages.map((m,i)=>(
              <div key={i} style={{
                marginBottom:12,
                display:"flex",
                flexDirection:m.role==="user"?"row-reverse":"row",
                gap:8, alignItems:"flex-start",
              }}>
                {m.role!=="user" && (
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                    background:m.type==="system"?"#334155":"#7C3AED",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14 }}>
                    {m.type==="system"?"🧪":"🤖"}
                  </div>
                )}
                <div style={{
                  maxWidth:"85%", padding:"10px 14px", borderRadius:12,
                  background: m.role==="user"?"#2563EB":
                              m.type==="system"?"#1E3A5F":
                              m.type==="error"?"#450A0A":"#1E293B",
                  border:`1px solid ${m.role==="user"?"#3B82F6":
                         m.type==="system"?"#2563EB40":"#334155"}`,
                  color:"#E2E8F0", fontSize:13, lineHeight:1.6,
                  whiteSpace:"pre-wrap",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 0" }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"#7C3AED",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>🤖</div>
                <div style={{ padding:"10px 14px", borderRadius:12, background:"#1E293B",
                  border:"1px solid #334155" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    {[0,1,2].map(i=>(
                      <div key={i} style={{ width:6, height:6, borderRadius:"50%",
                        background:"#64748B",
                        animation:`bounce 1.4s ease-in-out ${i*0.2}s infinite` }}/>
                    ))}
                  </div>
                  <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}`}</style>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:"12px 16px", borderTop:"1px solid #334155",
            display:"flex", gap:10 }}>
            <input value={chatInput} onChange={e=>setChatInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
              placeholder="Ask anything about testing Money Coach..."
              style={{ flex:1, padding:"11px 14px", borderRadius:10,
                border:"1px solid #334155", background:"#1E293B",
                color:"#E2E8F0", fontFamily:"inherit", fontSize:14,
                outline:"none" }}/>
            <button onClick={sendChat} disabled={loading||!chatInput.trim()}
              style={{ padding:"11px 18px", borderRadius:10, border:"none",
                background:loading||!chatInput.trim()?"#334155":"#2563EB",
                color:loading||!chatInput.trim()?"#64748B":"#fff",
                fontFamily:"inherit", fontSize:14, fontWeight:700,
                cursor:loading||!chatInput.trim()?"default":"pointer" }}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {tab==="report" && (
        <div style={{ padding:"16px" }}>
          {!report && !loading && (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <p style={{ fontSize:40, margin:"0 0 12px" }}>📋</p>
              <p style={{ fontSize:14, color:"#94A3B8", margin:"0 0 20px" }}>
                Generate a comprehensive QA report covering all app features
              </p>
              <button onClick={runFullReport}
                style={{ padding:"14px 28px", borderRadius:12, border:"none",
                  background:"linear-gradient(135deg,#7C3AED,#4F46E5)",
                  color:"#fff", fontFamily:"inherit", fontSize:15,
                  fontWeight:800, cursor:"pointer" }}>
                🚀 Generate Full Report
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign:"center", padding:"60px 20px" }}>
              <div style={{ width:48, height:48, borderRadius:"50%",
                border:"4px solid #334155", borderTopColor:"#7C3AED",
                animation:"spin 1s linear infinite", margin:"0 auto 16px" }}/>
              <p style={{ color:"#64748B", fontSize:14 }}>
                AI is testing all features...
              </p>
              <p style={{ color:"#475569", fontSize:12, marginTop:4 }}>
                This takes 15-20 seconds
              </p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {report && !loading && (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", marginBottom:12 }}>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:"#E2E8F0" }}>
                  📋 Test Report
                </p>
                <button onClick={runFullReport}
                  style={{ padding:"6px 12px", borderRadius:8, border:"none",
                    background:"#334155", color:"#94A3B8",
                    fontFamily:"inherit", fontSize:12, cursor:"pointer" }}>
                  Regenerate
                </button>
              </div>
              <div style={{ background:"#1E293B", borderRadius:12, padding:"14px 16px",
                border:"1px solid #334155", whiteSpace:"pre-wrap",
                fontSize:13, lineHeight:1.7, color:"#E2E8F0" }}>
                {report}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
