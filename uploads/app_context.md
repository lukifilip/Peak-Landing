# Peak — App Context (Single Source of Truth for LLMs)

> **Purpose.** This is the cold-start context document for any LLM (or developer) joining the Peak
> project. Read it in full before making changes. It is written to be **self-contained** — it fully
> supersedes the old `app_llm_briefing.md` (which is now retired; its intentional-decisions and
> terminology have been folded in here).
>
> **Companion files (read when relevant):**
> - `company_projects_redesign_plan.md` — the implemented redesign of the company project lifecycle.
>   Authoritative for that subsystem. (Note: it uses *planning* field names — see §11.4 for the real ones.)
> - `portfolio_redesign_implementation_plan_v2.4.md` — the implemented (Phases 1–7) portfolio redesign.
>   Authoritative for the portfolio; its §10 holds the visibility/edge-case data rules. Phase 8 (public
>   link) is not started.
> - `app_style_guide.md` — authoritative visual language (colours, radii, typography, shadows). NOTE:
>   it says "one soft shadow", but the app in practice floats white cards on grey with **no** shadow.
> - `skill_learning_implementation_plan.md` — detail on the Skill Hub / learning subsystem.
> - `all_skills.dart` — the live skill catalog (skills, categories, colours, tags).

---

## 1. What the App Is

**Peak** is a mobile app (repo: `titan_app_reborn`) combining two interconnected pillars:

1. **A skill-learning platform** — users learn in-demand digital skills through AI-generated, heavily
   curated learning paths, with real-world applicability at the center of every decision.
2. **A professional network** — users build a verifiable public portfolio, create/join companies,
   collaborate on projects, post and apply for open roles, and message each other.

Skills earned and verified in the app become a **credentialing system** that companies and
individuals can trust when hiring or collaborating. **The app's central purpose is: learn skills →
build a verifiable portfolio.**

---

## 2. Platforms & Codebases

Two **separate codebases that share one backend, databases, and data model** but have different
style layers / native UI:

| Platform | Codebase | Store | Notes |
|---|---|---|---|
| **Android** | Flutter / Dart | Google Play Store | The Flutter project. |
| **iOS** | Swift / SwiftUI | App Store | The native iOS project. |

Both are live. File names in this doc (e.g. `learn.dart`) are the **Flutter/Dart** files; the Swift
project mirrors the same screens/flows with native UI. **"Continue with Apple" sign-in exists only on
iOS.**

---

## 3. Core Philosophy

- **Skills are earned, not self-reported** — level reflects completed work, not claims.
- **Built on user integrity** — anti-cheat is intentionally **not** a priority (§13).
- **High-demand digital skills** with real-world applicability.
- **Quality over quantity** — content passes multi-metric filters before inclusion.
- **Core moat: the verified activity trail** — what a user built, when, at what level. This is what
  LinkedIn cannot replicate and what makes the platform valuable for hiring.

---

## 4. Tech Stack

- **Frontend:** Flutter/Dart (Android) and Swift/SwiftUI (iOS) — two codebases, one backend.
- **Backend:** Firebase (Auth, Cloud Firestore, Cloud Functions, Cloud Storage) + Supabase
  (learning-content store).
- **AI pipeline:** Gemini (scraping, source scoring, image gen) and Claude Sonnet/Opus (content
  structuring, documentation, summaries, stats). Runtime AI helpers via Cloud Functions (e.g.
  `detectProjectTools`, `detectProjectType`).
- **Cross-cutting services:** `AnalyticsService` (event tracking throughout), `RewardService`
  (rewards unlocked at streak milestones), `StreakService` (see §12.3).
- **Payments (planned):** Revolut API.

---

## 5. Data Architecture

Fundamental split: **progress and gating live in Firestore; learning content lives in Supabase.**

### Firebase Auth
Identity (email/password, Google, Apple-on-iOS).

### Cloud Firestore — all user & app state
- `user_skill_progress/{uid}_{skillId}` — per-skill progress (`levels[]`, `current_level`,
  `unlocked_levels[]`, `expert_points`, `practice_mode_projects[]`, `overview_completed`, per-stage
  counts, etc.).
- `streaks/{uid}` — daily streak; holds a `streaks` map incl. `last_action_timestamp` (§12.3).
- `users/{uid}` — `skills[]`, `skill_progress[]`, `recent_skill`, profile, company links, plus
  portfolio curation: `headline` (string, blank = computed default) and `open_to_collaborate` (bool).
- `company/{companyId}` — company doc, with subcollections:
  - `members/{uid}` — membership + `role` (`officer|manager|employee`), `joinedAt`, and `leftAt`
    (stamped on fire/leave; the doc is KEPT for history — active rosters filter `leftAt == null`).
  - `projects/{projectId}` — **single source of truth for projects** (§11). A legacy `projects[]`
    array on the company doc has been migrated away.
  - `applications/{...}` — open-role applications (carry a `status`, e.g. `pending`).
- `project_chats/{projectId}` — project / company group-chat docs (`participants`, etc.).
- `portfolios/{uid}` — canonical portfolio store (doc id = uid), created at signup (§12.1). Holds the
  compacted arrays `skill_projects[]`, `practice_projects[]`, `assigned_projects[]` plus, since the
  v2.4 redesign, server-computed fields: per-entry `credibilityScore` + `entryUid`; doc-level
  `featuredIds[]` (≤3), `featuredPinned` (user-owned), `featuredSuggestionId`,
  `dismissedSuggestionIds` (user-owned), `affiliations[]` (verified-tenure rollup per company),
  `hiddenCompanyIds[]` (user curation), `scoringSignature`, `scoredAt`.
  - `entry_private/{projectId}` — **gated deliverables payload** for assigned entries
    (`{deliverables[], deliverable_count, public}`). Kept out of the world-readable portfolio doc;
    rule: readable only by the owner or when `public == true` (deliverables are private by default,
    §12.1). The inline assigned entry carries only the non-sensitive `deliverable_count`.

### Supabase — all learning *content*
Read through the `fetchSupabaseData` Cloud Function: `skill_overviews`, `levels`,
`level_components`, `level_tasks`, `level_projects`, `level_summaries` (+ planned `glossary`).

### Cloud Functions (key ones)
- `fetchSupabaseData` — generic Supabase reader.
- `detectProjectTools`, `detectProjectType` — AI detection at project create/edit.
- `payoutProject({cid, projectId})` — secure project-completion/payout handler (called on review
  approval; must be preserved).
- `completeProject({cid, projectId})` — on overseer approval, enriches each worker's portfolio
  assigned entry to `done` (credential `public: true`, §12.1) and writes its deliverables to the
  gated `portfolios/{uid}/entry_private/{projectId}` subcollection.
- `recordActivity` — records a streak action for the current user (§12.3).
- `recordActivity` aside, team mutations are server-side: `fireMember({cid, targetUid})` and
  `leaveCompany({cid})` both stamp `leftAt` (keeping the member doc); `promoteMember`, `hireApplicant`,
  `declineApplicant`, `dissolveCompany`.
- **Portfolio scoring (v2.4):** `scorePortfolioOnWrite` — Firestore trigger on `portfolios/{uid}`
  that recomputes every entry's `credibilityScore`, the default `featuredIds`, the suggestion, and
  the `affiliations` rollup (deterministic, no AI; loop-guarded by a `scoringSignature`). One-time
  admin backfills: `backfillPortfolioScores`, `backfillPortfolioDeliverables` (also runnable via the
  standalone `functions/scripts/portfolio_v24_migration.js`).
- TTS audio fetch, and others.

### Cloud Storage
File uploads: project reference files (`project_references/{companyId}/{projectId}/...`), project
deliverables (`project_deliverables/{companyId}/{projectId}/...`), chat attachments, profile images.

---

## 6. Authentication & Onboarding

1. **Welcome (`welcome_page.dart`)** — logo, welcome text, **Sign up** / **Log in** CTAs.
2. **Sign up:** **Pre-signup (`pre_signup.dart`)** → method choice (*email* / *Google* / *Apple,
   iOS only*) → **Sign up (`signup.dart`)** (email + username + password) → **email verification
   page** (verification email via a 3rd-party provider to avoid spam; clicking the link verifies the
   email, creates the account, enters the app; includes a **Resend email** button).
3. **Log in:** **Pre-login (`pre_login.dart`)** → method choice → **Login (`login.dart`)**
   (email/username + password). Includes **Forgot password** (emails a reset link).

---

## 7. Global UI Patterns (shared across all main pages)

Every main page has a **header**:
- **Left:** page title text (on Workspace this title is *clickable* — §10.4).
- **Right:** **Chats** button → `chats.dart` (all conversations) and **Profile** button →
  `my_profile_page.dart` (current user's own profile).

Beneath the header, each page shows a **search bar**, a **tab bar**, or **category/filter pills**.
Pages with a search bar place a **filter/category button** beside it; tapping it **contracts the
search bar and expands into filter/category pills** (skill categories on Learn; skills on Network).

**Search is per-page (current design):** Learn searches skills, Network searches users, Explore
searches open roles & companies. A unified dedicated search page is a *possible future* addition, not
current.

**Visual language** is authoritative in `app_style_guide.md`. Quick reference: native-iOS feel; app
background `#F5F5F7`, white surfaces `#FFFFFF`; single blue accent `#0A84FF` (legacy `#007AFF` being
migrated out); secondary text/icons `#8E8E93`; status success `#34C759`, error `#F74545`, gold
`#F3C444`; cards radius `25`; exactly one soft shadow. Don't invent new colours, blues, or shadows.

---

## 8. Messaging & Sharing

### Chat types (all surfaced in `chats.dart`)
- **Private chat (`private_chat.dart` + widgets/services)** — 1:1: messages, reactions, replies,
  images, videos, files.
- **Project chat (`project_chat.dart` + widgets/services)** — group chat tied to a project. Created
  in the backend on project creation; users join its `participants` when they **accept** assignment.
- **Company chat** — uses the **same `project_chat.dart` group-chat surface** as an all-company group
  chat (mostly announcements/general). Accessed from the **Team tab** ("Enter groupchat").

### Share feature (in-app, tailored)
Share **skills, open roles, profiles, a whole portfolio, or a single portfolio piece** into any chat.
Implemented as typed shared-object messages (`MessageType` + `payload`, see `chat_models.dart`):
`skill`, `role`, `profile`, and `project`. The `project` type is portfolio-related — `{ownerId}`
shares the **whole portfolio**, `{ownerId, portfolioProjectId}` shares a **single verified piece**;
both deep-link to the owner's portfolio. Components: **share buttons** on the Skill Hub
(`skill_progress.dart`), application page (`application.dart`), user profile (`user_profile_page.dart`),
the portfolio header (`share_portfolio_popup.dart` → "Send in a chat" / Image / PDF), and each
portfolio detail page; a **share service** (`share_service.dart`); and the **share sheet
(`share_sheet.dart`)** listing all conversations. The shared item renders in-chat as a **clean custom
container** (`shared_object_card.dart`), not raw text.

The portfolio can also be **exported**: a template-driven **PDF** (`portfolio_pdf_service.dart`) for
recruiters/applications, and a single clean summary **image** (`portfolio_image_service.dart`) for
social. All formats — in-app card, PDF, image — render from one canonical `PortfolioSnapshot`
(§12.1), so they never drift (v2.4).

---

## 9. Skill Learning System

### 9.1 Content pipeline
1. **Scraping** — per-skill info via Gemini; sources scored on quality (>7/10), relevancy,
   real-world applicability, recency.
2. **Structuring** — Claude (Sonnet/Opus) structures plans and writes all docs/explanations/
   summaries/stats.
3. **Visuals** — Gemini lightweight model for images; Claude for graphs/stats.
4. **Projects** — real projects from public repos (GitHub, etc.), same multi-metric filtering.

### 9.2 Learning path structure
**Five levels:** Novice → Beginner → Intermediate → Advanced → Expert. Each level has **three
stages**, completed in order:
- **Components (`skill_components.dart`)** — structured reading/learning content.
- **Tasks (`skill_tasks.dart`)** — short interactive challenges (sorting, writing, AI roleplay,
  drag-and-drop, code fixing, ordering, etc.).
- **Projects (`skill_projects.dart`)** — 1–3 real-world applied builds that gate the level; where
  knowledge is tested for real.

`skill_levels.dart` handles level completion/unlock. Early levels are easier / more AI-solvable;
higher levels are harder and more practical, so the credential gets more meaningful with depth.

### 9.3 The Skill Hub (`skill_progress.dart`)
Conceptually the "Skill Hub"; the file is `skill_progress.dart`. Home base for a started skill:
share button; the per-level **path**; revisit/redo any past component/task/project; **level recaps**;
a **glossary** card (*not yet fully built* — will hold terms/abbreviations learned and summaries per
section/level); and a **Start Learning / Continue** CTA into the learning plan. Uses a
pull-to-stretch hero banner (the same behaviour mirrored by `playground.dart`).

### 9.4 The learning flow (current)
1. **Tap a skill on Learn.** If not started, the **skill overview sheet (`skill_overview_sheet.dart`)**
   slides up (what it is, why learn it, what you'll achieve, requirements). **Nothing saved yet.**
2. **Tap "Start"** → skill is **committed** (progress doc created, added to profile) → enters the
   **Skill Hub** at **Novice → Components**.
3. Components → Tasks → Projects, progress saved to Firestore at each step.
4. **Celebrations**, tiered by effort:
   - **`inline_celebration_sheet.dart`** — lightweight inline sheet for: all components of a level
     completed, a task completed, **and a task answered incorrectly**.
   - **`celebration_projects.dart`** — full celebration for **skill projects**.
   - Full-screen milestone pages for level/skill completion.

### 9.5 Completion, expert badge & practice projects
Completing all five levels: awards an **Expert badge** (visible app-wide as a verified credential),
unlocks **expertise points**, and unlocks **practice projects (`skill_completed.dart`)** — projects
completed for extra expertise points and continued practice.

### 9.6 Skill catalog (`all_skills.dart`)
Served at runtime by `SkillCatalogService.skills` (with `bundledSkills` in `all_skills.dart` as the
bundled fallback). Each `Skill`: `skillId`, `name`, `requirements?`, `icon`, `color`, `banner`,
`firstTag`, `secondTag`, `categories`.

**Categories** (a skill may have several): `build & secure`, `grow & lead`, `impact & influence`
*(category set expected to be revised)*.

**Available now (16):** Python, SEO, Content marketing, Prompt Engineering, Digital Marketing,
Personal Branding, AI for Productivity, Personal Finance, Public Speaking, JavaScript, React.js,
Project Management, Business Analytics, Machine Learning, Cybersecurity, Cloud Computing.

**Coming soon (14):** Generative AI, Data Analytics, Content Creation, Social Media Marketing,
Copywriting, Video Editing, UI/UX Design, Leadership, Emotional Intelligence, No-Code Development,
Sales Skills, Storytelling, Freelancing, Responsible AI.

---

## 10. Main Navigation (four tabs + shared header)

Four first-level pages share **one bottom nav (four tabs)**. **Profile and Chats are header buttons,
not tabs** (§7).

### 10.1 Learn (`learn.dart`) — learning home
Browse all skills + "coming soon" skills; **search** skills with a **filter button** that swaps in
**category pills**; a large **"Continue Learning" card** resuming the most recent skill. Tapping a
skill opens the **skill overview sheet** (§9.4).

### 10.2 Network (`network.dart`) — people / collaboration hub
Two sections (official titles):
- **Similar Learners** — users learning the same skill(s) **and at the same level**. Purpose:
  community / "not doing this alone" / collaboration.
- **Skill Experts** — users with an **Expert badge** in skills you're learning. Purpose: drive Expert
  badges and make talent easy to find.

**Search** finds **users by username**; the **filter button** swaps in **skill pills** to filter
peers/experts by a specific skill. Tapping a user → **`user_profile_page.dart`** (their info, skills,
companies; DM them; view portfolio).

### 10.3 Explore (`explore.dart`) — companies & open roles
Browse **open roles** and **companies**; browse categories; **search** companies/roles. Tapping an
open-role card → **`application.dart`** (role title/description/requirements; write a cover
letter/note; attach files like external portfolio/CV; send). Tapping a company card →
**`explore_overview.dart`** (name, logo, mission, completed-projects count, members count, active
open role(s) to apply to when requirements are met).

### 10.4 Workspace (`workspace.dart`) — company section
Always **scoped to one company**, with a **company switcher** and **three tabs: Dashboard, Projects,
Team** (§11). Header specifics:
- **Clickable page title** — shows the current company name; opens a container to **switch companies**
  or **create a company**.
- **Options button (managers/officers only)** — **Edit company**, **View insights** (→
  `company_insights.dart`, §11.8), **Delete company**.

---

## 11. Workspace — Detailed

### 11.1 Company roles
- **Employee** — default; works on assigned projects, submits deliverables; sees only their own work.
- **Manager** — creates/assigns projects, posts open roles, sees company-wide project/people data;
  **no financials**.
- **Officer** — creator's role; all manager rights **plus financial insight, manager management, and
  override** on any project (safety valve for orphaned/departed-manager projects).

Role-based views are **intentionally scoped** — never leak higher-role content to a lower role (§13).

### 11.2 Dashboard tab
- Mission statement, completed-projects count, total members count.
- **Leaderboard** — top 3 employees by completed-project count; **refreshes monthly**. The #1 at
  month-end gets an **Employee of the Month** badge and a profile card **highlighted across the
  Workspace tabs**.
- **Assigned Projects** — projects the user was **invited** to; **Approve / Deny** each here.
- Page title = company name (clickable switcher / create company; §10.4).

### 11.3 Projects tab
Role-scoped:
- **Employees** see only **their assigned projects**.
- **Managers/Officers** see: projects they're part of, an **Active** section, an **Unassigned**
  section, and a **Pending Review** section. The **"Projects" title** → **`workspace_projects_all.dart`**
  (all company projects; managers/officers only).
- Floating **"Create project"** widget (above bottom nav) for managers/officers →
  **`create_project.dart`** (§11.5).

### 11.4 Project lifecycle, roles & data model
**Source of truth:** `company_projects_redesign_plan.md` (implemented). Helper:
`company_projects_repo.dart`. Projects live at `company/{companyId}/projects/{projectId}`.

**Two project-level roles** (distinct from company roles):
- **Captains / Overseers** — creator + any managers/officers added to oversee. They assign workers,
  review submissions, edit/delete the project. **Data field: `captains`.**
- **Members / Workers** — do the work, deliver, and receive the completed project on their portfolio.
  **Data field: `assigned_users[]`.** A person can be both.

**Canonical status set:** `unassigned → backlog → doing → pending_review → denied → completed`.
```
create ──► unassigned ──(overseer invites workers)──► backlog
backlog ──(worker approves)──► doing
doing ──(worker submits)──► pending_review
pending_review ──(overseer approves)──► completed
pending_review ──(overseer denies + review_note)──► denied ──(worker resubmits)──► pending_review
```

**Brief + deliverables checklist = the spine.** The checklist tells the worker what to deliver, gives
the reviewer an objective list, and defines what the delivery surface captures. Real work happens in
external tools (Figma/VS Code/Docs); the app captures the resulting **artifacts and links** against
the checklist and turns the result into a portfolio entry.

**Definitive project document field names (as written by current code — use these, keep read-time
shims for old docs):**
- `title` (a.k.a. `name`), `description`, **`project_plan`** (the *brief*).
- `created_by`, `created_at`.
- **`captains`** (the *overseers*; entries `{id, employee_approved, role}`).
- `assigned_users[]` (workers; entries carry `employee_approved`, `role`, and per-user status
  `invited|approved|denied`).
- `skills_needed[]` (AI-detected), `tools_needed[]` (`{name, url, icon}`, AI-detected; also used as
  return-path "paste your result link" slots).
- `deliverables[]` — `{id, title, type(link|file|image|text), required, submitted, approved}`.
- **`added_files`** (manager-attached *reference files*; `{name, url}`).
- `writeup` (worker's submission note; replaced the retired freeform `workspace[]` blocks).
- `type` (AI-detected), `deadline_date?`, `deadline_time?`, `review_note?`, `status`, `completed_at?`.

> **Definitive naming (confirmed):** the live names are **`captains`**, **`project_plan`**, and
> **`added_files`**. The redesign plan's `overseers` / `brief` / `reference_files` are *planning-doc
> terms only*; do not rename the code to match the plan. Add new fields, don't rename without a shim.

**Portfolio writes:** canonical store `portfolios/{uid}.assigned_projects[]`. Entry created when a
worker **approves** an invite (`backlog`), moves to `review` on submit, and is enriched to `done`
**only when an overseer approves** (`completeProject` adds `completed_at`, `company_name`,
`deliverable_count`, and the verified-credential `public: true`). The links-only **deliverables
summary goes to the gated `entry_private/{projectId}` subcollection** (private by default, §12.1), not
inline. No worker-self-complete path. Approval calls `payoutProject`.

### 11.5 Create project (`create_project.dart`)
Single page (also edit mode): name + description, then an **accordion** of optional sections —
**Project plan** (brief; `project_plan.dart` sheet), **Deliverables** (checklist editor;
`project_deliverables.dart` sheet), **Members** (`add_members.dart` sheet with two tabs: **Captains**
= officers/managers eligible to oversee; **Members** = all members, employees first), **Deadline**
(`add_deadline.dart` sheet, optional date/time), **Add files** (reference files → Storage). Saves the
project **document** to the subcollection, creates/keeps `project_chats/{projectId}`, and runs AI
detection (`detectProjectTools`, `detectProjectType`) only when name/description changed. Creator is
the **locked overseer**.

### 11.6 Project delivery & submission (`playground.dart`)
The **single project page** (replaced and retired `pre_workspace.dart` + `company_workspace.dart`).
One page where a worker understands the brief, fills the checklist, and submits — and where an
overseer manages the project. Contents:
- **Hero banner** (pull-to-stretch) + title block + **status chip**.
- **Denial feedback** shown prominently when `status == denied` (the stored `review_note`).
- **Brief card** (reads `project_plan`, tolerates legacy `brief`).
- **Tools card** (`tools_needed`) — each tool opens externally via `url_launcher` (return-path).
- **Deliverables** — rendered through the **shared `DeliverablesView` widget** (so the worker's
  *editable* surface and the reviewer's *read-only* surface can't drift). Worker fills each slot
  (paste link / attach file or image / text); files upload to Storage.
- **Additional files** + a **writeup** note.
- **Submit for review** — the worker's terminal action (→ `pending_review`). The surface is editable
  only while `doing` or `denied`, and **locks** once `pending_review`/`completed`. Only an overseer
  can set `completed` (on the review page). Working changes autosave to the project doc.
- **Overseer affordances:** an options menu (**Edit** → `create_project.dart`, **Assign** →
  `company_projects_assign.dart`, **Delete** → `company_projects_delete.dart`), gated by
  `captains.contains(uid) || role == officer`. Project chat is reachable from here.

### 11.7 Review (`review_projects.dart`)
The updated/renamed old `company_home_queue.dart`. Overseers review submitted deliverables
(read-only `DeliverablesView`) and **approve** (→ `completed`; calls `payoutProject`; enriches the
portfolio entry to `done`) or **deny with a `review_note`** (→ `denied`, resubmittable).

### 11.8 Company insights (`company_insights.dart`)
Opened from the Workspace Options menu ("View insights"). Takes `isOfficer`. Sections:
- **Projects Overview** — Completed / Ongoing / Unassigned project counts.
- **Team & Skills** — **Top skills** ranking computed across members.
- **Hiring Pipeline** — **Applicants** count (pending `applications`) and **Open roles** count.
- **Financial Insights (officer-only)** — currently a **"Coming Soon"** card: revenue, payouts,
  costs & ROI will appear once the company registers as a business (unlocks payments + full financial
  analytics). This is the financial layer officers will eventually see.

### 11.9 Team tab
- **"Enter groupchat"** → the **company chat** (§8).
- **Recents** — recent conversations with members; **"See all in inbox"** → `chats.dart`.
- **Members by role**: **Officers**, **Managers**, **Employees**; tap to DM.
- **Managers/officers:** **Applicants** card (→ all applicants) and **Open Roles** card (→ active
  roles, each with applicant count).
- The **"Team" title** → **`workspace_team_all.dart`** (all members).
- Floating **"Create role"** widget (above bottom nav) for managers/officers → **`create_role.dart`**.

### 11.10 Create role (`create_role.dart`) & applications
Managers/officers create an **open role**: title, description, **skill + skill-level requirements**
(applicants must meet to apply), **activity/duration** (forever, 1 month, 1 week, etc.). The role
shows on **Explore** with skill-based matching. Users apply via **`application.dart`** (cover letter +
attachments); managers review the applicant's profile/portfolio → approve (joins as employee) or
decline.

---

## 12. Profile, Portfolio, Streaks & Notifications

### 12.1 Profile (`my_profile_page.dart`) & Portfolio (`portfolio.dart`)
The current user's public profile (header Profile button) surfaces: skills + levels/badges, companies
they belong to, general info, **portfolio**, **inbox**, **streaks**, and **settings**. Other users'
profiles render via `user_profile_page.dart`.

**Portfolio (`portfolio.dart`) is the heart of the app** (learn skills → build a portfolio). The v2.4
redesign reframed it from a stats dashboard into **a credible body of verified work that wins
opportunities**, work-first and verification-loud, ordered by a deterministic **credibility score**
(verified company work → practice projects / expert badges → skill projects). It is **great by default
with zero input**; curation only overrides smart defaults.

**Read-view structure (top → bottom):**
1. **Identity cap** — avatar, name, one-line **headline** (default = furthest expert badge or top
   skill, never blank), and an **"Open to collaborate"** badge when enabled.
2. **Featured** — 1 piece = full-width hero; 2–3 = peeking snapping `PageView` carousel + page dots.
   The featured (verified) piece shows the **banner of the company** it was made for.
3. **Slim summary strip** — inline counters (Verified / Badges / Practice / Skill), each tappable.
4. **Experience** — verified work grouped by **company** (logo, role, tenure, "n verified projects"),
   drilling into that company's projects (`portfolio_company_projects.dart`).
5. **Expertise** — expert-badge pills + "+ n practice projects at expert level".
6. **Skill projects** — lowest weight, "learning proof".

**Owner vs viewer:** one page, two modes (gated by `_isOwnProfile`). The owner gets a header **Edit**
button and a viewer gets a prominent **Message** button; viewers never see owner controls, private
entries, hidden companies, or activation prompts. **Empty/sparse states** are handled (a brand-new
owner sees a single "Start your portfolio" activation card into the learning flow; a viewer sees a
neutral note).

**Curation (`portfolio_edit_sheet.dart`, owner only):** headline, availability, **featured** selection
(max 3, reorderable, with the system suggestion marked), and per-company **show/hide**. The per-piece
**"what I did" note** + the per-entry **public/private toggle** live in context on each detail page,
not in the sheet.

**Canonical models (`models/portfolio_models.dart`):** `PortfolioEntry` (one shape for all three
kinds), `CompanyAffiliation` (verified tenure), and `PortfolioSnapshot` (the one model every share
format renders from). Shared card widgets live in `widgets/portfolio/portfolio_cards.dart`.

**Sub-pages / detail:**
- `portfolio_skills_all.dart` / `portfolio_practice_all.dart` / `portfolio_assigned_all.dart` —
  per-type "see all" lists.
- `portfolio_assigned_detail.dart` — a completed company project: verified credential + **deliverables
  loaded from the gated `entry_private` subcollection** (owner-editable note + deliverables
  public/private toggle).
- `portfolio_project_detail.dart` — a skill/practice piece (owner-editable note + per-entry
  public/private toggle).
- `portfolio_expert_badges.dart` — earned Expert badges.

**Visibility (§10 defaults of the redesign plan):** skill/practice projects and assigned **credentials**
are **public by default**; assigned **deliverables** are **private by default** (gated in
`entry_private`); company affiliations are public but **hideable** (owner). The `isPublic()` helper in
`portfolio_models.dart` is the single check (honours the legacy `activity == 'public'` shim). Deliverable
privacy is enforced at the data layer (security rules); owner-hidden individual entries / companies are
currently UI-enforced only (single-doc limitation).

**Export/share:** see §8 — in-app card, PDF (`portfolio_pdf_service.dart`), and image
(`portfolio_image_service.dart`), all rendered from `PortfolioSnapshot`.

### 12.2 Inbox vs. Chats
- **Inbox** (from the profile) = **in-app notifications** about events (e.g. a submitted project
  entering review, denied, or completed).
- **Chats (`chats.dart`)** = actual conversations (private / project / company).

### 12.3 Streaks (`streaks.dart`, `streak_service.dart`)
A daily streak, with a dedicated **`streaks.dart`** page (from the profile). When earned, a
**floating widget appears at the top of the screen** (no longer shown on celebration pages).

Mechanics (`StreakService`): a streak action is recorded via the **`recordActivity` Cloud Function**,
then `RewardService.checkAndUnlockRewardsForUser` runs (rewards unlock at milestones) and analytics
sync. Data lives at `streaks/{uid}.streaks` with `last_action_timestamp`. A user can earn **at most
one streak per calendar day (UTC)**.

A streak is earned when the user completes:
- a **skill task** (`skill_tasks.dart`),
- a **skill project** (`skill_projects.dart`),
- a **practice project** (`skill_completed.dart`),
- or when an **assigned/company project is approved by a captain** (`review_projects.dart`).

### 12.4 External (device) notifications
Push notifications: reminders to continue learning after some time, and event notifications (new
message; project approved / submitted / denied; etc.).

---

## 13. Intentional Design Decisions (Do Not Change Without Discussion)

1. **No anti-cheat (intentional).** Cheaters gain nothing (no real skill); companies spot fakes fast;
   robust anti-cheat is costly and worsens honest-user UX. Don't add it unless explicitly approved.
2. **Company section is free (intentional, temporary).** No paywalls/payment prompts there without
   explicit instruction. Monetization is planned, not yet designed.
3. **Credential = completed projects, not time or quizzes.** Project completion gates level advance.
4. **Project & company chats are auto-created.** Project chat created on project creation; workers
   join on accepting assignment. Keep automatic.
5. **Role-based views are intentionally scoped.** Employees → own work; managers → company-wide
   project/people data; officers → also financials. Never leak higher-role content downward.
6. **Project ownership is overseer-based.** Managers are scoped to projects they oversee plus a
   read-only all-company view; officers override. Don't revert to "every manager sees/edits all."

---

## 14. Matching & Recommendation

- **Role discovery** — users are recommended open roles on Explore based on the skills they're
  learning/completed and their level (the platform's core advantage for companies).
- **Applicant ranking (planned)** — AI ranks applicants by in-app profile, level, project history.
- **Future signals** — project complexity, recency of activity, pay expectations.

Current algorithm is **functional but basic**; improvements planned post-launch.

---

## 15. Strategic Context (for prioritization)

- **Primary focus now:** learners / individual users. Company acquisition is secondary until the
  talent pool is valuable to companies.
- **Growth strategy:** grow learners first, then use that pool to attract companies. Don't build
  company features that outpace the user base.
- **Content flywheel:** learn → complete projects → build portfolio → get discovered → get hired →
  complete company projects → portfolio grows. Every feature should strengthen a link.

---

## 16. Planned / Future Features

- **Pay estimates on roles** (Revolut API; optional, labeled; post-payment infra).
- **Financial insights** for officers (revenue, payouts, costs, ROI) once a company registers as a
  business — currently "Coming Soon" in `company_insights.dart`.
- **Community / content feed** — algorithm-driven feed to grow daily engagement before pushing hiring
  harder (home-page redesign; not started).
- **Workspace settings page** — known gap (leaderboard toggle, permissions, notifications,
  visibility, branding).
- **Learning hub additions** — finish the glossary; level recaps + relevance; navigable curriculum.
- **Unified search page** — possible future consolidation of the current per-page search.
- **Project subsystem nice-to-haves** (from the redesign plan, unscheduled): "Request to oversee";
  reassignment on overseer departure; richer submission/lifecycle notifications.

---

## 17. Key Pages / Files Reference

| File | Purpose |
|---|---|
| `welcome_page.dart` | Entry: logo, Sign up / Log in. |
| `pre_signup.dart` / `pre_login.dart` | Auth method choice (email / Google / Apple-iOS). |
| `signup.dart` / `login.dart` | Email signup / login (login has Forgot password). |
| `learn.dart` | Learn tab — skills home, search, categories, Continue Learning. |
| `skill_overview_sheet.dart` | Bottom sheet previewing a skill before it's started. |
| `network.dart` | Network tab — Similar Learners & Skill Experts; user search; skill filters. |
| `explore.dart` | Explore tab — companies & open roles. |
| `explore_overview.dart` | Company detail page (from Explore). |
| `application.dart` | Open-role application: cover letter + attachments. Has a share button. |
| `workspace.dart` | Workspace tab — Dashboard / Projects / Team; company switcher; options. |
| `workspace_projects_all.dart` | All company projects (managers/officers). |
| `workspace_team_all.dart` | All company members. |
| `company_insights.dart` | Company insights (Projects / Team & Skills / Hiring; Financials officer-only). |
| `create_project.dart` | Create/edit a project (brief, deliverables, members, deadline, files). |
| `company_projects_assign.dart` | Assign workers to a project (captains). |
| `playground.dart` | Project delivery & submission surface (replaced pre_workspace/company_workspace). |
| `review_projects.dart` | Submitted-project review (approve/deny); calls `payoutProject`. |
| `company_projects_repo.dart` | Project read/write helper (subcollection; status normalize). |
| `widgets/projects/deliverables_view.dart` | Shared deliverables widget (editable + read-only modes). |
| `create_role.dart` | Create an open role (skill/level requirements, duration). |
| `skill_progress.dart` | The Skill Hub for a started skill. Has a share button. |
| `skill_components.dart` / `skill_tasks.dart` / `skill_projects.dart` | The three stages per level. |
| `skill_levels.dart` | Level completion / unlock logic. |
| `skill_completed.dart` | Practice projects after Expert completion. |
| `inline_celebration_sheet.dart` | Inline celebration (components done, task done, task wrong). |
| `celebration_projects.dart` | Skill-project celebration. |
| `my_profile_page.dart` / `user_profile_page.dart` | Own profile / another user's profile. |
| `portfolio.dart` | The redesigned portfolio (identity / featured / Experience / Expertise / skill projects; owner-vs-viewer; export/share). |
| `models/portfolio_models.dart` | Canonical `PortfolioEntry`, `CompanyAffiliation`, `PortfolioSnapshot` + `isPublic()`/scoring helpers. |
| `widgets/portfolio/portfolio_cards.dart` | Shared portfolio card widgets (featured hero, mini card, verified line, page dots). |
| `widgets/portfolio/portfolio_edit_sheet.dart` | Owner curation sheet (headline / availability / featured / company visibility). |
| `portfolio_skills_all.dart` / `portfolio_practice_all.dart` / `portfolio_assigned_all.dart` | Per-type "see all" lists. |
| `portfolio_assigned_detail.dart` | Completed assigned-project detail: gated deliverables + note + deliverables public/private toggle. |
| `portfolio_project_detail.dart` | Skill/practice piece detail: note + per-entry public/private toggle. |
| `portfolio_company_projects.dart` | Experience drill-through — one company's verified projects. |
| `portfolio_expert_badges.dart` | Earned Expert badges. |
| `portfolio_pdf_service.dart` / `portfolio_image_service.dart` | PDF / image export, rendered from `PortfolioSnapshot`. |
| `streaks.dart` / `streak_service.dart` | Streaks page / streak recording service. |
| `chats.dart` | All conversations hub. |
| `private_chat.dart` / `project_chat.dart` | Private chat / project & company group chat. |
| `share_sheet.dart` / `share_portfolio_popup.dart` / `widgets/chat/shared_object_card.dart` | Share sheet / portfolio share popup / in-chat shared-object card. |
| `all_skills.dart` | Skill catalog model + bundled skills. |

---

## 18. Terminology Reference

| Term | Meaning |
|---|---|
| **Skill learning plan** | Full structured path for one skill, Novice → Expert. AI-generated, curated. |
| **Level** | Difficulty tier within a skill: Novice, Beginner, Intermediate, Advanced, Expert. |
| **Stage** | One of three parts within a level: Components, Tasks, Projects. |
| **Components / Tasks / Projects (learning)** | Reading content / interactive practice / gating real build. |
| **Skill points / expertise points** | Verified-competency points; expertise unlocks at Expert + via practice projects. |
| **Expert badge** | Awarded on completing all five levels of a skill. |
| **Practice project** | Post-Expert project for extra expertise points (`skill_completed.dart`). |
| **Skill Hub** | The skill's home base; the `skill_progress.dart` page. |
| **Skill overview sheet** | Bottom sheet previewing a skill before start (`skill_overview_sheet.dart`). |
| **Similar Learners / Skill Experts** | The two Network sections (peers at your level / experts in your skills). |
| **Project (company)** | A deliverable created by a manager/officer, worked by members. |
| **Captain / Overseer** | Project role: creator + managers/officers who assign & review. Data field: `captains`. |
| **Member / Worker** | Project role: does the work, delivers, gets it on their portfolio. Data: `assigned_users`. |
| **Deliverable** | A project checklist item `{title, type, required, submitted, approved}`. On approval the links-only summary is stored in the portfolio's gated `entry_private` subcollection. |
| **Brief / project plan** | Long project instructions. Data field: `project_plan`. |
| **Credibility score** | Deterministic per-entry score (no AI) that orders the portfolio and picks the default featured piece. Server-computed. |
| **Featured** | The ≤3 pieces leading a portfolio (`featuredIds`); auto by default, sticky once the owner pins (`featuredPinned`). |
| **Company affiliation** | Verified tenure at a company (role, dates, n verified projects), derived from real membership + completed projects — never self-claimed. Hideable, not editable. |
| **Headline / Open to collaborate** | Portfolio identity cap: a one-line `headline` (computed default) + an availability badge (`open_to_collaborate`). |
| **PortfolioSnapshot** | The one canonical model every share format (in-app card, PDF, image) renders from. |
| **Open role** | Public hiring posting by a company; on Explore; users apply. |
| **Leaderboard / Employee of the Month** | Monthly top-employee ranking on Dashboard + badge for #1. |
| **Officer / Manager / Employee** | Company roles (highest → default). Officer = creator, financials, override. |
| **Workspace** | The whole company section (`workspace.dart`) — Dashboard/Projects/Team. |
| **Playground** | The project delivery & submission page (`playground.dart`). |
| **Inbox** | In-app notifications on the profile (distinct from Chats). |
| **Chats** | All conversations (private / project / company), via `chats.dart`. |
| **Company chat** | All-members company group chat (uses the project-chat surface). |

> **Naming note:** "Workspace" once meant the old employee submission page (`company_workspace.dart`,
> retired). It now means the **entire company section (`workspace.dart`)**; the submission surface is
> **`playground.dart`**.

---

## 19. Known Gaps

- **Glossary** in the Skill Hub is not yet fully built.
- **Workspace settings page** does not exist yet.
- **Financial insights** are a "Coming Soon" placeholder (pending business registration / payments).
- **Skill categories** (`build & secure`, `grow & lead`, `impact & influence`) are expected to be
  revised.
- The **singular `portfolio` collection** is a deprecated orphan; the canonical store is plural
  `portfolios/{uid}`.
- **Portfolio v2.4 — pending ops:** the redesign (Phases 1–7) is implemented but needs (1) a
  `firestore.rules` deploy for the `entry_private` deliverables gate, (2) a functions redeploy for the
  `leaveCompany` `leftAt` fix, and (3) a one-time run of `portfolio_v24_migration.js` to apply the
  §10 public-by-default defaults + seed scores/featured/affiliations on existing data. Until the
  migration runs, *existing* skill/practice projects and assigned credentials stay `public: false`
  and read as private to viewers (new entries are already correct).
- **Portfolio data-layer privacy** is enforced for **deliverables** only (the `entry_private` gate).
  Owner-hidden individual skill/practice entries and hidden companies remain in the world-readable
  `portfolios/{uid}` doc (UI-filtered, not rule-gated) — an accepted single-document limitation.
- **Portfolio public link** (`peak.app/u/<username>`) — the redesign's Phase 8, not started; renders
  from the same `PortfolioSnapshot`.
- `app_llm_briefing.md` has been **retired** and fully folded into this file; it can be deleted.
