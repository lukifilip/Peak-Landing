# Public web portfolio redesign: plan

> **Status:** Part 1 (sections 0–8, the phone-first page) was approved on 2026-10-12 and has been
> live since that day. **Part 2 (sections 9–20, desktop and wide screens) was approved the same
> day and is implemented on the branch `web-portfolio/desktop` (not yet committed or deployed).**
> Written 2026-10-12.
>
> **Decisions (Lukas, 2026-10-12). Where these differ from the text below, these win:**
> - Architecture A and the backend change B are approved, with every other default in 6.1.
>   **Lukas deploys the backend himself.** Prepare the change; never run the deploy.
> - Search indexing: the default (index only pages with at least one certification or verified project).
> - "Report this page" goes to **peakofficial.app@gmail.com** (include the link in the footer).
> - The App Store listing (id `6758958604`) is available in every country.
> - **Blue matches the app exactly:** `#007AFF` light and `#0A84FF` dark, for blue text and the filled
>   button too. The web-only blue variants in section 3 are dropped (accepted trade-off: white on
>   `#007AFF` is 4.0:1, under WCAG AA for small text).
>
> **Source of truth** for structure, colours, type and which sections exist: the in-app
> `PortfolioView` as *another user* sees it (`~/Projects/iOS-Peak/Peak/Views/Portfolio/PortfolioView.swift`,
> `PortfolioCards.swift`, `Models/PortfolioModels.swift`, the colour sets in `Peak/Assets.xcassets`),
> plus `app_context.md` §13.3 and `docs/portfolio/PORTFOLIO_VIEWER_RATIONALE.md`.
> This plan does not change any in-app code.

---

## 0. Read this first

### What I found

1. **The page does not live in this project yet.** `vercel.json` only proxies `/u/*` to Firebase
   Hosting, which hands it to the `publicPortfolio` Cloud Function
   (`~/Projects/titan-app-shared-master/functions/portfolio.js`, copied into
   `~/Projects/iOS-Peak/functions/portfolio.js`). That one function reads Firestore **and** writes all
   of the HTML and CSS. So today, every visual change to the page is a Cloud Functions deploy.
2. **It reads the wrong certification source.** The web reads the owner-only `user_skill_progress`
   documents. The app shows another person's certifications from the public projection
   `portfolios/{uid}/learning_credentials`, and uses `users/{uid}.skills[]` for "Learning".
   As a result, certifications earned in the new learning system (SLP3) never appear on the web.
3. **The live function is older than its source code.** The live page prints the handle ("lukas"),
   not the display name. The fix is written but was never deployed (`FUNCTIONS_MERGE_NOTE.md` in the
   Flutter repo).
4. **It has drifted from the app in almost every visible way:** section titles, headline,
   Open to collaborate, skills (a colour ladder instead of icon + level rows), Overview, Real Work
   captions, avatars. It also has no dark mode, no headings, and grey text below contrast minimums.
5. **The share preview is weak.** The image is the raw profile photo (or nothing), the card is the
   small `summary` type, and the description can read "0 verified projects". The first uncached load
   I measured took **4.6 s** (function cold start).

### What I propose (the default I committed to)

Keep the privacy boundary where it is, and move the presentation into this project.

- The Cloud Function keeps doing the Firestore reads and the visibility rules. It gains a **JSON
  mode** that returns exactly the sanitized, allow-listed data the page shows, and nothing more.
- This project renders the page. A Vercel Function at `/u/<handle>` fetches that JSON and returns
  server-rendered HTML, so link previews and search engines still see the full content. A second
  Vercel Function generates a 1200×630 share image.
- After that, design work ships with Vercel preview deployments and needs no further backend
  deploys. The old HTML in the function stays as an instant rollback.

Why not the alternatives:

| Option | Why not |
|---|---|
| Redesign the HTML inside the function | Every design tweak stays behind a Firebase deploy, from a repo that is still being reconciled with the iOS copy. Slow to iterate and risky. |
| Read Firestore from Vercel directly (Admin SDK) | Needs a service-account key stored on Vercel that can read the **whole** database (emails, chats). It also copies the privacy rules out of the backend. |
| Read Firestore from the browser | The rules require sign-in for `users`, `portfolios` and `usernames`, and link previews would be empty (crawlers don't run JavaScript). |

### What needs your approval before any code

- **A. The architecture above.**
- **B. One backend change** (you asked me to ask): `publicPortfolio` gains the JSON mode and the data
  fixes in section 4. It is edited in `titan-app-shared-master` (the copy that is live), mirrored into
  `iOS-Peak/functions`, agreed with Patrik, and deployed on its own with
  `--only functions:publicPortfolio`. It also needs one secret, `PEAK_RENDER_KEY`, in Secret Manager.
  **No Firestore rule changes. No in-app changes.**
- **C. The open questions in 6.1.** Each has a default, so only A and B block the start.

---

## 1. Gap table

**App** = `PortfolioView` as another signed-in user sees it. **Web** = what `publicPortfolio`
renders (source in the Flutter repo; the live deploy is older, see "Name" in 1.2).

### 1.1 Sections and content

| | App (viewer) | Web today | Plan |
|---|---|---|---|
| Header | Pinned: back; a glass pill with Share and ⋯ (Report, Block). The name fades in once it scrolls away | Top bar: Peak icon + "Peak", and a "verified portfolio" badge | Top bar with the Peak mark only; the name fades in like the app. No back, Share or ⋯ (in-app features) |
| Identity | Avatar 80 (photo, or a colour gradient with 2 initials), founder rosette, name in a white capsule, headline 15 pt black, up to 3 lines | Everything inside a white card; a grey disc with 1 initial; grey name pill; headline 13 px grey; no founder badge | Match the app: no card around it, gradient initials, rosette, black 15 px headline |
| Match line, "Follows you", Follow, Message | Shown | Not shown | Not shown (in-app only, per your constraint) |
| Open to collaborate | Compact white card: blue dot + "Open to collaborate", the person's note (3 lines), skill icons + "Looking for X and Y". Only a small blue pill when there is no note and no skill | A green pill with a check; no note, no skills | Match the app |
| Featured | "Featured" title. One card, or a snapping carousel with page dots on the image for 2–3. Card: 150 pt image band, title, 1-line note, "Open" pill | No title. Cards with gradient banners, a company chip, a green "Approved by" line, note, skill chips, deliverable links. 2-column grid from 700 px | Match the app. "Open" opens a detail sheet |
| Overview | Two tiles, only when there is verified work: green seal / "Verified work" / "4 projects", and the lead skill's icon / level ("Expert") / skill name | "Verified projects" with a big number and "approved on Peak"; a "Certification" tile reading "—" and "no certification yet" when there is none | Match the app's tiles. With no certification, drop the second tile instead of showing "None yet" (2.3) |
| Companies | "Real Work": logo 47, name, "Employee since 2026", green seal + "4 verified projects", chevron | "Experience": bold name, "Employee · Since 2026", green "4 verified projects" text, every project listed inline with notes, chips and links | Match the app. Rows with verified work open a sheet. Rows without have no chevron, because the web has no public company page |
| Skills | "Expertise": one grouped card. Rows: skill icon tile, name, "Certified Expert", the level's icon (Novice droplet … Expert trophy), hairlines between rows. 4 rows, then View All. With nothing certified: "Learning", rows read "Learning" | "Verified skills // earned, gate by gate": one card per skill with a 5-segment colour ladder; the Expert card is filled with the skill colour and a diamond; 3 cards, then a dead "+ N more" | Match the app |
| Empty page | Grey document icon + "{name} hasn't added any work yet" | "{name} is just getting started — verified work will appear here…", while the footer still says "Every piece on this page is verified work" | One calm "Just getting started" card, only when there is nothing at all (2.3) |
| Trust and footer | — | An "Earned, not written" card; "live portfolio · always up to date · peak" | One closing card: what "verified" means on Peak, plus the page's one primary action |
| Next step for visitors | — (in-app actions) | A small "peak" text link | **Get Peak** (routed by platform) and the iOS Smart App Banner (2.6) |

### 1.2 Data

| | App (viewer) | Web today | Plan |
|---|---|---|---|
| Name | `display_name`, else `username` | Source: the same chain. **Live: the handle**, because the fix was never deployed | Ships with the backend step |
| Certifications | `portfolios/{uid}/learning_credentials` (public projection of SLP3 and legacy certifications) | `user_skill_progress` (owner-only legacy documents); misses SLP3 | The projection, like the app |
| "Learning" fallback | `users/{uid}.skills[]` + the skill catalog | Progress documents | `skills[]` + catalog, like the app |
| Lead certification and automatic headline | Deepest level; the owner's `highlightedSkillId` picks among ties | Ignores `highlightedSkillId` | Honour it |
| Open to collaborate | `open_to_collaborate`, `collab_note`, `collab_skill_ids` | The boolean only | All three |
| Founder | `isFounder` → rosette | Not read | Read |
| Role, tenure, logo | `memberships[]` rollup (the only source a viewer may read) and the live company doc for name and logo | Members subcollection + company doc | Rollup first, members doc as fallback |
| Which projects count | `status == done`, company not hidden | Same | Same, and skip any entry explicitly set to `public: false` (4.4, item 4) |
| Deliverables | Only on the project page, only when the owner made them public | Inline on the main page, when public | Only in the project sheet, when public |
| Featured | `featuredIds` (up to 3), else the best piece by credibility score | Same | Same |

### 1.3 Visual

| | App | Web today | Plan |
|---|---|---|---|
| Background / card | `#F5F5F7` / `#FFFFFF`; dark `#000000` / `#1C1C1E` | Light only | Both, following the visitor's system setting |
| Accent | `PeakBlue`: `#007AFF` light, `#0A84FF` dark | `#0A84FF` everywhere | App values for dots and glyphs; contrast-safe variants for blue text and the filled button (section 3) |
| Section titles | 22 pt bold, grey `#6E6E73` / `#AEAEB2`, inset 35 pt | 19 px bold black | App |
| Headline | 15 pt regular, black | 13 px grey | App |
| Secondary text | `#8E8E93` for most captions; readable `#6E6E73` for titles | `#8E8E93` everywhere (3.3:1 on white, fails WCAG AA) | `#6E6E73` for all text; `#8E8E93` only for chevrons and decorative glyphs |
| Font | San Francisco (system) | System stack, plus an Inter download | System stack only, no web font |
| Cards | Radius 25, no shadow, padding 15, gutters 18 (Expertise 20) | Radius 25, padding 15–20 | App |
| Icons | SF Symbols; skill PNGs; level PNGs | Inline SVGs; skill PNGs mirrored in this project; no level icons | Inline SVGs drawn to match (SF Symbols are not licensed for the web); mirror the 5 level icons |
| Layout | Phone column | One column; from 900 px a sticky 320 px rail + content | One centred column, max 640 px, at every width |

### 1.4 Behaviour, states, meta

| | App | Web today | Plan |
|---|---|---|---|
| Interactions | Featured → project page; Verified work → all projects; certified tile → certifications; company → its projects | None (everything is inline) | The same drill-ins as native sheets (`<dialog>`), deep-linkable |
| Loading | Skeleton until the documents answer | Server-rendered | Server-rendered + edge cache; fixed-size image placeholders (2.5) |
| Not found | — | Branded 404, "Portfolio not found" | One "isn't available" page for not found, deleted, and any future private setting |
| Error | — | "Something went wrong", no retry | Try again button; never cached |
| Share preview | — | "{name} — Peak Portfolio"; og:image = raw photo or none; `summary` card; can say "0 verified projects" | Generated 1200×630 card, `summary_large_image`, never a zero |
| Accessibility | Dynamic Type, VoiceOver labels | No headings (name and titles are `<span>`s); contrast failures | Landmarks, one h1, h2 per section, AA contrast, focus rings, keyboard, reduced motion |
| Dark mode | Yes | No | Yes |
| Speed | — | 4.6 s cold; `s-maxage=600` | Edge cache + stale-while-revalidate; no font download; about 4 KB of JavaScript |

---

## 2. The page, section by section

```
┌──────────────────────────────────────────────┐
│ [Peak]           (Sarah fades in)             │  sticky, frosted, soft fade below
├──────────────────────────────────────────────┤
│                   (photo)                    │
│                  ( Sarah )                   │  h1 in the white capsule
│           Professional Copywriter            │  headline
│ ┌──────────────────────────────────────────┐ │
│ │ • Open to collaborate                    │ │
│ │ Looking for a digital marketer who …     │ │
│ │ [icon] Looking for Digital Marketing     │ │
│ └──────────────────────────────────────────┘ │
│   Featured                                   │
│ ┌──────────────────────────────────────────┐ │
│ │                image band                │ │
│ │ Website SEO Optimization         ( Open )│ │
│ │ The website needs Google search…         │ │
│ └──────────────────────────────────────────┘ │
│ ┌───────────────────┐ ┌────────────────────┐ │
│ │ [seal]            │ │ [skill icon]       │ │
│ │ Verified work     │ │ Expert             │ │
│ │ 4 projects        │ │ Copywriting        │ │
│ └───────────────────┘ └────────────────────┘ │
│   Real Work                                  │
│ ┌──────────────────────────────────────────┐ │
│ │ [logo] LiveLit                         › │ │
│ │        Employee since 2026               │ │
│ │        [seal] 4 verified projects        │ │
│ └──────────────────────────────────────────┘ │
│   Expertise                                  │
│ ┌──────────────────────────────────────────┐ │
│ │ [icon] Copywriting             [trophy]  │ │
│ │        Certified Expert                  │ │
│ │ ──────────────────────────────────────── │ │
│ │ [icon] Prompt Engineering      [drop]    │ │
│ │        Certified Novice                  │ │
│ └──────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────┐ │
│ │ [seal] Verified on Peak                  │ │
│ │ Certifications are earned by passing …   │ │
│ │ (              Get Peak              )   │ │
│ └──────────────────────────────────────────┘ │
│         Peak · Privacy · Terms · Report      │
└──────────────────────────────────────────────┘
```

**The rule for every section: show it only when it has something true to say. Never show a zero, a
dash, "None yet", or anything addressed to the owner.** This is the app's own rule for viewers
("sections omitted when empty"), applied slightly more strictly, because a recruiter reads absence
as weakness in a way a peer in the app does not.

### 2.1 Sections

**1. Top bar (web only).** Peak app icon (28 px) and "Peak" (17 px bold), linking to the landing
page. Sticky, with a frosted background and the app's soft scroll-edge fade beneath it. Once the
name capsule has scrolled under it, the person's name fades into the centre (17 px bold, 0.22 s),
as the app's header does. Nothing on the right: on iPhone the system's Smart App Banner already
offers the app, and the page's one call to action sits at the end (2.6).
*Empty rule:* always shown.

**2. Identity.** Avatar 80 px: the photo, or the app's gradient with initials (same 4 gradients, the
same hash, so a person has the same colour on the web and in the app). Founder rosette on the avatar
when `isFounder`. The display name in the white capsule (this is the page's `<h1>`). The headline:
their own words, else the automatic ladder ("Expert in Copywriting", "Learning SEO",
"Building a verified portfolio"), at most 3 lines. No @handle (it is already in the URL), no match
line, no buttons.
*Empty rule:* always shown. The name and the headline can never be blank.

**3. Open to collaborate.** Exactly the app's `PortfolioLookingForRow`: the blue dot and status, the
note (up to 3 lines), the looked-for skills as overlapping icons on white rings with
"Looking for Digital Marketing and Copywriting".
*Empty rule:* only while the person has it switched on. With no note and no skills, only the small
blue "Open to collaborate" pill, centred (the app's rule; a white card around one line reads empty).

**4. Featured.** Section title "Featured". The owner's curated pieces (`featuredIds`, up to 3, in
their order), else the single best verified project. One card full width; 2–3 cards as a horizontal
scroll-snap carousel with the next card peeking and page dots on the image band. On devices with a
pointer, small previous/next buttons appear on hover. Card: 150 px image band (the piece's image,
else the company banner, else the company logo, else the app's grey band with a document glyph;
**no invented colour gradients**), title (16 px medium, 1 line), note or description (14 px, 1 line),
and the "Open" pill, which opens the project sheet (2.2).
*Empty rule:* hidden when there is no verified project.

**5. Overview.** Two tiles side by side, 135 px tall: the green seal, "Verified work",
"4 projects" (opens the "Verified work" sheet listing every verified project); and the lead skill's
icon, its certified level ("Expert"), the skill name (scrolls to Expertise).
*Empty rule:* hidden when there is no verified work (as in the app). With verified work but no
certification, **only the Verified work tile, full width**. The app shows "Certified skill · None
yet" there; this is the one place the web deliberately differs from the app's viewer content,
because "None yet" is exactly the "unfinished" signal you want to avoid.

**6. Real Work.** Section title "Real Work" (the app's wording). One row per company: logo 47 px
(rounded 12), name, caption "Employee since 2026" / "Officer 2024–2026" (role, then tenure, as the
app builds it), and, when the company approved work, the green seal with "4 verified projects".
Current companies first, then by most recent. Rows with verified work have a chevron and open that
company's sheet. Rows without verified work are not interactive and have no chevron: in the app they
open the company's public page, which does not exist on the web.
*Empty rule:* hidden when there is no visible company. Hidden companies never appear, nor does their
work anywhere on the page.

**7. Expertise, or Learning.** Section title "Expertise" when anything is certified: certified skills
only, deepest first, as the app ranks them. Each row: the skill icon on a grey tile, the name, the
standing ("Certified Intermediate"), and that level's icon on the right. 4 rows, then "View all",
which expands in place. If nothing is certified but skills are in progress, the title is "Learning"
and the rows read "Learning", with no level icon (the app's viewer rule). Rows are not links.
*Empty rule:* hidden when there is no skill at all.

**8. Closing card.** A white card: green seal and "Verified on Peak", then one sentence on what that
means ("Certifications on Peak are earned by passing a graded final challenge. Projects appear only
after the company they were done for approves them."), then the page's single blue button,
**Get Peak**, and a quiet line under it ("Learn a skill. Prove it with real work."). On an empty page
the explanation changes to what Peak is, since there is nothing on the page to vouch for.
*Empty rule:* always shown.

**9. Footer links.** Peak · Privacy · Terms (the existing pages in `files/`), and "Report this page"
once you confirm an address (6.1, question 4).

### 2.2 Detail sheets (drill-ins)

Native `<dialog>` elements, opened from data already in the page, so they appear instantly. On
phones they rise as a bottom sheet (top corners 28, grab handle). From 768 px they are a centred
panel (radius 25, max 560 px wide). They close with the ✕ button, Escape, a tap outside, or the
browser's Back button (each sheet sets a `#project-…` hash, which also makes it linkable).
Focus moves into the sheet and back to the card that opened it.

- **Project sheet** (from a Featured card, the Verified work sheet, or a company sheet): the image
  band when there is one, the title (19 px bold), "Verified · Approved by LiveLit · March 2026"
  (seal + readable green), the description (clamped to 6 lines with "Show more"), "What I did" when
  the owner wrote a note that differs from the description, and **Deliverables** only when the owner
  made them public (link rows that open in a new tab). Private deliverables are not mentioned at all;
  the app's "The owner has kept the deliverables private." would only hint at missing material.
- **Company sheet** (from a Real Work row): logo, name and caption, then that company's verified
  projects as compact rows (title, "Verified · March 2026", chevron), each opening the project view
  inside the same sheet, with a back chevron.
- **Verified work sheet** (from the Overview tile): every verified project, newest first, as the
  same compact rows.

Without JavaScript the page still shows everything essential; only the sheets are unavailable.

### 2.3 Whole-page states, and the empty-state rule

| State | When | What the visitor sees | Search engines |
|---|---|---|---|
| **Full** | At least one certification or verified project | Every section that applies | Indexed |
| **Sparse** | A company, but nothing certified and no verified work (Kait in your screenshots) | Identity, Open to collaborate if on, Real Work, Learning if any | Not indexed (default; 6.1, question 3) |
| **Learning** | Only skills in progress | Identity, Open to collaborate if on, Learning | Not indexed |
| **Empty** | No company, no skill, no work | Identity, Open to collaborate if on, then one card: **"Just getting started"** / "{Name} is new to Peak. Certifications and verified projects appear here as they're earned." | Not indexed |

**Why this rule:**

- **Hiding an empty section is invisible; showing it empty is a statement.** A missing "Real Work"
  heading reads as nothing at all. An empty one reads as "has no work".
- **One honest card, and only when the page would otherwise be blank.** A page with only a name
  looks broken. A single calm sentence explains it without apologising.
- **No card when there is any real content.** A "Learning" section or a company row *is* the
  content. Putting "just getting started" above it would undersell what is there, and the headline
  ("Learning AI for Productivity") already frames it kindly.
- **It speaks to the visitor about the person, never to the owner.** No "add", "learn", "certify"
  or "apply" verbs, no buttons inside the empty card. The app's owner states push the owner to act;
  the visitor cannot act on any of that.
- **"Just getting started" instead of the app's "hasn't added any work yet".** "Hasn't" frames a
  shortfall; "new to Peak" frames a beginning. Same truth.
- **No zeros, anywhere,** including the meta description and the share image.
- **Thin pages are kept out of search results** until there is something earned on them, which also
  protects people who have never shared their link.

### 2.4 Unavailable and error pages

Both use the same top bar, one centred white card and the closing footer.

- **Unavailable** (status 404, `noindex`, cached 60 s). Used for a handle that does not exist, an
  invalid handle, a deleted account, and any future private or suspended state. All of these look
  identical on purpose, so the page never confirms that a private account exists. Title
  "This portfolio isn't available"; text "The link may be mistyped, or the person may have changed
  their username."; one button, **Go to Peak**.
- **Error** (status 503 with `Retry-After`, never cached). Title "This portfolio couldn't load";
  text "Something went wrong on our side. Please try again in a moment."; **Try again** (reloads)
  and a "Go to Peak" link. When the cache still holds an earlier copy, that copy is served instead
  (stale-if-error), so most visitors never see this page.
- **Canonical URLs.** `/u/Sarah` and `/u/sarah/` redirect (301) to `/u/sarah`.

### 2.5 Loading

The HTML arrives complete, so there is no page-level skeleton or spinner; the loading work goes into
making the first byte fast and the images calm:

- The edge caches each page for 5 minutes and serves the cached copy for 10 more while it refreshes
  in the background, so most visitors never wait for the function.
- Every image (avatar, banners, logos, icons) has fixed dimensions and a placeholder fill in the
  app's skeleton colour, then fades in (0.2 s). No layout shift.
- The avatar and the first featured image load first; everything below the fold loads lazily.
- No web font and about 4 KB of JavaScript (sheets, carousel dots, header name, View all).

### 2.6 The visitor's next step

What the page can honestly offer today, without in-app changes:

1. **Get Peak**, the closing card's blue button. It goes to `/get`, which redirects by device: iPhone
   and iPad to the App Store listing (id `6758958604`), Android to Google Play, everything else to
   the existing download page. The routing is done by a `vercel.json` redirect rule, so the
   portfolio HTML itself stays cacheable.
2. **The Smart App Banner on iPhone** (`<meta name="apple-itunes-app">`): Safari's own banner with
   Get or Open. Its `app-argument` is the page URL. The app's `DeepLinkRouter` already handles any
   `/u/<handle>` URL through `onOpenURL` regardless of host, so **Open should land a Peak user on this
   person's in-app portfolio, where Follow and Message live**, with no app change. To be verified on
   a device.

Contacting the person directly from the web (email, LinkedIn, website, "Message on Peak" for
non-users) needs a choice the owner makes in the app, so it is out of scope (section 7).

### 2.7 Share preview

- `<title>` and `og:title`: **"{Name} on Peak"**.
- `description` and `og:description`, built only from what is true, never a zero. Full:
  "Professional Copywriter · Certified Expert in Copywriting · 4 verified projects at LiveLit".
  Learning: "Learning AI for Productivity on Peak". Empty: "{Name} is building a verified portfolio
  on Peak."
- `og:image`: a generated 1200×630 card at `/u/<handle>/og.png?v=<content hash>`. Light background,
  a white rounded card, the avatar (or gradient initials), name, headline, up to three certified
  skills with their skill and level icons, the verified-projects line when there is one, and the Peak
  mark with `peakofficial.app/u/<handle>`. The `v` parameter changes when the content changes, so a
  re-shared link gets a fresh image even though LinkedIn and others cache images for days. Plus
  `og:image:width`, `og:image:height`, `og:image:alt`.
- `og:type` = `profile`, `og:site_name` = `Peak`, `og:url` = the canonical `https://www.peakofficial.app/u/<handle>`,
  `twitter:card` = `summary_large_image`.
- The unavailable and error pages use a static Peak share image and `noindex`.

### 2.8 Accessibility basics

- Landmarks: `<header>`, `<main>`, `<footer>`. The person's name is the only `<h1>`; each section
  title is an `<h2>`; rows are lists.
- Text contrast at least 4.5:1 in both modes (this is why the web uses `#6E6E73` and two blue
  variants, section 3). Meaningful glyphs at least 3:1. Level and status are always written in text,
  never carried by colour or icon alone.
- Images: decorative ones (logos and skill icons next to their names, level icons next to
  "Certified Expert") have empty `alt`. The founder rosette has a text label ("Founder").
- Keyboard: every card and button is reachable with Tab, has a visible focus ring (2 px accent,
  offset 2 px) and works with Enter or Space. Sheets trap focus, close with Escape and return focus.
- Text sizes are in `rem`, so the browser's text-size setting scales them, and no text sits in a
  fixed-height box (the Overview tiles use a minimum height).
- Touch targets at least 44×44 px.
- `prefers-reduced-motion`: no press scaling, sheet slides become fades, no smooth scrolling.
- `lang="en"`, `color-scheme: light dark`, a `theme-color` per mode.

### 2.9 Responsive and dark mode

- Mobile first, designed at 375 px; checked from 320 px to 1440 px.
- One centred column at every width: cards keep the app's 18 px gutters on phones, and the column
  stops growing at 640 px. Below 360 px the Overview tiles stack.
- Dark mode follows the visitor's system (no toggle), using the app's dark colour sets.

---

## 3. Design tokens

Taken from the app's code (the colour sets in `Assets.xcassets`, `AppColors.swift`,
`PeakSectionTitle.swift`, `PortfolioTokens`, `PortfolioView.swift`). Where the web needs a value the
app doesn't have, it is marked **web-only** with the reason.

### 3.1 Colour

```css
:root {
  color-scheme: light dark;

  /* Surfaces: Assets.xcassets colour sets */
  --peak-bg:        #F5F5F7;  /* PeakBackground */
  --peak-card:      #FFFFFF;  /* PeakCard */
  --peak-pill:      #F5F5F7;  /* PeakPill: icon tiles, the Open pill */

  /* Text */
  --peak-text:      #000000;  /* Color.primary */
  --peak-text-2:    #6E6E73;  /* peakReadableSecondaryText: section titles and ALL captions on the web */
  --peak-glyph-2:   #8E8E93;  /* PeakSecondaryText: chevrons and decorative glyphs only */

  /* Accent */
  --peak-blue:      #007AFF;  /* PeakBlue: dots, focus ring, blue text and the filled button
                                 (decided 2026-10-12: match the app exactly) */
  --peak-blue-tint: rgb(0 122 255 / 0.10);  /* the small Open to collaborate pill */

  /* Status */
  --peak-green:       #34C759;  /* PortfolioTokens.success: seal glyphs */
  --peak-green-text:  #248A3D;  /* peakSuccessText: green text */
  --peak-seal-tile:   #4FDB66;  /* the Overview "Verified work" seal (rgb 79, 219, 102) */
  --peak-founder:     #FFB300;  /* founder rosette */

  /* Lines and placeholders */
  --peak-divider:     rgb(142 142 147 / 0.27);  /* Expertise row hairlines */
  --peak-skeleton:    #E0E0E0;  /* style guide skeleton base */
  --peak-skeleton-hi: #F5F5F5;  /* style guide skeleton highlight */
}

@media (prefers-color-scheme: dark) {
  :root {
    --peak-bg:        #000000;
    --peak-card:      #1C1C1E;
    --peak-pill:      #2C2C2E;
    --peak-text:      #FFFFFF;
    --peak-text-2:    #AEAEB2;
    --peak-glyph-2:   #AEAEB2;
    --peak-blue:      #0A84FF;
    --peak-blue-tint: rgb(10 132 255 / 0.16);
    --peak-green-text: #30D158;
    --peak-divider:   rgb(174 174 178 / 0.27);
    --peak-skeleton:    #2C2C2E;
    --peak-skeleton-hi: #3A3A3C;
  }
}
```

Avatar fallback gradients (left to right), from `AsyncProfileImage.swift`: `#6A5CFF→#FF4D9D`,
`#00A6FF→#7B61FF`, `#FF7A59→#FFC857`, `#00B894→#0984E3`. The server picks the index with the app's
FNV-1a hash of the uid (only the index, 0–3, is sent; the uid is not). Initials: first and last word,
or the first two letters of one word; 38% of the avatar size, semibold.

Skill colours: each skill's own `skill_color`, used only as the icon fallback disc.

> **Note on blue.** The style guide says to standardise on `#0A84FF`, but the app's code uses
> `#007AFF` in light mode and `#0A84FF` in dark (Apple's system blue). The plan follows the code.
> On the web, white text on `#007AFF` measures 4.0:1 and fails WCAG AA at button sizes, hence the two
> web-only variants. They are visually very close (`#0071E3` is the blue on apple.com).

### 3.2 Typography

System font only, no download:
`-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
On Apple devices that is San Francisco with automatic optical sizing, so no manual letter-spacing.

| Use | Size / weight | Colour | App source |
|---|---|---|---|
| Section title | 22 / bold (grows to 28 at most) | `--peak-text-2` | `peakSectionTitle()` (`.title2.bold`) |
| Name (h1, in the capsule) | 15 / 500 | `--peak-text` | `.subheadline.weight(.medium)` |
| Headline | 15 / 400, max 3 lines | `--peak-text` | `.subheadline` |
| Top bar name | 17 / 700 | `--peak-text` | header title |
| Open to collaborate: status · note · "Looking for" | 13/600 · 15/400 · 13/400 | blue-text · text · text-2 | `PortfolioLookingForRow` |
| Featured: title · note · Open | 16/500 · 14/400 · 13/500 | text · text-2 · blue-text | `FeaturedCard` |
| Overview: title · value | 16/500 · 13/500 | text · text-2 | `overviewCell` |
| Real Work: name · caption · verified line | 15/500 · 13/400 · 13/400 | text · text-2 · text-2 | `companyCard` |
| Expertise: name · standing | 15/600 · 13/400 | text · text-2 | `PortfolioVerifiedSkillRow` |
| View all | 14/400 | text-2 | |
| Sheet: title · caption · body | 19/700 · 13/400 · 15/400 (line-height 1.47) | text · text-2 · text | `PortfolioAssignedDetailView` |
| Closing card: title · body · button | 17/600 · 15/400 · 15/500 | text · text-2 · white | style guide primary CTA |

### 3.3 Shape, size and spacing

| Token | Value | Source |
|---|---|---|
| Card radius | 25 | `PortfolioTokens.cornerRadius` |
| Sheet radius | 28 top corners (phone), 25 (panel) | style guide |
| Icon tile / company logo radius | 12 | skill rows, `companyLogo` |
| Avatar | 80, circle; rosette badge 34 with a 3 px ring in `--peak-bg` | `identityCap` |
| Name capsule | min-height 33, padding 7 × 16 | `identityCap` |
| Skill icon | 37 inside a 50 tile; level icon 24 | `PortfolioVerifiedSkillRow` |
| Company logo | 47 | `companyLogo` |
| Featured image band | 150 | `FeaturedCard.imageBandHeight` |
| Open pill | 65 × 30, capsule | `FeaturedCard` |
| Overview tile | min-height 135, padding 15, gap 10, icon 30 | `overviewCell` |
| Skill row | min-height 83; hairline inset 25 | `verifiedSkillsSection` |
| Primary button | height 50, capsule, max width 360 | style guide |
| Gutters | 18 (cards), 20 (Expertise card) | `PortfolioView` |
| Section title | inset 35 from the edge, 8 above its content | `sectionTitle` |
| Identity | avatar → 10 → name → 12 → headline → 24 → Open to collaborate (web-only: the app's 22 to its buttons, which the web doesn't have) | `identityCap` |
| Between sections | 30 before the first section (40 with no Open to collaborate card), 8 after Featured, 30 after Overview, 8 between company rows, 25 before Expertise, 50 at the bottom | `content` |
| Column width | max 640 | web-only |
| Shadow | none on cards (white on grey); top bar uses blur 16 + fade | style guide |

### 3.4 Motion

From `PeakMotion.swift`, all disabled under `prefers-reduced-motion`:
press feedback scale 0.98 for cards and 0.97 for buttons (about 180 ms);
fades 0.22 s (`PeakMotion.transition`); content changes 0.28 s ease-out (`PeakMotion.content`);
sheet in 0.32 s, out 0.22 s; image fade-in 0.2 s.

### 3.5 Assets

- **Skill icons:** already mirrored in `assets/skill_icons/` (280 px) and identical to the app's,
  except `cyber_security.png`, which differs and should be re-copied from the app.
- **Level icons (new):** `novice` (droplet), `beginner` (leaf), `intermediate` (tree), `advanced`
  (mountain), `expert` (trophy), copied from `iOS-Peak/Peak/Assets.xcassets/*.imageset` (500 px) and
  resized to 96 px into `assets/levels/`.
- **Glyphs:** inline SVGs drawn to match the SF Symbols the app uses (`checkmark.seal.fill`,
  `chevron.right`, `building.2.fill`, `doc.fill`, `rosette`, `link`, `xmark`), because SF Symbols may
  not be used on the web under Apple's licence.
- **Icon resolution order** for a credential: the projection's icon file if it is one of ours →
  the catalog's icon for that skill id → a disc in the skill's colour. Needed because a schema-3
  manifest can name an SF Symbol (`chart.xyaxis.line`) instead of a file.

---

## 4. Data and privacy

### 4.1 Where the data comes from

```
Visitor ──► peakofficial.app/u/sarah ──308──► www.peakofficial.app/u/sarah
              Vercel edge cache (HTML: 5 min fresh, +10 min stale-while-revalidate)
                └─ miss ─► Vercel Function  api/portfolio.js        (this project)
                             └─ GET publicPortfolio?format=json  + X-Peak-Render-Key
                                  (Cloud Function, us-central1, Admin SDK, allow-listed reads)
                                    usernames/{handle}            → uid (never sent onward)
                                    users/{uid}                   → name, headline, photo, founder,
                                                                    open to collaborate, skills[]
                                    portfolios/{uid}              → assigned_projects, featuredIds,
                                                                    hiddenCompanyIds, memberships,
                                                                    highlightedSkillId
                                    portfolios/{uid}/learning_credentials  → certifications
                                    portfolios/{uid}/entry_private/{id}    → deliverables, only if public
                                    company/{cid}                 → name, logo, banner
                                    company/{cid}/members/{uid}   → role and dates (fallback only)
                                    Supabase skills (cached)      → skill names, icons, colours
                             ◄─ sanitized JSON (4.5)
                ◄─ HTML rendered from that JSON
```

The JSON is the same content the HTML shows. It is answered only to requests carrying the shared
secret, and with `Cache-Control: private, no-store`, so no CDN in between can hand it to anyone else.

### 4.2 What is shown, and from where

| On the page | Source | Rule |
|---|---|---|
| Name | `users.display_name`, else `users.username` | Trimmed; never the raw handle when a name exists |
| Headline | `users.headline` (trimmed, max 120), else automatic | Automatic = lead certification ("Expert in X" / "Certified {Level} in X"), else "Learning X", else "Building a verified portfolio" |
| Photo | `users.profile_picture` | `http(s)` URLs only; otherwise gradient initials |
| Founder rosette | `users.isFounder === true` | |
| Open to collaborate | `open_to_collaborate`, `collab_note`, `collab_skill_ids` | Note trimmed, max 120; up to 3 skills, unknown ids dropped |
| Certifications | `learning_credentials` with `schemaVersion == 3` and `status == "active"` | One per skill, deepest wins; ranked as `skillCredentialOrdersBefore` |
| Learning skills | `users.skills[]` + catalog | Only when nothing is certified |
| Lead certification | Certifications + `portfolios.highlightedSkillId` | The owner's pick among the deepest ties |
| Verified projects | `portfolios.assigned_projects` | `status == "done"`, company not in `hiddenCompanyIds`, not `public: false` |
| Project fields | title, description, owner note, image, company, completion month | Month precision only ("March 2026") |
| Featured | `portfolios.featuredIds` | Up to 3, must be visible verified projects; else the best one |
| Deliverables | `entry_private/{projectId}` | Only when `public == true`; `http(s)` links only; titles and links only |
| Companies | `memberships[]` + companies with verified work | Not hidden; example (demo) companies are already excluded by the server rollup |
| Company name, logo, banner | `company/{cid}` | `http(s)` URLs only |
| Role and tenure | `memberships[]`, fallback `members/{uid}` | Only `role`, `joinedAt`, `leftAt` are read |

### 4.3 Never shown

- **Email**: it lives in the owner-only `users/{uid}/private/sensitive` document and is never read.
- The **@handle** on the page (it is only in the URL), and the **uid** anywhere (HTML, JSON, image).
- Followers, following, "Follows you", the match line, blocks.
- Streaks, learning progress fractions, owner-only progress documents, attempts, grading.
- Projects that are not done: in progress, submitted, sent back. Applications.
- Hidden companies and every project done for them.
- Private deliverables, and the fact that they exist.
- Credibility scores, payout tiers, internal flags, edit and curation controls.
- `users.description` (the old bio; the app no longer shows it).

The JSON is built from an allow-list of fields, never by copying a document, so a field added to a
document later cannot leak through. (Older accounts may still carry legacy fields; the allow-list
makes that irrelevant.)

### 4.4 Flags: things in the data layer that may expose too much

1. **The new JSON mode is a structured way to read profiles.** Mitigated by the shared secret, by
   `private, no-store`, and by carrying only what the HTML already shows.
2. **Every account with a handle has a public, indexed page today**, including people who never
   shared their link and pages with nothing on them. Proposed default: index only pages with at least
   one certification or verified project (6.1, question 3). A real choice belongs to the owner in the
   app (section 7).
3. **Old handles can be taken by someone else.** A rename deletes the old `usernames` reservation.
   If another person claims the freed handle, links the first person already put in job applications
   would open the second person's page. This is an impersonation risk worth fixing in the backend
   (reserve or redirect old handles); it is out of scope here (section 7).
4. **Credentials without a `public` flag.** The app's list and the web show every completed
   credential, but the app's project page shows "This project is private." when `public` is not
   `true` (legacy entries). Nothing in today's apps writes `public: false` for a credential, but if
   one ever does, the web should respect it. Default: hide entries with an explicit `public: false`,
   treat a missing flag as public (as the app's list does).
5. **Project descriptions are written by the company**, for internal use, and become world-readable.
   This is already true in the app for any signed-in user (and the credential is public by design),
   so the default keeps parity, with the description clamped. Say if you would rather show only the
   owner's own note on the web (6.1, question 9).
6. **`learning_credentials` is readable without signing in** (`allow read: if true`), unlike every
   other portfolio collection. It holds only sanitized fields, but it also carries
   `capabilityClaims`, `assessmentStandardVersion` and `evidenceClass`. The page does not use them.
   No change proposed; noted so it stays a conscious choice.
7. **Cached copies after a privacy change.** Hiding a company or deleting an account can take up to
   about 15 minutes to disappear from the edge cache. Kept short on purpose; an active purge on
   write can come later.
8. **Photo and logo URLs** are Firebase Storage links with access tokens. They are already readable
   by any signed-in user; on the web they are shown as-is (or through Vercel's image optimizer).

### 4.5 JSON contract (v1)

```jsonc
{
  "v": 1,
  "handle": "sarah",
  "state": "full",                 // full | sparse | learning | empty
  "name": "Sarah",
  "headline": "Professional Copywriter",
  "avatar": { "url": "https://firebasestorage.googleapis.com/…", "gradient": 2 },
  "founder": false,
  "collab": {                      // null when switched off
    "note": "Looking for a digital marketer, who is an expert at social media marketing…",
    "skills": [{ "id": "5", "name": "Digital Marketing", "icon": "digital_marketing", "color": "#FD9B48" }]
  },
  "featured": ["k7f3a9c1"],        // project keys, in the owner's order
  "projects": [{
    "key": "k7f3a9c1",             // stable opaque key (hash of the project id)
    "title": "Website SEO Optimization",
    "description": "The website needs Google search engine optimization…",
    "note": "",
    "image": null,
    "company": "c2b81e04",
    "month": "2026-03",
    "deliverables": [{ "title": "SEO audit", "url": "https://…" }]   // [] unless public
  }],
  "companies": [{
    "key": "c2b81e04",
    "name": "LiveLit",
    "logo": "https://…", "banner": "https://…",
    "caption": "Employee since 2026",
    "current": true,
    "verifiedCount": 4
  }],
  "skills": {
    "title": "Expertise",          // Expertise | Learning
    "items": [{ "id": "10", "name": "Copywriting", "icon": "copywriting", "color": "#6512B8",
                "level": 4, "standing": "Certified Expert" }]   // level 0..4, null while learning
  },
  "lead": "10",                    // skill id of the lead certification, or null
  "verifiedCount": 4
}
```

---

## 5. Implementation steps

### Phase 0: approvals (no code)

1. You approve A (architecture), B (the backend change and who deploys it) and answer what you want
   from 6.1.
2. Before the backend edit: confirm with Patrik that the Flutter repo's uncommitted
   `functions/index.js` and `functions/account.js` and the new `functions/follows.js` match what is
   live. A single-function deploy still uploads that whole working tree and loads `index.js`.

### Phase 1: backend (only after approval B)

Edited in `~/Projects/titan-app-shared-master/functions/portfolio.js`, mirrored into
`~/Projects/iOS-Peak/functions/portfolio.js`.

1. Let `buildPublicPortfolioModel` take `db` as a parameter, so it can be tested with fake documents.
2. Certifications: read `learning_credentials` (parse exactly like
   `SkillCredential.fromPublicProjection`), merge per skill, add the `skills[]` roster for
   "Learning", rank like the app. Remove the `user_skill_progress` reads.
3. Lead and headline: honour `highlightedSkillId` (`PortfolioHeadline.leadCredential`).
4. Add Open to collaborate note and skills, founder, the avatar gradient index, the `public: false`
   filter, the company caption ("Employee since 2026"), role and dates from `memberships[]` first,
   the page state, and the skill catalog from Supabase `skills` (cached for an hour, with the
   bundled list as fallback).
5. Add `serializePublicPortfolio(model)` (the allow-list in 4.5) and the `?format=json` branch,
   which checks `X-Peak-Render-Key` against the `PEAK_RENDER_KEY` secret and answers
   `private, no-store`. Leave the HTML branch as it is (it gains display names and the data fixes).
6. Tests with `node --test`: full, sparse, learning, empty; hidden company; private and public
   deliverables; a legacy credential; an SF Symbol icon; tied certifications with and without
   `highlightedSkillId`; an explicit `public: false`; a document with extra fields (must not appear
   in the JSON).
7. Deploy: `firebase deploy --only functions:publicPortfolio --project skilllearningapp` from the
   Flutter repo, by you or Patrik. Then check the JSON for `lukas`, `lukasthetester` and one full
   profile, and that the live HTML now shows display names.

### Phase 2: scaffold in this project

```
api/portfolio.js         GET /u/:handle → fetch JSON → HTML (states, cache headers, redirects)
api/portfolio-og.js      GET /u/:handle/og.png → share image (@vercel/og)
portfolio/render.js      pure: JSON → HTML string, with escaping
portfolio/copy.js        every visitor-facing string in one place
portfolio/styles.css     tokens + components (inlined into the page)
portfolio/page.js        progressive enhancement: sheets, carousel, header name, View all
portfolio/fixtures/      full.json, sparse.json, learning.json, empty.json, edge.json
assets/levels/           novice … expert (96 px)
assets/portfolio/        og-fallback.png, glyph SVGs
scripts/render-fixtures.mjs   writes preview-out/*.html from the fixtures, no Vercel needed
tests/render.test.mjs    escaping, state selection, "never a zero", indexing rule
package.json             { "type": "module" }, dependency: @vercel/og
vercel.json              rewrites + the /get redirects
```

`vercel.json` (the production switch happens in Phase 6, not here):

```json
{
  "rewrites": [
    { "source": "/u/:handle/og.png", "destination": "/api/portfolio-og?handle=:handle" },
    { "source": "/u/:handle", "destination": "/api/portfolio?handle=:handle" }
  ],
  "redirects": [
    { "source": "/get", "has": [{ "type": "header", "key": "user-agent", "value": ".*(iPhone|iPad).*" }],
      "destination": "https://apps.apple.com/app/id6758958604", "permanent": false },
    { "source": "/get", "has": [{ "type": "header", "key": "user-agent", "value": ".*Android.*" }],
      "destination": "https://play.google.com/store/apps/details?id=com.patchamp.peak", "permanent": false },
    { "source": "/get", "destination": "/files/download.html", "permanent": false }
  ]
}
```

Vercel environment variables (Production and Preview): `PEAK_PORTFOLIO_SOURCE_URL` and
`PEAK_RENDER_KEY`. The project stays a static site with functions: no framework preset, no build
command (to confirm in the Vercel project settings before the first deploy).

### Phase 3: build the page (mobile first, in this order)

1. Tokens, base styles, the top bar, the layout column, light and dark.
2. Identity: avatar or gradient initials, rosette, capsule, headline.
3. Open to collaborate: card and pill variants.
4. Featured: single card, carousel and page dots, image fallbacks.
5. Overview: both tiles, and the single-tile case.
6. Real Work: rows with and without verified work.
7. Expertise and Learning: rows, level icons, View all.
8. Closing card and footer, per state.
9. Sheets: project, company, Verified work; hash links; focus handling.
10. Whole-page states, then the unavailable and error pages, then canonical redirects.
11. The header name fade, press feedback, reduced motion.
12. Images through Vercel's optimizer (`/_vercel/image`, allow-listing
    `firebasestorage.googleapis.com`) at 2× their displayed size, falling back to the original URL.

### Phase 4: share preview

1. The meta tags in 2.7.
2. `api/portfolio-og.js`: the 1200×630 card from the same JSON, cached for a day (the `v` hash
   handles changes). The card may use Inter, since it is an image, not page text.
3. Test the unfurl in iMessage, WhatsApp, Slack, LinkedIn Post Inspector, the Facebook Sharing
   Debugger and X.

### Phase 5: quality checks

- The test profiles below, in light and dark, at 320, 375, 390, 430, 768, 1024 and 1440 px.
- Side by side with your six in-app screenshots: same order, titles, captions and icons.
- Safari on iPhone (VoiceOver, larger text, Smart App Banner on a real device), Chrome on Android,
  Safari, Chrome and Firefox on desktop.
- Keyboard only: every card, sheet and link.
- Lighthouse and axe: Accessibility 100; Performance 95 or better on a cached page; layout shift
  under 0.02.
- Security: a headline, note and project title containing `<script>`, quotes and emoji must render as
  text; deliverable links open with `rel="noopener nofollow ugc"`.

### Phase 6: launch and rollback

1. Phase 1 deploys first. The live page keeps working through the old route and simply gains
   display names.
2. This project's branch deploys as a Vercel preview. You review it on your phone with the fixtures
   and real handles.
3. The production switch is one commit to `vercel.json` (the new rewrites replace the proxy).
4. **Rollback:** revert that commit, or use Vercel's Instant Rollback. The function's HTML route is
   untouched, so the old page returns immediately.
5. After two stable weeks, propose removing the HTML renderer from the function (a backend change,
   so I will ask).

### Phase 7: documentation

Update `iOS-Peak/app_context.md` §14.4 (the page is now rendered on Vercel from the function's JSON)
and the header comment in `functions/portfolio.js`, and add a short rationale doc for the public page
alongside `docs/portfolio/PORTFOLIO_VIEWER_RATIONALE.md`. I will ask before committing anything.

### How to preview and test

- **Fixtures, anywhere:** `node scripts/render-fixtures.mjs` writes `preview-out/full.html`,
  `sparse.html`, `learning.html`, `empty.html`, `edge.html`, `unavailable.html` and `error.html`,
  which open directly in a browser.
- **Locally, with real data:** `vercel env pull`, then `vercel dev`, then
  `http://localhost:3000/u/<handle>`.
- **Preview deployments:** every push to the branch gets a Vercel preview URL for your phone. Fixtures
  are served at `/preview/portfolio/<name>` on previews only (that path is outside `/u/`, so it can
  never collide with a real handle, and it returns 404 in production).
- **Unit tests:** `node --test` in this project (renderer) and in `functions/` (data model).

**Test profiles**

| Profile | Shape | Checks |
|---|---|---|
| **Full** (fixture, like Sarah) | Photo, founder, Open to collaborate with a note and a skill, 3 featured, 4 verified projects at one company, a past company, 5 certifications including Expert | Carousel, both Overview tiles, View all, every sheet, the share image |
| **Sparse** (fixture, like Kait) | No photo, one company membership, nothing certified, no learning | Gradient initials, Real Work row without a chevron, not indexed |
| **Learning** (fixture, like Lukass) | Officer at a company, 2 skills in progress | "Learning" title and rows, no empty card |
| **Empty** (fixture) | No company, no skill, Open to collaborate off | Only the "Just getting started" card, closing card in its Peak-explainer form |
| **Edge** (fixture) | 120-character headline, very long name, pill-only Open to collaborate, featured pieces without images, a company without a logo, an SF Symbol credential icon, a skill not in the catalog, a hidden company present in the data, private and public deliverables, HTML in text fields | Nothing hidden leaks, nothing breaks |
| **Live** | `lukas`, `lukasthetester` (both empty today) and one full public profile you name | Real data end to end |

---

## 6. Risks and open questions

### 6.1 Open questions (my default in bold)

1. **Architecture (blocks the start).** Render on Vercel from the function's sanitized JSON?
   **Yes, as in section 0.**
2. **Backend change (blocks the start).** OK to change and deploy `publicPortfolio` as in Phase 1,
   and who deploys it, you or Patrik? **I prepare it in the Flutter repo, you or Patrik deploy.**
3. **Search indexing.** **Index only pages with at least one certification or verified project.**
   Or: keep every page out of search engines until there is an in-app setting.
4. **"Report this page".** Which address? The landing pages currently mention `hello@peak.app`,
   `support@peak.com` and a personal Gmail. **Leave the link out until you choose.**
5. **App Store.** The launch checklist lists id `6758958604` as a Belgian product page. Is the app
   available in every storefront? **The CTA and the Smart App Banner use it.** The landing page's own
   download buttons still point to TestFlight; switching them is a separate small change I can add.
6. **Blue.** **Contrast-safe `#0066CC` for blue text and `#0071E3` for the filled button**, or the
   app's exact `#007AFF` (fails WCAG AA for text and button labels)?
7. **Overview without a certification.** **Show only the Verified work tile, full width**, or the
   app's "Certified skill · None yet"?
8. **A full profile to test against.** A real handle with a full public portfolio (Sarah's, for
   example), or **fixtures only plus `lukas` and `lukasthetester`**?
9. **Company-written project descriptions on the open web.** **Keep parity with the app (shown,
   clamped)**, or show only the owner's own note on the web?
10. **Style guide.** It says `#0A84FF` is the accent, while the app's code uses `#007AFF` in light
    mode. **Follow the code here, and update the guide later.**

### 6.2 Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Two hops (Vercel → function → Firestore) and cold starts | A slow first view | Edge cache with stale-while-revalidate and stale-if-error; measure after launch; `minInstances: 1` on the function is possible but costs money (backend change, would ask) |
| Single-function deploy from a repo with uncommitted changes | Unreviewed code ships inside the function's bundle | Phase 0 step 2; load `index.js` locally before deploying; deploy only `publicPortfolio` |
| Ranking, headline and caption logic exists in Swift and in JavaScript | Web and app drift again | Same names as the Swift code, fixtures mirroring `PeakTests`, and a parity note in the function header |
| The JSON mode becomes a scraping API | Bulk structured access | Shared secret, `private, no-store`, same fields as the HTML |
| Platforms cache link previews (LinkedIn about 7 days) | Old cards after an edit | Content-hashed og:image URL |
| A new catalog skill has no icon on the web | Missing artwork | Fallback chain ends in the skill-colour disc; add the icon when adding a skill; re-copy `cyber_security.png` |
| Smart App Banner's `app-argument` | Open might not land on the profile | Verify on a device; at worst it just opens the app |
| Privacy changes linger in the cache | A hidden company stays visible for up to about 15 min | Short TTLs; 404s cached 60 s; purge on write later |
| The `vercel.json` switch touches the live route | Outage | Preview first; one-commit rollback; the function's HTML route stays untouched |
| Vercel image optimization quota | Cost or limits | Allow-listed host, 2× sizes, fallback to original URLs |
| No web font any more | Android and Windows render in Roboto or Segoe UI | Intended (native feel, as in the app); checked in Phase 5 |

---

## 7. Out of scope (needs in-app or backend work)

- **Contact on the public page** (email, LinkedIn, website, or "Message on Peak" for non-users).
  Needs a "Public page" section in the app's Edit sheet where the owner chooses what to show, new
  fields, and a rule change. This is the most valuable follow-up for recruiters.
- **Public page settings in the app:** page on or off (the "private" state is already designed in
  2.4), appear in search engines or not, and a preview of the web page.
- **Universal links** (`apple-app-site-association` hosted here + the associated-domains entitlement
  in the app): tapping a shared link would open Peak directly, and the web page could offer
  "Open in Peak" and Message.
- **Old handles after a rename:** reserve or redirect them (4.4, item 3).
- **Per-project public pages** (`/u/<handle>/p/<id>`) and **public company pages** on the web.
- **Image and PDF export** (placeholders in the app today).
- **Web analytics** for the page (needs a consent decision).
- **Other languages** (the page is English, like the app).

---

## 8. Noticed in the app (not touched, for later)

- The Overview's Verified work count (and Real Work) include legacy credentials without
  `public: true`, but the list behind the tile (`PortfolioAssignedAllView`) and the project page hide
  them ("This project is private."). A viewer can see "4 projects" and find 3.
- A viewer's Overview shows "Certified skill · None yet" when there is verified work but no
  certification.
- The style guide's accent (`#0A84FF`) differs from the code's light-mode `PeakBlue` (`#007AFF`).

---
---

# Part 2: Desktop and wide screens

> **Status: approved 2026-10-12 and implemented on `web-portfolio/desktop` (not yet committed or
> deployed).**
>
> **Decisions (Lukas, 2026-10-12):** every default in section 19. And **Get Peak goes to the App
> Store listing** on phones and computers, `https://apps.apple.com/us/app/peak-learn-any-skill/id6758958604`
> (the link from the listing's Share button; the id is the part the App Store needs, and without
> `/us/` Apple's website redirects to `/us/` anyway). Peak is also live on Google Play, so `/get`
> keeps sending Android there; every other device, computers included, now goes to the App Store
> instead of the beta download page. Question 5 is therefore settled for the portfolio; the
> download page itself is unchanged.
>
>
> **After reviewing the preview (Lukas, 2026-10-12):** on computers the QR code **replaces the Get
> Peak button** as well as the tagline, centred in the closing card with "Scan this with your
> iPhone to get Peak" beneath it. The code is itself the link to `/get` (named "Get Peak"), so
> keyboard and screen-reader visitors keep a way to the store. Phones and tablets keep the button.
> This supersedes 13.8 where they differ.
>
> **Found while implementing:** the old print rule never showed skills past the first four (its
> selector was weaker than View All's), and a Featured card without a note ended shorter than its
> neighbour in the grid. Both fixed.
>
> **Scope:** presentation only, in this project. No backend, JSON, Firestore or in-app change.
> **Phones (under 768 px) stay exactly as they are today:** every new rule sits behind a
> min-width or pointer media query, and the few markup changes are invisible below 768 px.
> Once approved, this part replaces "one centred column at every width" (the Layout row in 1.3,
> and 2.9).
>
> **Sources:** the live renderer (`portfolio/render.js`, `styles.css`, `page.js`); the app's
> components it mirrors (`PortfolioView.swift`, `PortfolioCards.swift`); `app_style_guide.md`;
> Lukas's HIG notes (`iOS-Peak/Human_Interface_Guidelines.md`); Apple's Human Interface Guidelines
> (Layout, Pointing devices, Sheets).

## 9. Read this first

### What I found

I rendered the fixtures at 768, 820, 1024, 1440 and 1920 px, in light and dark mode.

1. **The page is a phone column at every width.** At 1440 px the 640 px column fills 44% of the
   window, with 400 px of empty grey on each side. Nothing is broken, but it reads as a mobile
   site opened on a computer.
2. **Featured hides most of itself.** The carousel shows one piece out of up to three. A mouse
   can't swipe sideways, so the others are reachable only through small arrows that appear on
   hover. The band is 604 × 150 (4:1), so pictures are cropped harder than on the phone (2.4:1).
3. **The person scrolls away.** Once the identity leaves the screen, only the name in the bar
   remains, at 17 px.
4. **Hover feedback is a 1.5% darkening** (`brightness(0.985)`). It is barely visible in light
   mode, and in dark mode it darkens an already dark card.
5. **Opening a sheet shifts the page sideways** on Windows and on Macs set to always show
   scrollbars: `html:has(dialog[open]) { overflow: hidden }` removes the scrollbar, and the
   centred page moves into the freed space.
6. **Print and Save as PDF** (which recruiters use on computers) show only the first featured
   piece, because the carousel clips the rest.
7. **On a computer, Get Peak leads to the old beta page.** `/get` sends desktop visitors to
   `/files/download.html`, whose iPhone button is a TestFlight invite ("Peak is currently in
   beta"). Nothing helps a desktop visitor get the app onto their phone.
8. **The app has no wide layout to mirror.** `PortfolioView` is a phone column, even on iPad,
   where it simply stretches. So this part defines the wide arrangement from the app's components
   and principles, instead of copying an existing screen.
9. **Spacing is written inline** (`style="margin-top:30px"` on every block), so CSS cannot
   change it per width without `!important`.

### What I propose

**From 1024 px, two panes: the person on the leading (left) side, their work on the trailing
(right) side.**

- The identity (photo, name, headline) sits in a 300 px column on the left and stays in view
  while the work scrolls on the right. It replaces the bar's fading name.
- The work column keeps today's components, at the width they were designed for (604–660 px),
  in the app's order: Featured, Overview, Real Work, Expertise, then the closing card.
- **From 768 px, Featured becomes a grid that shows every piece:** the owner's first pick at full
  width, the others two across, lined up with the Overview tiles beneath. No carousel and no
  hidden work.
- Desktop polish: a real hover state, no sideways shift, a QR code that puts the app on the
  visitor's phone, and a print layout.

I sketched this against the fixtures (a throwaway stylesheet in a scratch folder, not in this
project) at 820, 1024, 1440 and 1920 px, in light and dark mode, including the empty, sparse and
edge fixtures. The wireframes below follow that sketch.

### Alternatives considered

| Option | Why not |
|---|---|
| Keep the one 640 px column | Still reads as a mobile page, and Featured keeps hiding two of three pieces. Fixing only Featured, hover and the sideways shift is the fallback if you prefer the column (question 1 in section 19). |
| One wide canvas: the identity centred on top, sections reflowed into 2–3 column grids (how the App Store adapts to iPad) | Closest to the app's vertical composition, but Peak profiles are short and uneven (one company, five skills, one featured piece). Grids end up half filled, a company row stretched to 1000 px puts a name and its chevron far apart, and the person scrolls away again. |
| **Two panes (chosen)** | Uses the width without stretching any component, keeps the person in view, works for every page state from empty to full, and leaves the app's order untouched. |

### What needs your approval

- **A.** The two panes from 1024 px, and the Featured grid from 768 px.
- **B.** The QR code in the closing card on computers (13.8).
- **C.** The open questions in section 19. Each has a default, so only A blocks the start.

## 10. Principles: the app's style and Apple's HIG in a wide window

- **Same page, more room.** Same sections, order, components, wording, colours and type as on the
  phone; only the arrangement changes. No section is added, dropped or reordered on desktop. This
  keeps the page's founding rule: a stranger sees what another Peak user would see.
- **The most important things at the top and on the leading side.** Your HIG notes (Visual
  hierarchy): people read "from top to bottom and from the leading to trailing side". So the
  person sits on the left and their best work at the top right.
- **Grids for a few image-led items, lists for text people scan.** Your HIG notes (Layout): a grid
  is "better for just a few items", a list "facilitates quick scanning". Featured (at most three
  pieces, each with a picture) becomes a grid; Real Work and Expertise stay lists.
- **Readable widths, not stretched ones.** No card is wider than 660 px and no line of text longer
  than about 75 characters, the idea behind Apple's readable content guide. Extra width becomes
  margin, not longer rows.
- **Aligned edges.** The two Featured cards, the two Overview tiles and the work column share one
  two-column grid. The bar's Peak mark lines up with the person's column.
- **Feedback only on things that act, and quietly** (HIG, Pointing devices). On hover, cards that
  open something lift with the style guide's single soft shadow. Nothing else reacts.
- **Sheets stay centred panels** on large screens (HIG, Sheets). This is already true from 768 px.
- **Restraint.** No new colours, sections or components. One new line of copy (the QR caption).
  Still one primary button.

## 11. Breakpoints

| Tier | Window width | Typical | Layout |
|---|---|---|---|
| Compact | under 768 px | iPhones in portrait, small windows | **Unchanged** |
| Medium | 768–1023 px | iPad in portrait, larger iPhones in landscape, narrow desktop windows | Today's 640 px column, with Featured as a grid and taller image bands |
| Wide | 1024 px and up | Laptops, desktops, iPad in landscape | Two panes |
| Pointer | `(hover: hover) and (pointer: fine)` | A mouse or trackpad, at any width | Hover states; the QR code (wide only) |

- **Width only, never the device.** An iPad in landscape gets the two panes, and a desktop window
  dragged narrow gets the phone layout.
- **Browser zoom reflows by design.** 1440 px at 200% is 720 CSS px, which gets the phone layout.
- The person's column stays in view (sticky) only when the window is at least 600 px tall.

## 12. The layouts

### 12.1 Wide, at 1440 × 900 (the full fixture)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [▲] Peak                                                                           │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  ┌─ person, 300 ────────┐      ┌─ work, up to 660 ─────────────────────────────┐   │
│  │                      │      │ Featured                                      │   │
│  │       (photo)        │      │ ┌───────────────────────────────────────────┐ │   │
│  │        112 px        │      │ │                 band 220                  │ │   │
│  │                      │      │ │ Website SEO Optimization           (Open) │ │   │
│  │ ( Sarah Lindqvist )  │      │ └───────────────────────────────────────────┘ │   │
│  │     Professional     │      │ ┌────────────────────┐ ┌────────────────────┐ │   │
│  │      Copywriter      │      │ │ band 150           │ │ band 150           │ │   │
│  │                      │      │ │ Spring Launc… Open │ │ Product Page… Open │ │   │
│  │   stays in view      │      │ └────────────────────┘ └────────────────────┘ │   │
│  │   while the work     │      │ ┌────────────────────┐ ┌────────────────────┐ │   │
│  │   scrolls (sticky)   │      │ │ [seal]             │ │ [skill icon]       │ │   │
│  │                      │      │ │ Verified work      │ │ Expert             │ │   │
│  │                      │      │ │ 4 projects         │ │ Copywriting        │ │   │
│  │                      │      │ └────────────────────┘ └────────────────────┘ │   │
│  └──────────────────────┘      │ Real Work      rows, as today                 │   │
│                                │ Expertise      grouped list, as today         │   │
│                                │ ┌───────────────────────────────────────────┐ │   │
│                                │ │ Verified on Peak · Get Peak · QR code     │ │   │
│                                │ └───────────────────────────────────────────┘ │   │
│                                └───────────────────────────────────────────────┘   │
│                                    Peak · Privacy · Terms · Report this page       │
└────────────────────────────────────────────────────────────────────────────────────┘
```

The first screen shows the person, all three featured pieces and the Overview. Real Work,
Expertise and the closing card follow on the second.

### 12.2 Medium, at 820 px (iPad in portrait)

```
┌─────────────────────────────────────────────┐
│ [▲] Peak          (name fades in)           │
├─────────────────────────────────────────────┤
│                 (photo 80)                  │
│             ( Sarah Lindqvist )             │
│           Professional Copywriter           │
│                                             │
│   Featured                                  │
│ ┌─────────────────────────────────────────┐ │
│ │                band 220                 │ │
│ │ Website SEO Optimization         (Open) │ │
│ └─────────────────────────────────────────┘ │
│ ┌───────────────────┐ ┌───────────────────┐ │
│ │ band 150          │ │ band 150          │ │
│ │ Spring Lau…  Open │ │ Product Pa…  Open │ │
│ └───────────────────┘ └───────────────────┘ │
│ ┌───────────────────┐ ┌───────────────────┐ │
│ │ Verified work     │ │ Expert            │ │
│ │ 4 projects        │ │ Copywriting       │ │
│ └───────────────────┘ └───────────────────┘ │
│   Real Work · Expertise · closing card      │
│   (as today)                                │
└─────────────────────────────────────────────┘
```

### 12.3 Page states on wide screens

| State | Person column | Work column |
|---|---|---|
| Full | Identity | Featured, Overview, Real Work, Expertise, closing card |
| Sparse | Identity | Real Work, Learning (if any), closing card |
| Learning | Identity | Real Work (if any), Learning, closing card |
| Empty | Identity | "Just getting started", closing card ("About Peak") |
| Unavailable, error | No panes | One card, centred in the window |

In the sketch, thin pages look calm rather than broken, because the work column starts level
with the photo.

## 13. Section by section

Wide screens unless stated. Any value not mentioned stays as in section 3.

### 13.1 Page and panes

- `<main>` becomes a two-column grid: `300px` for the person and `minmax(0, 1fr)` for the work
  (up to 660 px), a 56 px gap, a page at most 1080 px wide with 32 px side padding, and
  `align-items: start`.
- **Markup:** the sections after the identity are wrapped in one `<div class="work">`. The DOM
  order does not change (the identity, then the work in the app's order), so the reading order
  and Tab order match what the visitor sees: the person first, then the work from top to bottom.
- Only the portfolio page gets the panes (`main.portfolio`). The unavailable and error pages keep
  one column.
- The work column's first section title and the photo share a top edge, 40 px below the bar.
- Bottom padding 64 px.

### 13.2 Top bar

- Its content spans the page (1080 px), so the Peak mark lines up with the person's column instead
  of the edge of a 640 px column.
- **The name no longer fades into the bar on wide screens:** the person is always in view, so it
  would only repeat itself. The wordmark stays. On medium and compact screens the name fades in as
  it does today.
- The frosted background and the soft fade once content scrolls beneath it: unchanged.
- Nothing on the right (question 4 in section 19).

### 13.3 The person column

- The app's identity, centred in the column: photo or gradient initials, founder rosette, name
  capsule (the page's `<h1>`), headline. No card around it and nothing else in the column.
- Scaled up, because it is the page's anchor and is seen from further away: photo 112 px
  (initials 42.5 px), rosette 40 px (glyph 23 px, the same 3 px ring), name 17 px / 500 with
  8 × 18 padding, headline 17 px regular, up to 4 lines. The backend caps headlines at 120
  characters, so in practice they never truncate. Long names wrap inside the capsule, as on the
  phone.
- `position: sticky`, 40 px below the bar, only when the window is at least 600 px tall.
- **Why sticky:** a visitor reading the third project still sees whose work it is. On the phone
  the bar's name does that job; here there is room for the identity itself.

### 13.4 Featured (medium and wide)

A grid of every featured piece, in the owner's order: two columns, 10 px apart (the Overview's
gap, so the cards and tiles line up).

| Pieces | Layout |
|---|---|
| 1 | One card at full width, band 220 |
| 2 | Two cards side by side, band 150 each |
| 3 | The owner's first pick at full width (band 220), then the other two side by side (band 150) |

- The cards themselves are unchanged: band, title (one line, as in the app), note (one line) and
  the Open pill. A half-width card is 297–325 px wide, about the phone card's width, so titles
  truncate exactly as they do in the app. The sheet shows the full title.
- No dots and no arrows. The carousel roles (`aria-roledescription` "carousel" and "slide") apply
  only while the layout is a carousel (under 768 px); otherwise Featured is a plain, labelled list.
  `page.js` switches them with a `matchMedia` listener.
- The server writes `data-count` on the list, so the CSS picks the layout without `:has()`.
- The 8 px between Featured and Overview becomes 10 px, so the cards and tiles read as one grid.
- **Logo fallback** (question 3 in section 19). When a piece has no image and its company no
  banner, the app fills the band with the company logo, cropped to fill. In a 660 × 220 band that
  keeps only the middle third of a square logo, enlarged beyond its resolution. On medium and wide
  screens the logo is drawn whole instead: 72 px, radius 16, centred on the grey band, where the
  document glyph sits for pieces without any picture. Phones keep the app's crop.

### 13.5 Overview

Unchanged: two tiles of 297–325 px, or Verified work alone at full width.

### 13.6 Real Work

Unchanged: rows at the column's width. Rows with verified work open the company sheet; rows
without verified work stay inert.

### 13.7 Expertise and Learning

Unchanged: one grouped list, four rows, then View All. At 660 px a row reads like a macOS Settings
row, the look the app borrows.

### 13.8 Closing card, and the QR code (question 2 in section 19)

```
┌────────────────────────────────────────────────────────────┐
│                    (✓) Verified on Peak                    │
│      Certifications on Peak are earned by passing a        │
│      graded final challenge. Projects appear only after    │
│      the company they were done for approves them.         │
│                                                            │
│             (            Get Peak            )             │
│                                                            │
│                   ┌──────┐                                 │
│                   │  QR  │  Scan with your phone           │
│                   │ code │  to get Peak                    │
│                   └──────┘                                 │
└────────────────────────────────────────────────────────────┘
```

- Unchanged on phones and tablets.
- On wide screens with a mouse or trackpad, a small hand-off row replaces the tagline under Get
  Peak: a QR code on a white tile (96 px including its quiet zone, radius 12, black on white in
  both modes so every camera reads it), with "Scan with your phone to get Peak" beside it (13 px,
  secondary text).
- The code points to `https://www.peakofficial.app/get`, which already sends an iPhone to the App
  Store and an Android phone to Google Play. It is a static SVG generated once by a script, with no
  library at runtime, and loaded lazily, so phones never download it.
- The row is hidden from screen readers (`aria-hidden`), because it duplicates the Get Peak link,
  which stays the page's one button.
- **Why:** Peak is a phone app. Today a desktop visitor who clicks Get Peak lands on a beta page;
  the code puts the app on the device that can run it, in one step.

### 13.9 Footer

Under the work column, centred on it. The person's column is empty at that height.

### 13.10 Sheets

Already centred panels from 768 px (560 px wide, radius 25). One change: from 768 px the image
band is 220 px tall, so the panel's picture keeps the phone's proportions instead of becoming a
thin 3.5:1 strip. Escape, a click outside, ✕ and Back still close it.

### 13.11 Unavailable and error pages

One column. From 768 px the card is centred vertically in the window, instead of sitting at the
top of an otherwise empty screen.

### 13.12 The medium tier, in short

Today's 640 px column, the phone-sized identity and the bar's fading name, plus: the Featured
grid, 220 px bands (Featured and sheets), the whole-logo fallback and centred message pages.

## 14. Interaction, accessibility and motion

- **Hover, on pointer devices only,** for things that open something: Featured cards, Overview
  tiles, company rows with a chevron, and the rows inside sheets. Light mode: the style guide's one
  shadow (`0 1px 16px 1px rgb(0 0 0 / 0.06)`). Dark mode: the card fill lightens to `#232325`
  (web-only: a shadow is invisible on black, and the Open pill's `#2C2C2E` must stay distinct).
  0.2 s ease. This replaces the `brightness` filter. Expertise rows and company rows without
  verified work don't react, because they don't act.
- **Press feedback** (scale 0.98 for cards, 0.97 for buttons): unchanged.
- **No sideways shift:** `scrollbar-gutter: stable` on `<html>`, so locking the scroll for a sheet
  keeps the scrollbar's space.
- **Keyboard:** without the carousel, from 768 px every piece is a Tab stop, in order. Focus
  rings, Escape and focus return: unchanged.
- **Screen readers:** one `h1` (the name, now in the person column), the same `h2`s, Featured
  announced as a list, the QR row hidden.
- **Reduced motion:** hover changes instantly; everything else as today.
- **Zoom and text size:** the panes need 1024 CSS px. Zooming in falls back to one column, with no
  horizontal scrolling (WCAG 1.4.10).

## 15. Images

- Each Featured band gets a `sizes` value for its actual slot. Full width:
  `(min-width: 1024px) 660px, (min-width: 768px) 604px, calc(100vw - 36px)`. Half width:
  `(min-width: 1024px) 325px, (min-width: 768px) 297px, calc(100vw - 36px)`. The full-width
  band's `srcset` adds 1920, because a 660 px band on a 2× screen needs 1320 px.
- The photo gets a `srcset` of 160, 256 and 384 with `sizes="(min-width: 1024px) 112px, 80px"`.
  Today it is one 160 px file, too small for 112 px on a 2× screen.
- Same image-slot URLs, same fade-in, fixed dimensions, no layout shift.

## 16. Print and Save as PDF

- Always one column, at any paper width; the person column is not sticky.
- Featured prints as the grid, so every piece appears.
- Cards keep their shape with a hairline border (browsers drop background colours when printing,
  which would merge the white cards into the page), are never split across pages, and print
  without shadows.
- Hidden: the bar, the footer links, sheets, View All and the QR row (the first four already are).
  All skills are listed, as today.

## 17. Changes by file

| File | Change |
|---|---|
| `portfolio/render.js` | The `.work` wrapper and `main.portfolio`; spacing as classes (`gap-8` … `gap-40`) instead of inline styles; Featured `data-count` and per-slot `sizes`; the photo's `srcset`; a `band-logo` class on logo-filled bands; the QR row in the closing card |
| `portfolio/styles.css` | Wide tokens (`--page-max`, `--rail`, `--pane-gap`, `--page-pad`, `--band-tall`); the medium, wide and pointer rules; `scrollbar-gutter`; print rules. Compact rules untouched |
| `portfolio/page.js` | Carousel roles only under 768 px (about 15 lines) |
| `portfolio/copy.js` | `qrCaption: 'Scan with your phone to get Peak'` |
| `portfolio/fixtures/solo.json`, `handler.js` (`FIXTURE_NAMES`) | A profile with one featured piece, which falls back to a company logo |
| `scripts/make-qr.mjs`, `assets/portfolio/get-qr.svg` | Writes the QR code once; the SVG is committed |
| `package.json` | Dev dependency `qrcode`, pinned, used only by the script |
| `tests/render.test.mjs` | The tests in step D9 |

Unchanged: `vercel.json`, `api/*`, the routes in `handler.js`, `og.js` (the share image), the
backend and the app.

## 18. Implementation steps

Every step leaves `npm test` green and phones unchanged. Commits are split the same way, and I
ask before committing.

- **D0. Approvals:** A, B and anything in section 19.
- **D1. Branch and baseline.** Create `web-portfolio/desktop` from `main` (25e608d) in this
  project. Add `solo.json`. Screenshot every fixture at 375 and 430 px, light and dark: the phone
  pages must still match these at the end.
- **D2. Markup** (invisible on phones): the `.work` wrapper, `main.portfolio`, spacing classes,
  `data-count`, `band-logo`. Re-check the baseline: identical.
- **D3. Medium tier:** the Featured grid, 220 px bands, the whole-logo fallback, centred message
  pages, and the carousel roles in `page.js`.
- **D4. Wide tier:** the panes, the sticky person column with its height guard, the larger
  identity, the bar's width and its name staying out, the footer's alignment.
- **D5. Pointer and scrolling:** hover states and `scrollbar-gutter`.
- **D6. QR code:** the script, the SVG and the row. Check that it scans from a laptop screen with
  an iPhone and an Android phone, in light and dark mode.
- **D7. Images:** `sizes`, `srcset` and the photo's set.
- **D8. Print:** Chrome and Safari, A4 and Letter.
- **D9. Tests:**
  - The identity comes first in `<main>`, outside `.work`; every section is inside `.work`, in
    the app's order.
  - No block carries an inline `margin-top`.
  - `data-count` is 1, 2 and 3 for `solo`, `edge` and `full`; full-width and half-width bands
    carry their own `sizes`.
  - The QR row appears once, inside the closing card, `aria-hidden` and lazy, pointing at
    `/assets/portfolio/get-qr.svg`, and never on the unavailable or error page.
  - A logo-filled band is marked `band-logo`; a band showing a project image or a banner never is.
  - The existing 27 tests still pass, unchanged.
- **D10. QA:** the matrix below.
- **D11. Launch.** Push the branch: Vercel builds a preview to review on your laptop, iPad and
  phone, with the fixtures at `/preview/portfolio/<name>` and real handles. Merging to `main`
  deploys to production. **Rollback:** revert the merge. No backend step.
- **D12. Docs.** A "Wide screens" section in `PUBLIC_WEB_PORTFOLIO_RATIONALE.md`, one line in
  `app_context.md` §14.4 and the branch note, in the iOS repo's `web-portfolio/redesign` worktree.
  I ask before committing.

### QA matrix

| Check | What |
|---|---|
| Widths | 375 and 430 (must match the baseline), 768, 820, 1024, 1180, 1280, 1440, 1920 |
| Heights | 600 and 900 at 1280 px (the sticky guard) |
| Modes | Light and dark |
| Fixtures | full, solo, edge, sparse, learning, empty, unavailable, error |
| Browsers | Safari, Chrome and Firefox on macOS; Chrome or Edge on Windows (the scrollbar shift); Safari on iPad in both orientations |
| Keyboard | Every card, sheet and link; Tab, Shift-Tab, Escape |
| Zoom | 200% at 1440 px; a larger text size in Safari |
| Audits | axe: no violations at 1440 px, light and dark. Lighthouse desktop: Accessibility 100, Performance 95 or better, layout shift under 0.02 |
| Print | Chrome and Safari, A4 and Letter |
| QR code | Scans from a laptop screen in light and dark mode, with an iPhone and an Android phone |

## 19. Open questions (my default in bold)

1. **Layout.** **Two panes from 1024 px**, or keep one column and only fix Featured, hover and the
   sideways shift?
2. **A QR code on computers**, in the closing card. **Yes**, or keep Get Peak alone?
3. **Logo fallback in wide bands.** **Draw the logo whole and centred on medium and wide screens**
   (phones keep the app's crop), or crop it as the app does at every width?
4. **A Get Peak pill in the bar on wide screens**, like the Buy button in apple.com's product
   bars? **No:** the page keeps one call to action, at its end.
5. **The download page** still offers the TestFlight beta, and desktop visitors land there. **Leave
   it to a separate landing-page change** (pointing its iPhone button to App Store listing
   6758958604), or include that change in this branch?

## 20. Risks

| Risk | Effect | Mitigation |
|---|---|---|
| A new rule reaches phones | The live mobile page changes | Every new rule behind a min-width or pointer query; markup changes invisible under 768 px; baseline screenshots at 375 and 430 compared before merging |
| Short windows | A sticky column taller than the window can't be read | Sticky only from 600 px tall |
| The same company banner twice | Two pieces without their own image show the same banner side by side (on the phone they are a swipe apart) | The app's rule, kept as is |
| iPadOS Safari requests desktop sites | It identifies as a Mac, so `/get` sends iPad visitors to the download page instead of the App Store | Existing behaviour; the Smart App Banner still offers the App Store on iPad. To handle with the download page (question 5) |
| More inline CSS | Every page carries about 3–4 KB more CSS | Still one request, no web font, cached at the edge |
| A QR code that doesn't scan | Looks broken | A fixed URL, error correction M, a full quiet zone, black on white, tested on devices (D6) |
