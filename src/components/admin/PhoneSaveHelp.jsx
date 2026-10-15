import { useState } from 'react';

const mono = "'Space Mono', monospace";

// One-time setup for saving ideas from a phone's share menu. Android uses the
// admin web app's share target (public/admin/manifest.webmanifest); iPhone has
// no web share target, so an Apple Shortcut opens /admin/ideas?url=… instead.
// Both land on the same handler in Ideas.jsx.
export default function PhoneSaveHelp({ onClose }) {
  const shortcutUrl = `${window.location.origin}/admin/ideas?url=`;
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState(() => (/iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'android'));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shortcutUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is selectable below.
    }
  };

  const step = (n, children) => (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ flexShrink: 0, width: 20, height: 20, border: '1px solid rgba(255,85,0,0.5)', color: '#ff5500', fontFamily: mono, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
      <span style={{ color: '#bbb', fontSize: 13, lineHeight: 1.55 }}>{children}</span>
    </li>
  );
  const b = text => <b style={{ color: '#fff', fontWeight: 600 }}>{text}</b>;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: mono, fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Save ideas from your phone</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', display: 'flex' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[['android', 'Android'], ['ios', 'iPhone']].map(([id, name]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? '#ff5500' : 'transparent'}`, color: tab === id ? '#ff5500' : '#555', fontFamily: mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              {name}
            </button>
          ))}
        </div>

        <div style={{ padding: 18, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 14px', color: '#777', fontSize: 12, lineHeight: 1.5 }}>
            One-time setup per phone. Afterwards, tap {b('Share')} on any Instagram post, Pinterest pin or MakerWorld model and it lands in Inbox.
          </p>

          {tab === 'android' ? (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {step(1, <>Open this page in {b('Chrome')} on your phone and log in.</>)}
              {step(2, <>Tap the {b('⋮')} menu → {b('Install app')} (or {b('Add to Home screen')} → {b('Install')}).</>)}
              {step(3, <>In Instagram, Pinterest or MakerWorld tap {b('Share')} and pick {b('LC Ideas')}. You may need {b('More')} the first time.</>)}
            </ol>
          ) : (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {step(1, <>Open this page in {b('Safari')} and log in once, so the shortcut lands signed in.</>)}
              {step(2, <>Open the {b('Shortcuts')} app → {b('+')} → name it {b('Save to Layercade')}.</>)}
              {step(3, <>Tap {b('ⓘ')} (or the name ▾ → Details) → turn on {b('Show in Share Sheet')}; set it to receive {b('URLs')} and {b('Text')}.</>)}
              {step(4, <>Add the action {b('URL Encode')} (it encodes the {b('Shortcut Input')}).</>)}
              {step(5, (
                <>
                  Add the action {b('Open URLs')}, paste this, then tap after it and insert the {b('URL Encoded Text')} variable:
                  <span style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <code style={{ flex: 1, minWidth: 0, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', padding: '7px 9px', color: '#ff5500', fontSize: 11, overflowWrap: 'anywhere', userSelect: 'all' }}>{shortcutUrl}</code>
                    <button onClick={copy} style={{ flexShrink: 0, background: 'none', border: '1px solid rgba(255,85,0,0.4)', color: '#ff5500', cursor: 'pointer', padding: '0 10px', fontFamily: mono, fontSize: 9, textTransform: 'uppercase' }}>
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                </>
              ))}
              {step(6, <>In Instagram, Pinterest or MakerWorld tap {b('Share')} → {b('Save to Layercade')}. Safari opens and saves it.</>)}
            </ol>
          )}

          <p style={{ margin: '16px 0 0', color: '#555', fontSize: 11, lineHeight: 1.5 }}>
            If you&apos;re logged out, you&apos;ll be asked to log in and the link is saved straight after.
          </p>
        </div>
      </div>
    </div>
  );
}
