// Keyboard hints should name the key the viewer actually has: ⌘ on Apple
// devices, Ctrl everywhere else (Windows, Linux, ChromeOS). The shortcut
// handlers accept either, so this only changes what we print.

function detectApple() {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  return /mac|iphone|ipad|ipod/i.test(platform) || /Mac OS X/.test(navigator.userAgent);
}

export const IS_APPLE = detectApple();

// "⌘K" on a Mac, "Ctrl K" on Windows.
export function shortcutLabel(key) {
  return IS_APPLE ? `⌘${key}` : `Ctrl ${key}`;
}
