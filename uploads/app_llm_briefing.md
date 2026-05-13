# LLM Developer Briefing — Key Decisions, Terminology & Context

This file is intended for LLMs (or developers) who are being brought into this project mid-stream. It captures the *why* behind key decisions, defines terminology used throughout the codebase and design, and flags things that are intentionally left a certain way.

Read this alongside `app_context.md` (full app overview) and `app_todo.md` (to-do list).

---

## Terminology Reference

| Term | Meaning |
|---|---|
| **Skill learning plan** | The full structured learning path for a single skill, from Novice to Expert. AI-generated and curated. |
| **Stage / Level** | A difficulty tier within a skill learning plan (e.g., Novice, Beginner, Intermediate, Advanced, Expert). |
| **Skill points** | Points accumulated by completing stages within a skill. Represent verified competency. |
| **Project (learning)** | A practical project at the end of each skill stage that the user must complete to advance. Sourced from real public projects (GitHub, etc.). |
| **Project (company)** | A task/deliverable created by a manager or officer within the company section and assigned to employees. |
| **Open role** | A public hiring posting created by a company. Visible on the Discover page. Users can apply. |
| **Company Wall** | The monthly employee leaderboard inside the company section. Toggleable. |
| **Employee of the Month** | Badge awarded to the top-ranked employee on the Company Wall each month. |
| **Officer** | Highest role in a company. Has financial access and full management permissions. Company creator is auto-assigned this role. |
| **Manager** | Mid-level company role. Can manage projects and people but cannot see financial data. |
| **Employee** | Default role when joining a company. Focused on completing assigned work. |
| **Workspace** | `company_workspace.dart` — the page where an employee works on and submits a company project. |
| **Queue** | `company_home_queue.dart` — the review page where managers/officers approve or deny submitted projects. |
| **Project chat** | A group chat automatically created when members are assigned to a company project. Named after the project. |
| **Discover page** | The main page for finding companies, open roles, and applying. Also where companies can be created. |

---

## Intentional Design Decisions (Do Not Change Without Discussion)

### 1. No Anti-Cheat System (Intentional)
The platform does not currently implement anti-cheat for skill assessments or project submissions. This is a deliberate decision based on the philosophy that:
- Cheating exists in every learning and credentialing system.
- Users who cheat gain nothing — they won't have the actual skills.
- Companies will quickly identify fake credentials when working with someone.
- Building robust anti-cheat is costly and creates a worse UX for honest users.

**Do not add anti-cheat systems unless explicitly discussed and approved.** If revisited, see the `app_todo.md` for considered approaches.

---

### 2. Company Section Is Free (Intentional, Temporary)
The company section is entirely free during the current phase. Monetization is planned for the future but not yet designed. Do not add paywalls or payment prompts to the company section without explicit instruction.

---

### 3. Skill Credential System Is Based on Completed Projects, Not Time or Quizzes
Skill points and levels are earned through completing practical projects, not through time-based learning or multiple-choice quizzes. When building or modifying the skill progression system, ensure that project completion remains the gating mechanism for advancing to the next stage.

---

### 4. Project Chats Are Auto-Created (Intentional)
When members are assigned to a company project, a group chat is automatically created with all assigned members, named after the project. This is intentional — it removes friction from collaboration. Do not make this a manual step.

---

### 5. Role-Based Views Are Intentionally Scoped
Each role (employee, manager, officer) sees a meaningfully different version of the company pages. Employees see only their own work. Managers see company-wide project and people data. Officers additionally see financial data. When building or modifying company pages, always implement role-based content scoping. Never show an employee content meant for a manager or officer.

---

## Key Pages Reference

| Page/File | Purpose |
|---|---|
| `company_home.dart` | Company landing page. CTA, team info, assigned projects, company wall. |
| `company_projects.dart` | All projects view. Role-scoped. |
| `company_team.dart` | All company members. DM access. Open roles button (managers/officers). |
| `company_workspace.dart` | Employee's project workspace for submitting deliverables. |
| `company_home_queue.dart` | Manager/officer review page for submitted projects. |
| `create_project.dart` | Project creation form for managers/officers. |
| `company_projects_assign.dart` | Member assignment page for a specific project. |
| `create_role.dart` | Open role creation form. Accessible from company team page. |
| `application.dart` | Job application form. Cover letter + file attachments. |
| `discover.dart` | Main discover page. Companies, open roles, create company. |
| `discover_hiring.dart` | Hiring-focused discover view. Open roles with skill-based recommendations. |

---

## Current State of the App

- The app is at or near launch stage. Core functionality works end-to-end.
- The main area of uncertainty/redesign is the **search experience** (see `app_todo.md` for full spec).
- The company section is functional but lacks a **settings page** — this is a known gap.
- The matching/recommendation algorithm is functional but basic — improvements are planned post-launch.
- The community content feed (home page redesign) is a future initiative, not yet started.

---

## Strategic Context (Useful for Feature Prioritization)

- **Primary focus right now:** Learners and individual users, not companies. The company section exists but company acquisition is a secondary goal until the user base (supply of talent) is large enough to make the platform valuable to companies.
- **Core moat:** The verified activity trail — what a user built, when, at what skill level. This is what LinkedIn cannot replicate and what makes the platform valuable for hiring.
- **Growth strategy:** Grow the learner/user base first. Then use that talent pool as the value proposition to attract companies. Avoid building company features that outpace the user base.
- **Content flywheel (planned):** Learning → completing projects → building portfolio → getting discovered → getting hired → completing company projects → portfolio grows further. Every feature should ideally strengthen one link in this chain.
