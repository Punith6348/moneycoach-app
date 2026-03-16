// ─── MonthlyReview.jsx ────────────────────────────────────────────────────────
// Monthly Review tab: summary, highlights, MoM comparison, 3 insights
// Uses only existing app data — no new storage, no new calculations
// ──────────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { calcTotalReserve, calcLoanTotals, monthKeyToLabel, getActiveMonthKeys } from "./useAppData";

const C = {
  ink:"#1C1917", muted:"#78716C", border:"#E7E5E0", bg:"#F7F5F0",
  red:"#DC2626", green:"#16A34A", amber:"#D97706", blue:"#2563EB", purple:"#7C3AED",
};

const fmt  = (n) => `₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const pct  = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;
const diff = (curr, prev)  => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;

const CAT_ICONS = {
  Food:"🍽", Travel:"🚗", Coffee:"☕", Grocery:"🛒",
  Medical:"💊", Entertainment:"🎬", Other:"💸",
};

// ── Thin progress bar ─────────────────────────────────────────────────────────
function Bar({ value, max, color, height = 4 }) {
  const w = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ height, borderRadius: 99, background: C.border, overflow: "hidden", marginTop: 4 }}>
      <div style={{ height: "100%", width: `${w}%`, background: color, borderRadius: 99, transition: "width 0.5s" }} />
    </div>
  );
}

// ── Delta badge: ▲ +12% green / ▼ −8% red ────────────────────────────────────
function Delta({ curr, prev, invertGood = false }) {
  const d = diff(curr, prev);
  if (d === null) return <span style={{ fontSize: 9, color: C.muted }}>no prev</span>;
  const improved = invertGood ? d < 0 : d > 0;
  const neutral  = d === 0;
  const color    = neutral ? C.muted : improved ? C.green : C.red;
  const arrow    = d > 0 ? "▲" : d < 0 ? "▼" : "─";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 2,
      fontSize: 9, fontWeight: 700, color,
      background: neutral ? C.bg : improved ? "#F0FDF4" : "#FFF1F2",
      border: `1px solid ${neutral ? C.border : improved ? "#86EFAC" : "#FECACA"}`,
      borderRadius: 99, padding: "1px 6px",
    }}>
      {arrow} {Math.abs(d)}%
    </span>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function Card({ title, subtitle, icon, children, accentColor = C.blue }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 13, border: `1px solid ${C.border}`,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden", marginBottom: 12,
    }}>
      <div style={{
        padding: "10px 14px", borderBottom: `1px solid ${C.bg}`,
        background: `${accentColor}08`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.ink }}>
            {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{title}
          </p>
          {subtitle && <p style={{ margin: "1px 0 0", fontSize: 10, color: C.muted }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

// ── Metric row: label | value | optional delta ────────────────────────────────
function MetricRow({ label, value, color = C.ink, delta, invertGood, sublabel, last = false }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 0", borderBottom: last ? "none" : `1px solid ${C.bg}`, gap: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.ink }}>{label}</p>
        {sublabel && <p style={{ margin: "1px 0 0", fontSize: 10, color: C.muted }}>{sublabel}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {delta !== undefined && (
          <Delta curr={delta.curr} prev={delta.prev} invertGood={invertGood} />
        )}
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "Georgia,serif" }}>{value}</span>
      </div>
    </div>
  );
}

// ── Insight card ──────────────────────────────────────────────────────────────
function InsightPill({ text, type = "neutral" }) {
  const styles = {
    good:    { bg: "#F0FDF4", border: "#86EFAC", icon: "✅", color: C.green },
    warn:    { bg: "#FFFBEB", border: "#FCD34D", icon: "⚠️", color: C.amber },
    bad:     { bg: "#FFF1F2", border: "#FECACA", icon: "🔴", color: C.red   },
    neutral: { bg: C.bg,      border: C.border,  icon: "💡", color: C.muted },
  };
  const s = styles[type] || styles.neutral;
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
      padding: "10px 12px", marginBottom: 8,
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
      <p style={{ margin: 0, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

// ── Month selector pills ──────────────────────────────────────────────────────
function MonthPicker({ selectedMonth, onChange, allExpenses, incomeSources }) {
  const keys = getActiveMonthKeys(allExpenses);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
      overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none",
    }}>
      <p style={{ margin: 0, fontSize: 10, color: C.muted, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.8px", flexShrink: 0 }}>
        Reviewing:
      </p>
      {keys.map(k => {
        const active = k === selectedMonth;
        return (
          <button key={k} onClick={() => onChange(k)} style={{
            flexShrink: 0, padding: "5px 12px", borderRadius: 99, cursor: "pointer",
            fontFamily: "inherit", fontSize: 11, fontWeight: active ? 700 : 500,
            border: `1.5px solid ${active ? C.ink : C.border}`,
            background: active ? C.ink : "#fff",
            color: active ? "#fff" : C.muted,
            transition: "all 0.12s",
          }}>
            {monthKeyToLabel(k)}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function MonthlyReview({
  selectedMonth, onMonthChange,
  allExpenses,
  totalIncome, totalFixed, totalSavings, totalReserve,
  loans, futurePayments,
}) {
  // ── Derive keys ──────────────────────────────────────────────────────────
  const [y, m]   = selectedMonth.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);   // month before selectedMonth
  const prevKey  = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const hasPrev  = !!(allExpenses[prevKey]?.length);

  const curExpenses  = useMemo(() => allExpenses[selectedMonth] || [], [allExpenses, selectedMonth]);
  const prevExpenses = useMemo(() => allExpenses[prevKey]       || [], [allExpenses, prevKey]);

  // ── Aggregate expenses ───────────────────────────────────────────────────
  const totalVar     = curExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotalVar = prevExpenses.reduce((s, e) => s + e.amount, 0);

  // Loan EMI total (sum of all active loans)
  const totalLoanEmi = useMemo(
    () => loans.reduce((s, l) => s + calcLoanTotals(l).emi, 0),
    [loans]
  );

  // Month-end balance = income − fixed − savings − reserve − variable spend − EMI
  const monthEndBalance = totalIncome - totalFixed - totalSavings - totalReserve - totalVar - totalLoanEmi;

  // ── Category breakdown ───────────────────────────────────────────────────
  const catMap = useMemo(() => {
    const m = {};
    curExpenses.forEach(e => { m[e.label] = (m[e.label] || 0) + e.amount; });
    return m;
  }, [curExpenses]);

  const prevCatMap = useMemo(() => {
    const m = {};
    prevExpenses.forEach(e => { m[e.label] = (m[e.label] || 0) + e.amount; });
    return m;
  }, [prevExpenses]);

  const catList = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1]);

  const topCat     = catList[0]?.[0] || null;
  const topCatAmt  = catList[0]?.[1] || 0;
  const prevTopCat = Object.entries(prevCatMap).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // ── Biggest single expense ───────────────────────────────────────────────
  const biggestExp = curExpenses.length > 0
    ? curExpenses.reduce((max, e) => e.amount > max.amount ? e : max, curExpenses[0])
    : null;

  // ── No-spend days (days in month with zero variable expenses) ────────────
  const daysInMonth = new Date(y, m, 0).getDate();
  const daysWithSpend = new Set(curExpenses.map(e => e.date.split("T")[0])).size;
  const noSpendDays = daysInMonth - daysWithSpend;

  // ── Savings rate ─────────────────────────────────────────────────────────
  const savingsRate     = pct(totalSavings, totalIncome);
  // Prev month's income is the same plan income (we don't store historical plan data)
  // so we compare variable spend reduction as a savings proxy
  const prevSpendRate   = pct(prevTotalVar, totalIncome);
  const curSpendRate    = pct(totalVar, totalIncome);

  // ── Fixed burden % ───────────────────────────────────────────────────────
  const fixedBurden = pct(totalFixed + totalLoanEmi, totalIncome);

  // ── Prev month comparison: remaining ────────────────────────────────────
  const prevRemaining = totalIncome - totalFixed - totalSavings - totalReserve - prevTotalVar - totalLoanEmi;

  // ══ INSIGHTS (rule-based, max 3) ═════════════════════════════════════════
  const insights = useMemo(() => {
    const list = [];

    // 1. Food/top category spend up/down
    if (topCat && hasPrev) {
      const cur  = catMap[topCat]  || 0;
      const prev = prevCatMap[topCat] || 0;
      if (cur > prev * 1.1) {
        list.push({
          text: `Your ${topCat} spending rose to ${fmt(cur)} this month — ${fmt(cur - prev)} more than last month.`,
          type: "warn",
        });
      } else if (cur < prev * 0.9 && prev > 0) {
        list.push({
          text: `Great job — you cut ${topCat} spending by ${fmt(prev - cur)} compared to last month.`,
          type: "good",
        });
      }
    }

    // 2. Savings rate
    if (savingsRate >= 20) {
      list.push({
        text: `You're saving ${savingsRate}% of income — well above the 20% benchmark. Strong financial discipline.`,
        type: "good",
      });
    } else if (savingsRate > 0 && savingsRate < 10) {
      list.push({
        text: `Your savings rate is ${savingsRate}% of income. Consider increasing it to at least 10% next month.`,
        type: "warn",
      });
    } else if (savingsRate === 0) {
      list.push({
        text: `No savings or investments are set up yet. Adding even ₹1,000/month builds a meaningful habit.`,
        type: "warn",
      });
    }

    // 3. Fixed + EMI burden
    if (fixedBurden > 60) {
      list.push({
        text: `Fixed costs and EMIs consume ${fixedBurden}% of your income, leaving limited room for daily spending.`,
        type: "bad",
      });
    } else if (fixedBurden >= 40 && fixedBurden <= 60) {
      list.push({
        text: `Fixed costs and EMIs are ${fixedBurden}% of income — within range, but watch variable spending closely.`,
        type: "neutral",
      });
    } else if (fixedBurden > 0 && fixedBurden < 40) {
      list.push({
        text: `Fixed costs and EMIs are a healthy ${fixedBurden}% of income — good headroom for saving and spending.`,
        type: "good",
      });
    }

    // 4. Variable spending increased significantly vs last month
    if (hasPrev && totalVar > prevTotalVar * 1.2 && prevTotalVar > 0) {
      list.push({
        text: `Variable spending jumped ${Math.round(((totalVar - prevTotalVar) / prevTotalVar) * 100)}% vs last month (${fmt(prevTotalVar)} → ${fmt(totalVar)}).`,
        type: "bad",
      });
    }

    // 5. No-spend days highlight
    if (noSpendDays >= 10) {
      list.push({
        text: `${noSpendDays} no-spend days this month — excellent restraint. Every zero-spend day compounds.`,
        type: "good",
      });
    }

    // 6. Month-end balance negative
    if (monthEndBalance < 0) {
      list.push({
        text: `Month-end balance is negative (${fmt(monthEndBalance)}). Spending exceeded available budget.`,
        type: "bad",
      });
    }

    // Return top 3 most useful (already priority-ordered above)
    return list.slice(0, 3);
  }, [catMap, prevCatMap, topCat, hasPrev, savingsRate, fixedBurden, totalVar, prevTotalVar, noSpendDays, monthEndBalance]);

  // ── Empty state ──────────────────────────────────────────────────────────
  const isEmpty = curExpenses.length === 0 && totalIncome === 0;
  const noExpenses = curExpenses.length === 0;

  return (
    <div>
      {/* Month picker */}
      <MonthPicker
        selectedMonth={selectedMonth}
        onChange={onMonthChange}
        allExpenses={allExpenses}
      />

      {isEmpty ? (
        <div style={{
          background: "#fff", borderRadius: 13, border: `1px solid ${C.border}`,
          textAlign: "center", padding: "48px 24px",
        }}>
          <p style={{ fontSize: 36, margin: "0 0 10px" }}>📅</p>
          <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: C.ink }}>
            No data for {monthKeyToLabel(selectedMonth)}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
            Add income sources in the Plan tab and log expenses to see your monthly review.
          </p>
        </div>
      ) : (
        <>
          {/* ══ 1. MONTHLY SUMMARY ══ */}
          <Card title="Monthly Summary" icon="📋"
            subtitle={monthKeyToLabel(selectedMonth)} accentColor={C.blue}>

            {/* Hero balance row */}
            <div style={{
              background: C.ink, borderRadius: 10, padding: "12px 14px",
              marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 9, color: "#78716C", textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 700 }}>
                  Month-End Balance
                </p>
                <p style={{
                  margin: "2px 0 0", fontSize: 26, fontWeight: 700,
                  fontFamily: "Georgia,serif", lineHeight: 1,
                  color: monthEndBalance >= 0 ? "#fff" : "#F87171",
                }}>
                  {monthEndBalance >= 0 ? fmt(monthEndBalance) : `−${fmt(Math.abs(monthEndBalance))}`}
                </p>
              </div>
              {hasPrev && (
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontSize: 9, color: "#57534E", textTransform: "uppercase", letterSpacing: "0.8px" }}>vs last month</p>
                  <Delta curr={monthEndBalance} prev={prevRemaining} invertGood={false} />
                </div>
              )}
            </div>

            {/* Breakdown rows */}
            <MetricRow label="Total Income"       value={fmt(totalIncome)}   color={C.green}  sublabel="From all income sources" />
            <MetricRow label="Fixed Expenses"     value={fmt(totalFixed)}    color={C.red}    sublabel="Rent, bills, subscriptions" />
            <MetricRow label="Savings & Inv."     value={fmt(totalSavings)}  color={C.blue}   sublabel="SIPs, RDs, emergency fund" />
            {totalLoanEmi > 0 && (
              <MetricRow label="Loan EMIs"         value={fmt(totalLoanEmi)}  color={C.purple} sublabel="Active loan repayments" />
            )}
            {totalReserve > 0 && (
              <MetricRow label="Future Reserve"   value={fmt(totalReserve)}  color={C.amber}  sublabel="Set aside for upcoming bills" />
            )}
            <MetricRow label="Variable Spending"  value={fmt(totalVar)}      color={C.red}
              delta={hasPrev ? { curr: totalVar, prev: prevTotalVar } : undefined}
              invertGood={true}
              sublabel={`${curExpenses.length} transaction${curExpenses.length !== 1 ? "s" : ""}`}
              last />
          </Card>

          {/* ══ 2. SPENDING BREAKDOWN ══ */}
          {!noExpenses && (
            <Card title="Spending Breakdown" icon="🧾"
              subtitle="Variable expenses by category" accentColor={C.amber}>
              {catList.length === 0 ? (
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>No variable expenses logged.</p>
              ) : (
                catList.map(([cat, amt], i) => (
                  <div key={cat} style={{
                    padding: "7px 0",
                    borderBottom: i < catList.length - 1 ? `1px solid ${C.bg}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 14 }}>{CAT_ICONS[cat] || "💸"}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{cat}</span>
                        {hasPrev && prevCatMap[cat] && (
                          <Delta curr={amt} prev={prevCatMap[cat]} invertGood={true} />
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.amber, fontFamily: "Georgia,serif" }}>
                        {fmt(amt)}
                      </span>
                    </div>
                    <Bar value={amt} max={totalVar} color={C.amber} />
                    <p style={{ margin: "2px 0 0", fontSize: 9, color: C.muted }}>
                      {pct(amt, totalVar)}% of variable spend
                    </p>
                  </div>
                ))
              )}
            </Card>
          )}

          {/* ══ 3. HIGHLIGHTS ══ */}
          <Card title="Month Highlights" icon="🏅" accentColor={C.green}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                {
                  label: "Top Category",
                  value: topCat ? `${CAT_ICONS[topCat] || "💸"} ${topCat}` : "—",
                  sub:   topCat ? fmt(topCatAmt) : "No expenses",
                  color: C.amber,
                },
                {
                  label: "Biggest Expense",
                  value: biggestExp ? fmt(biggestExp.amount) : "—",
                  sub:   biggestExp ? `${CAT_ICONS[biggestExp.label] || "💸"} ${biggestExp.label}${biggestExp.note ? ` · ${biggestExp.note}` : ""}` : "No expenses",
                  color: C.red,
                },
                {
                  label: "No-Spend Days",
                  value: `${noSpendDays}`,
                  sub:   `out of ${daysInMonth} days`,
                  color: C.green,
                },
                {
                  label: "Transactions",
                  value: `${curExpenses.length}`,
                  sub:   totalVar > 0 ? `avg ${fmt(Math.round(totalVar / Math.max(curExpenses.length, 1)))} each` : "No expenses",
                  color: C.blue,
                },
              ].map(tile => (
                <div key={tile.label} style={{
                  background: C.bg, borderRadius: 9, padding: "10px 11px",
                  border: `1px solid ${C.border}`,
                }}>
                  <p style={{ margin: 0, fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 700 }}>
                    {tile.label}
                  </p>
                  <p style={{ margin: "3px 0 1px", fontSize: 15, fontWeight: 700, color: tile.color, fontFamily: "Georgia,serif", lineHeight: 1.1 }}>
                    {tile.value}
                  </p>
                  <p style={{ margin: 0, fontSize: 9, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tile.sub}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* ══ 4. MOM COMPARISON ══ */}
          <Card title="Month-on-Month" icon="📈"
            subtitle={hasPrev ? `vs ${monthKeyToLabel(prevKey)}` : "No previous month data"}
            accentColor={C.purple}>
            {!hasPrev ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
                <span style={{ fontSize: 20 }}>📭</span>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: C.ink }}>No previous month to compare</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted }}>
                    Keep logging expenses — comparison will appear next month.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <MetricRow
                  label="Variable Spending"
                  value={fmt(totalVar)}
                  color={totalVar <= prevTotalVar ? C.green : C.red}
                  delta={{ curr: totalVar, prev: prevTotalVar }}
                  invertGood={true}
                  sublabel={`was ${fmt(prevTotalVar)}`}
                />
                <MetricRow
                  label="Savings & Inv."
                  value={fmt(totalSavings)}
                  color={C.blue}
                  sublabel="Plan savings (unchanged by month)"
                />
                <MetricRow
                  label="Month-End Balance"
                  value={fmt(monthEndBalance)}
                  color={monthEndBalance >= 0 ? C.green : C.red}
                  delta={{ curr: monthEndBalance, prev: prevRemaining }}
                  invertGood={false}
                  sublabel={`was ${fmt(prevRemaining)}`}
                />
                <MetricRow
                  label="Top Spend Category"
                  value={topCat ? `${CAT_ICONS[topCat] || "💸"} ${topCat}` : "—"}
                  color={C.amber}
                  sublabel={prevTopCat ? (topCat === prevTopCat ? `Same as last month` : `Last month: ${CAT_ICONS[prevTopCat] || "💸"} ${prevTopCat}`) : "No prev data"}
                  last
                />
              </>
            )}
          </Card>

          {/* ══ 5. INSIGHTS ══ */}
          {insights.length > 0 && (
            <Card title="Monthly Insights" icon="💡"
              subtitle="3 actionable observations" accentColor={C.blue}>
              {insights.map((ins, i) => (
                <InsightPill key={i} text={ins.text} type={ins.type} />
              ))}
            </Card>
          )}

          {/* ══ 6. INCOME ALLOCATION PIE-LIKE SUMMARY ══ */}
          {totalIncome > 0 && (
            <Card title="Where Your Income Went" icon="🥧"
              subtitle="As a % of monthly income" accentColor={C.green}>
              {[
                { label: "Fixed Expenses",   amt: totalFixed,    color: C.red    },
                { label: "Savings & Inv.",   amt: totalSavings,  color: C.blue   },
                { label: "Loan EMIs",        amt: totalLoanEmi,  color: C.purple, hide: totalLoanEmi === 0 },
                { label: "Future Reserve",   amt: totalReserve,  color: C.amber,  hide: totalReserve === 0  },
                { label: "Variable Spend",   amt: totalVar,      color: "#EA580C" },
                { label: "Unspent",          amt: Math.max(0, monthEndBalance), color: C.green },
              ].filter(r => !r.hide && r.amt > 0).map((row, i, arr) => (
                <div key={row.label} style={{ marginBottom: i < arr.length - 1 ? 8 : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: row.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{row.label}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{pct(row.amt, totalIncome)}%</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.color, fontFamily: "Georgia,serif" }}>{fmt(row.amt)}</span>
                    </div>
                  </div>
                  <Bar value={row.amt} max={totalIncome} color={row.color} height={5} />
                </div>
              ))}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
