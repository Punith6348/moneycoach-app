# Money Coach AI Coding Instructions

## Project Overview
Money Coach is a cross-platform personal finance app built with **React 19 + Vite** for web/mobile (Capacitor), with **Firebase** (Auth + Firestore) backend and **native Android/iOS** builds via Gradle and Xcode.

**Key Purpose**: Help users manage budgets, track expenses, plan savings, and monitor loans/credit cards with real-time financial insights.

## Architecture

### Frontend Stack
- **Framework**: React 19 (JSX, hooks-based)
- **Build**: Vite 7.3 (dev server, HMR enabled)
- **State**: Custom hooks (`useAppData`, `useFirestoreSync`, `useStreak`)
- **Styling**: Inline CSS objects (color constants `C = {ink, muted, border, ...}`)
- **Charts**: Recharts library for spending trends
- **Auth UI**: Custom `AuthScreen.jsx` (Google + Apple + Guest modes)

### Backend & Data Flow
1. **Firebase Auth**: Google, Apple, and guest auth via popup/native flows
2. **Firestore**: User docs at `users/{uid}` store serialized app state + profile
3. **LocalStorage**: Primary cache using key `moneyCoachData_v3` (v2/v1 for migrations)
4. **Sync Pattern**: 
   - Load from localStorage on mount
   - Async load Firestore in background (`loadFromFirestore`)
   - Write to both localStorage and Firestore on state changes (`saveToFirestore`)
   - First-time users: migrate local data to Firestore via `migrateLocalToFirestore()`

### Native Integration
- **Capacitor 8.3**: Wraps web app for iOS/Android
- **iOS**: Apple Sign In only (Google popup blocked in WKWebView; detect via `window.Capacitor?.isNativePlatform()`)
- **Android**: Gradle build (AGP 8.9.1, Java not explicitly typed but implied)
- **Build Output**: APK/AAB artifacts in `app/build/outputs/`

## Data Model
See [src/useAppData.js](../src/useAppData.js#L8-L21) for `DEFAULT_STATE`:
```javascript
{
  screen, name, incomeSources, fixedExpenses, savingsPlans, futurePayments,
  loans, creditCards, categoryBudgets, recurringExpenses, assets,
  allExpenses: { "YYYY-MM": [{id, date, category, amount}] },
  checkIns: []
}
```

**Key Calculations**:
- **EMI (loan)**: `calcEMI(principal, rate, tenure)` uses reducing-balance formula
- **Daily Limit**: `calcDailyLimit(remaining)` = remaining budget ÷ days left in month
- **Monthly Reserve**: `calcMonthlyReserve(payment)` for future payments (yearly/quarterly/half-yearly)
- **Financial Snapshot**: Income − Fixed − Savings − Reserve − Loan EMI = Remaining

## Component Patterns

### Top-Level Routing
[src/App.jsx](../src/App.jsx#L1-L100): Conditional render by `screen` state (onboarding, main, etc.). ErrorBoundary wraps entire app.

### Reusable UI Patterns
- **Color Palette**: Defined in component constants (`const C = {ink, muted, border, ...}`)
- **Inline Styling**: All CSS objects, no CSS files except global [src/App.css](../src/App.css)
- **Card Components**: `SectionCard` pattern in [src/FinancialPlan.jsx](../src/FinancialPlan.jsx#L18-L43) (header + body auto-height)
- **Icon Maps**: Category icons as emoji (🍽=Food, 🏦=Loan, etc.) defined near component usage
- **Responsive Grid**: 2-col mobile → 3-4 col desktop via CSS media queries

### Tab Navigation
Tabs managed by local state; each tab lazy-loads / memoizes heavy components (e.g., `SpendingChart`, `MonthCloseReport`).

## Critical Workflows

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (localhost:5173)
npm run build        # Build for production (outputs dist/)
npm run lint         # ESLint check
```

### Mobile Builds
- **Android**: `./gradlew assembleRelease` (requires Android SDK, NDK in PATH)
- **iOS**: `xcode-build` or open [ios/App/App.xcodeproj](../ios/App/App.xcodeproj/) in Xcode
- **Capacitor Sync**: `npx cap sync` to copy dist/ → native platforms

### Testing Auth Flows
- **Web/Android**: Google & Apple popups work normally
- **Native iOS**: Apple Sign In via Capacitor plugin; Google blocked (design choice)
- **Guest Mode**: Available on web/Android; stores data locally until first login

## Key Conventions & Patterns

### Naming
- **Hooks**: `use*` prefix (`useAppData`, `useFirestoreSync`, `useStreak`)
- **Components**: PascalCase (e.g., `BudgetDashboard`, `CategoryBudgets`)
- **Utilities**: camelCase, often exported from hooks (e.g., `calcEMI`, `calcDailyLimit`)
- **State Keys**: Descriptive prefixes (`screen`, `allExpenses`, `categoryBudgets`)

### Error Handling
- Firestore/localStorage failures logged, not thrown (graceful degradation)
- App-level ErrorBoundary catches React errors → clear recovery UI with "Clear Data & Reload"
- No error alerts; silent fallbacks encourage local-first caching

### Date Handling
- **Format**: ISO 8601 strings (`"YYYY-MM-DD"`)
- **Month Keys**: `YYYY-MM` for grouping expenses (`allExpenses[monthKey]`)
- **Month Arithmetic**: Use `new Date()` with `.getFullYear()`, `.getMonth()`, `.getDate()`
- **Timezone**: Assumes user-local time; midnight via `.split("T")[0]`

### Firestore Structure
- **Doc**: `users/{uid}` with fields: `data` (JSON string), `email`, `phoneNumber`, `displayName`, `photoURL`, `updatedAt`
- **Security**: Assumes Firebase rules allow authenticated users to read/write own docs
- **Schema**: Non-normalized (all expense/budget data in single JSON string for simplicity)

## Integration Points

### Firebase Config
[src/firebase.js](../src/firebase.js): Hardcoded config for `money-coach-aaa8c` project. Auth & Firestore initialized as `auth` and `db` exports.

### Capacitor Config
[capacitor.config.json](../capacitor.config.json): App ID `com.turingsxyz.moneycoach`, name "Money Coach", webDir `dist`.

### ESLint
[eslint.config.js](../eslint.config.js): React hooks recommended rules, React refresh plugin (Vite HMR). No TypeScript; allows unused uppercase variables.

## Common Dev Tasks

**Add a new expense category**: Update `VARIABLE_CATS` or `RECURRING_CATS` arrays in [src/App.jsx](../src/App.jsx) with `{name, icon}` objects.

**Calculate new financial metric**: Extend [src/useAppData.js](../src/useAppData.js) with `export function calc*()` helper; use in components via hook.

**Sync new field to Firestore**: Add to `DEFAULT_STATE` → auto-serialized by `saveToFirestore()`, auto-loaded by `loadFromFirestore()`.

**Cross-platform style issue**: Check responsive breakpoints (480px, 600px, 860px) in component inline CSS; test in browser DevTools + native webview.

## Notes for AI Agents
- Preserve localStorage key `moneyCoachData_v3` in migrations; older keys (`_v2`, `_v1`) are auto-cleared on new user login
- EMI and future payment calculations must account for edge cases (overdue, zero rate, etc.); see comment blocks in [src/useAppData.js](../src/useAppData.js#L71-L88)
- Firestore schema is flat JSON; no nested queries. Add indexing if filtering on multiple fields
- iOS native auth differs from web; use `isNativeIOS` flag in [src/AuthScreen.jsx](../src/AuthScreen.jsx#L9-L17)
