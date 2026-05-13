# Landing Page — LLM Build Briefing

## What You Are Building

A clean, modern, single-page landing page for a mobile app. The page will be used as the destination for paid ads and organic marketing links. It needs to work on both desktop and mobile browsers.

The primary goal of the page is to convert a skeptical first-time visitor into a confident app downloader (or waitlist sign-up if the app is not yet live on the stores). The page must answer three questions within the first 10–20 seconds of a visitor landing on it:

1. What is this?
2. Is this for me?
3. Why should I trust it?

---

## About the App

The app is a **skill-learning and professional portfolio platform** for mobile (iOS + Android).

**Core value proposition:**
- Users learn digital skills through structured, AI-generated learning paths.
- To advance through each skill level, users must complete real, practical projects — not quizzes or multiple choice questions.
- Every completed project is added to the user's public portfolio and contributes to a verified skill credential.
- Companies and individuals can view a user's profile and know — with real confidence — what skills that person has and at what level, because the skills are backed by actual completed work, not self-reported claims.

**The key differentiator vs. competitors (LinkedIn, Coursera, etc.):**
Skills on this platform are *earned*, not self-reported. A user's skill level is based on what they actually built, not what they say they know. This makes the credential trustworthy for companies hiring or collaborating.

**Primary target user for this landing page:**
People aged 17–28, specifically those motivated by career growth, getting hired, or building a portfolio to stand out. Career switchers, students, and young professionals upskilling.

---

## Page Structure

Build the page in the following section order. Do not add sections that are not listed here.

---

### 1. Navigation Bar (top)
- App name / logo on the left.
- On the right: one CTA button ("Download the App" or "Join the Waitlist" — see CTA notes below).
- Minimal. No links to other pages. No hamburger menu needed.

---

### 2. Hero Section (above the fold)
This is the most important section. The visitor must immediately understand what the app is and why it matters.

**Required elements:**
- **Headline:** A bold, benefit-driven statement. Do NOT use the app name as the headline. The headline should communicate the core value in one short sentence. Suggested direction: *"Prove your skills. Get hired for them."* or *"Stop saying you know it. Show what you built."* — use your judgment to write something sharp and clear in this direction.
- **Subheadline:** One or two sentences clarifying what the app actually is. Example direction: *"[App name] is a skill-learning platform where you advance by completing real projects — not quizzes. Every project you finish becomes a verified credential on your public profile."*
- **CTA buttons:** Two buttons side by side — "Download on iOS" and "Download on Android". If the app is not yet publicly live, replace with a single "Join the Waitlist" button with an email input field.
- **App mockup:** A visual of the app on a phone screen (phone frame + screenshot). Place this to the right of the text on desktop, below the text on mobile. Use a placeholder or a clean mockup if no screenshot is provided.

---

### 3. Social Proof Bar
A minimal strip below the hero.

**Content:**
- "100+ early users" or similar early traction number.
- One or two short beta tester quotes if available. If not, use placeholder text styled as a quote block so the client can fill it in.
- Keep this section visually lightweight — do not let it dominate the page.

---

### 4. How It Works
A simple three-step visual section explaining the core user loop.

**Steps:**
1. **Learn** — Follow a structured, AI-curated learning path for any digital skill.
2. **Build** — Complete real projects at each stage to prove your competency.
3. **Get Discovered** — Your verified skill portfolio is visible to companies and collaborators.

**Design guidance:**
- Use icons or simple numbered visuals for each step.
- Keep copy extremely short — one headline and one sentence per step.
- This section should be scannable in under 10 seconds.

---

### 5. The Differentiator Section
This is where you explicitly state what makes this platform different. This should feel like a contrast — the old way vs. the new way.

**Direction:**
- Left side / top: "The old way" — self-reported skills, certificates that don't prove anything, endless courses with no output.
- Right side / bottom: "The new way" — skills backed by real completed projects, a portfolio that speaks for itself, credentials companies can actually trust.

**Headline suggestion:** *"Skills earned, not self-reported."*

Keep this section visually striking. A two-column layout or a contrast card works well here.

---

### 6. App Screenshots
Show 2–3 strong screenshots from the app in phone frames.

**Suggested screens to show (in order of priority):**
1. A user's skill profile / portfolio view — this communicates the credential angle visually.
2. A skill learning path view — shows the structured learning experience.
3. A project or task view — reinforces the "real projects" message.

If screenshots are not provided, use clean placeholder frames with labels describing what goes there.

---

### 7. Final CTA Section
A simple closing section to catch visitors who scrolled all the way down.

**Elements:**
- A short closing headline. Example: *"Start building the portfolio that proves what you know."*
- Repeat the same CTA button(s) from the hero section.
- Do not add new information here. This is purely a conversion closer.

---

### 8. Footer
Minimal.

- App name.
- Links: Privacy Policy | Terms of Service (can be placeholder links for now).
- Copyright line.
- Optionally: links to social media accounts if they exist.

---

## CTA Logic

- **If the app is live on the App Store and Google Play:** Show two buttons — "Download on iOS" (links to App Store) and "Get it on Android" (links to Play Store).
- **If the app is not yet publicly live:** Show a waitlist email capture form with a single submission button. Collected emails are for launch notification only. Store/display them appropriately.
- The client will confirm which state applies before the page goes live.

---

## What to Leave Out

Do NOT include any of the following — they are out of scope for this page:

- Explanation of the company/employer section of the app (this complicates the message at this stage)
- Pricing or monetization information
- A blog section
- A FAQ section
- A team / about us section
- Multiple pages or internal navigation links
- Heavy animations or video backgrounds

---

## Deliverable

A single HTML file (with CSS embedded or in a `<style>` block, and JS in a `<script>` block if needed). No external dependencies except a clean web font (Google Fonts is acceptable). The file should be self-contained and openable directly in a browser without a build step.

The client will supply:
- Final app name and logo
- Final brand colors (if different from suggested defaults)
- Real app screenshots
- App Store / Play Store links (or confirmation of waitlist mode)
- Any real beta tester quotes for the social proof section
