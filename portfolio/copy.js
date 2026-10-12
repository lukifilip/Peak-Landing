// Every visitor-facing string on the public portfolio, in one place.
//
// Wording follows the iOS app's PortfolioView as another user sees it
// (section titles, captions, standings), so a person reads the same on the web
// and in the app. Speaks to the visitor about the person, never to the owner.

export const COPY = {
  brand: 'Peak',
  skipLink: 'Skip to content',
  founder: 'Founder',

  // Section titles (as in the app)
  featured: 'Featured',
  realWork: 'Real Work',
  expertise: 'Expertise',
  learning: 'Learning',
  viewAll: 'View All',
  viewLess: 'View Less',

  // Featured
  open: 'Open',
  carouselLabel: 'Featured work',
  previous: 'Previous',
  next: 'Next',
  slideLabel: (i, n) => `${i} of ${n}`,

  // Overview
  verifiedWork: 'Verified work',
  projectCount: (n) => (n === 1 ? '1 project' : `${n} projects`),

  // Real Work
  verifiedProjects: (n) => (n === 1 ? '1 verified project' : `${n} verified projects`),
  companyFallback: 'Company',

  // Sheets
  close: 'Close',
  back: 'Back',
  verified: 'Verified',
  approvedBy: (name) => `Approved by ${name}`,
  whatIDid: 'What I did',
  deliverables: 'Deliverables',
  showMore: 'Show more',
  showLess: 'Show less',
  opensInNewTab: '(opens in a new tab)',
  untitled: 'Untitled Project',

  // Empty page
  emptyTitle: 'Just getting started',
  emptyBody: (name) =>
    `${name} is new to Peak. Certifications and verified projects appear here as they're earned.`,

  // Closing card
  closingTitle: 'Verified on Peak',
  closingBody:
    'Certifications on Peak are earned by passing a graded final challenge. ' +
    'Projects appear only after the company they were done for approves them.',
  closingTitleEmpty: 'About Peak',
  closingBodyEmpty:
    'Peak is where people learn in-demand skills, earn certifications by passing graded ' +
    'challenges, and prove them with real projects for real companies.',
  getPeak: 'Get Peak',
  tagline: 'Learn a skill. Prove it with real work.',
  qrCaption: 'Scan with your phone to get Peak',

  // Footer
  privacy: 'Privacy',
  terms: 'Terms',
  report: 'Report this page',

  // Unavailable and error pages
  unavailableTitle: "This portfolio isn't available",
  unavailableBody: 'The link may be mistyped, or the person may have changed their username.',
  goToPeak: 'Go to Peak',
  errorTitle: "This portfolio couldn't load",
  errorBody: 'Something went wrong on our side. Please try again in a moment.',
  tryAgain: 'Try again',

  // Share preview
  pageTitle: (name) => `${name} on Peak`,
  ogAlt: (name, headline) => `${name}'s portfolio on Peak: ${headline}`,
  descBuilding: (name) => `${name} is building a verified portfolio on Peak.`,
  descLearning: (skill) => `Learning ${skill} on Peak`,
  descVerifiedAt: (count, companies) =>
    `${count === 1 ? '1 verified project' : `${count} verified projects`}` +
    (companies.length > 0 ? ` at ${listNames(companies)}` : ''),
  certifiedIn: (level, skill) => `Certified ${level} in ${skill}`,
  genericTitle: 'Peak',
  genericDescription: 'Learn a skill. Prove it with real work.',
};

/** "SEO", "SEO and Copywriting", "SEO, Copywriting and Design". */
export function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
