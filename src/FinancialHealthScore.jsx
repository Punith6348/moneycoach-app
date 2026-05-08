// ─── FinancialHealthScore.jsx ─────────────────────────────────────────────────
// Financial Health Score widget (0-100)
// Props: totalIncome, totalExpenses, totalSavings, savingsBalance, totalLoanEMI

export function calcHealthScore({ totalIncome, totalExpenses, totalSavings, savingsBalance, totalLoanEMI }) {
  if (!totalIncome || totalIncome <= 0) return null;

  let score = 0;
  const reasons = [];

  // 1. Savings rate (0-30 pts)
  const savingsRate = (totalSavings / totalIncome) * 100;
  if      (savingsRate >= 30) score += 30;
  else if (savingsRate >= 20) { score += 20; reasons.push("Savings rate below 30% — aim to save more each month"); }
  else if (savingsRate >= 10) { score += 10; reasons.push("Low savings rate — try to save at least 20% of income"); }
  else                        { score +=  0; reasons.push("Very low savings — saving less than 10% of income"); }

  // 2. Expense ratio (0-20 pts)
  const expenseRatio = (totalExpenses / totalIncome) * 100;
  if      (expenseRatio < 50)  score += 20;
  else if (expenseRatio < 70)  { score += 10; reasons.push("High expenses — spending 50-70% of income on bills"); }
  else                         { score +=  0; reasons.push("Very high expenses — spending over 70% of income"); }

  // 3. Emergency fund (0-20 pts)
  const emergencyMonths = totalExpenses > 0 ? savingsBalance / totalExpenses : 0;
  if      (emergencyMonths >= 6) score += 20;
  else if (emergencyMonths >= 3) { score += 10; reasons.push("Emergency fund covers less than 6 months of expenses"); }
  else                           { score +=  0; reasons.push("Low emergency fund — aim for 3-6 months of expenses saved"); }

  // 4. Debt ratio (0-20 pts)
  const debtRatio = (totalLoanEMI / totalIncome) * 100;
  if      (debtRatio < 20)  score += 20;
  else if (debtRatio < 40)  { score += 10; reasons.push("Moderate debt — EMIs are 20-40% of income"); }
  else if (debtRatio > 0)   { score +=  0; reasons.push("High debt burden — EMIs exceed 40% of income"); }

  // Label
  const label =
    score >= 80 ? "Excellent" :
    score >= 60 ? "Good" :
    score >= 40 ? "Risky" : "Critical";

  const color =
    score >= 80 ? "#16A34A" :
    score >= 60 ? "#2563EB" :
    score >= 40 ? "#D97706" : "#DC2626";

  const bgColor =
    score >= 80 ? "#F0FDF4" :
    score >= 60 ? "#EFF6FF" :
    score >= 40 ? "#FFFBEB" : "#FFF1F2";

  const emoji =
    score >= 80 ? "🌟" :
    score >= 60 ? "👍" :
    score >= 40 ? "⚠️" : "🚨";

  // Keep top 3 most impactful reasons
  return { score, label, color, bgColor, emoji, reasons: reasons.slice(0, 3) };
}

export default function FinancialHealthScore({
  totalIncome = 0,
  totalExpenses = 0,
  totalSavings = 0,
  savingsBalance = 0,
  totalLoanEMI = 0,
}) {
  const result = calcHealthScore({ totalIncome, totalExpenses, totalSavings, savingsBalance, totalLoanEMI });

  if (!result) return null;

  const { score, label, color, bgColor, emoji, reasons } = result;

  // Arc calculation for SVG gauge
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const progress = (score / 100) * circumference;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 20,
      padding: "20px",
      marginBottom: 16,
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      border: "1px solid #F1F5F9",
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Financial Health
          </p>
          <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF" }}>
            Based on your income & expenses
          </p>
        </div>
        <div style={{ padding:"4px 12px", borderRadius:99, background:bgColor, border:`1px solid ${color}22` }}>
          <p style={{ margin:0, fontSize:12, fontWeight:800, color }}>{emoji} {label}</p>
        </div>
      </div>

      {/* Gauge + Score */}
      <div style={{ display:"flex", alignItems:"center", gap:20 }}>
        {/* SVG Arc Gauge */}
        <div style={{ position:"relative", width:130, height:72, flexShrink:0 }}>
          <svg width="130" height="72" viewBox="0 0 130 72">
            {/* Background arc */}
            <path
              d="M 10 65 A 55 55 0 0 1 120 65"
              fill="none"
              stroke="#F1F5F9"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Progress arc */}
            <path
              d="M 10 65 A 55 55 0 0 1 120 65"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 172} 172`}
              style={{ transition:"stroke-dasharray 0.8s ease" }}
            />
            {/* Score text */}
            <text x="65" y="58" textAnchor="middle" fontSize="24" fontWeight="800" fill="#111827" fontFamily="-apple-system,sans-serif">
              {score}
            </text>
            <text x="65" y="70" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="-apple-system,sans-serif">
              out of 100
            </text>
          </svg>
        </div>

        {/* Score breakdown */}
        <div style={{ flex:1 }}>
          {[
            { label:"Savings Rate",    val: totalIncome > 0 ? Math.round((totalSavings/totalIncome)*100) : 0,  suffix:"%" },
            { label:"Expense Ratio",   val: totalIncome > 0 ? Math.round((totalExpenses/totalIncome)*100) : 0, suffix:"%" },
            { label:"Emergency Fund",  val: totalExpenses > 0 ? Math.round((savingsBalance/totalExpenses)*10)/10 : 0, suffix:"mo" },
            { label:"Debt Ratio",      val: totalIncome > 0 ? Math.round((totalLoanEMI/totalIncome)*100) : 0,  suffix:"%" },
          ].map((item, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <p style={{ margin:0, fontSize:11, color:"#6B7280" }}>{item.label}</p>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:"#111827" }}>{item.val}{item.suffix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div style={{ marginTop:14, borderTop:"1px solid #F1F5F9", paddingTop:12 }}>
          <p style={{ margin:"0 0 8px", fontSize:11, fontWeight:700, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.8px" }}>
            Areas to improve
          </p>
          {reasons.map((r, i) => (
            <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>💡</span>
              <p style={{ margin:0, fontSize:12, color:"#374151", lineHeight:1.4 }}>{r}</p>
            </div>
          ))}
        </div>
      )}

      {/* Perfect score message */}
      {reasons.length === 0 && (
        <div style={{ marginTop:14, borderTop:"1px solid #F1F5F9", paddingTop:12,
          textAlign:"center" }}>
          <p style={{ margin:0, fontSize:12, color:"#16A34A", fontWeight:600 }}>
            🎉 Excellent financial health! Keep it up!
          </p>
        </div>
      )}
    </div>
  );
}
