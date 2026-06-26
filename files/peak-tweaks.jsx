/* Peak landing — Tweaks panel */
const { useState, useEffect } = React;

function PeakTweaks() {
  const [tweaks, setTweak] = useTweaks(window.PEAK_TWEAKS);

  // apply theme live
  useEffect(() => {
    document.body.dataset.theme = tweaks.theme === 'dark' ? 'dark' : 'light';
  }, [tweaks.theme]);

  // apply CTA mode + headline live (without full rerun, just rebuild)
  useEffect(() => {
    window.PEAK_TWEAKS = tweaks;
    // Re-run the renderCTAs script logic
    const heroRow = document.querySelector('[data-cta-row]');
    const finalSlot = document.querySelector('[data-final-cta]');
    const navCta = document.querySelector('[data-cta-link]');
    if (!heroRow || !finalSlot || !navCta) return;

    const IOS_URL = 'https://testflight.apple.com/join/XkunrTkg';
    const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.patchamp.peak';

    const wl = (big) => `
      <form class="${big ? 'final-waitlist' : 'waitlist'}" onsubmit="event.preventDefault(); this.querySelector('input').value=''; this.querySelector('button').textContent='✓ You\\'re on the list'; setTimeout(()=>this.querySelector('button').textContent='Get early access',2400);">
        <input type="email" required placeholder="you@email.com" />
        <button type="submit" class="btn btn-primary">Get early access</button>
      </form>`;
    const stores = `
      <a class="btn-store" data-store="ios" href="${IOS_URL}" target="_blank" rel="noopener"><img src="assets/apple_logo.png" width="20" height="24" alt="Apple" style="object-fit:contain;flex-shrink:0" /><span><span class="lbl-small">Download on the</span><span class="lbl-big">App Store</span></span></a>
      <a class="btn-store" data-store="android" href="${ANDROID_URL}" target="_blank" rel="noopener"><img src="assets/googleplay_logo.png" width="22" height="22" alt="Google Play" style="object-fit:contain;flex-shrink:0" /><span><span class="lbl-small">Get it on</span><span class="lbl-big">Google Play</span></span></a>`;

    if (tweaks.ctaMode === 'live') {
      heroRow.innerHTML = `<div class="hero-cta" style="display:flex;gap:12px;flex-wrap:wrap;margin:0">${stores}</div>`;
      finalSlot.innerHTML = `<div class="stores">${stores}</div>`;
      navCta.textContent = 'Download';
      navCta.setAttribute('href', 'download.html');
    } else {
      heroRow.innerHTML = wl(false);
      finalSlot.innerHTML = wl(true);
      navCta.textContent = 'Join waitlist';
      navCta.setAttribute('href', '#cta');
    }

    const h = document.querySelector('[data-headline]');
    if (h) {
      if (tweaks.headlineVariant === 'show') {
        h.innerHTML = 'Stop saying you know it.<br/><span class="accent">Show what you built.</span>';
      } else if (tweaks.headlineVariant === 'portfolio') {
        h.innerHTML = 'A skills app that<br/>builds your <span class="accent">portfolio.</span>';
      } else {
        h.innerHTML = 'Learn real skills.<br/>Build the <span class="accent">proof.</span>';
      }
    }
  }, [tweaks.ctaMode, tweaks.headlineVariant]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection title="Theme">
        <TweakRadio
          label="Mode"
          value={tweaks.theme}
          options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}
          onChange={(v) => setTweak('theme', v)}
        />
      </TweakSection>
      <TweakSection title="CTA mode">
        <TweakRadio
          label="State"
          value={tweaks.ctaMode}
          options={[{value:'waitlist',label:'Waitlist'},{value:'live',label:'Live (stores)'}]}
          onChange={(v) => setTweak('ctaMode', v)}
        />
      </TweakSection>
      <TweakSection title="Headline">
        <TweakRadio
          label="Copy"
          value={tweaks.headlineVariant}
          options={[
            {value:'prove',label:'Prove'},
            {value:'show',label:'Show'},
            {value:'portfolio',label:'Portfolio'},
          ]}
          onChange={(v) => setTweak('headlineVariant', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = document.createElement('div');
document.body.appendChild(root);
ReactDOM.createRoot(root).render(<PeakTweaks />);
