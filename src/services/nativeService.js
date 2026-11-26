/**
 * DocQevrilo – Native Android / Capacitor Integration Layer
 *
 * Safely wraps Capacitor plugins so all calls are no-ops or clean web fallbacks
 * when running in a standard desktop/mobile browser.
 */
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

const NATIVE_TOKEN_KEY = 'sv_native_token';

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const nativeTokenStore = {
  async save(token) {
    if (!Capacitor.isNativePlatform() || !token) return;
    try {
      await Preferences.set({ key: NATIVE_TOKEN_KEY, value: token });
    } catch (_) {}
  },
  async load() {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const { value } = await Preferences.get({ key: NATIVE_TOKEN_KEY });
      return value || null;
    } catch (_) {
      return null;
    }
  },
  async clear() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Preferences.remove({ key: NATIVE_TOKEN_KEY });
    } catch (_) {}
  },
};

export async function nativeShare({ title, text, url }) {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({ title, text, url, dialogTitle: title || 'Share via DocQevrilo' });
      return true;
    } catch (_) {
      return false;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (_) {}
  }
  if (typeof navigator !== 'undefined' && navigator.clipboard && (url || text)) {
    try {
      await navigator.clipboard.writeText(url || text);
      return true;
    } catch (_) {}
  }
  return false;
}

export async function saveFileOnNative(blobOrUrl, filename = 'docqevrilo-file') {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = typeof blobOrUrl === 'string' ? await fetch(blobOrUrl) : null;
    const blob = res ? await res.blob() : blobOrUrl;
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = String(reader.result || '');
        resolve(result.includes(',') ? result.split(',')[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const written = await Filesystem.writeFile({
      path: `DocQevrilo/${safeName}`,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });
    return written.uri || true;
  } catch (_) {
    return false;
  }
}

export async function initNativeShell({ onDeepLink, onNetworkChange, onAppStateChange } = {}) {
  if (!Capacitor.isNativePlatform()) return () => {};

  const listeners = [];
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0B0B0D' });
  } catch (_) {}

  try {
    await SplashScreen.hide();
  } catch (_) {}

  try {
    const status = await Network.getStatus();
    onNetworkChange?.(status.connected);
    const netHandle = await Network.addListener('networkStatusChange', (s) => {
      onNetworkChange?.(s.connected);
    });
    listeners.push(netHandle);
  } catch (_) {}

  try {
    const urlHandle = await CapApp.addListener('appUrlOpen', ({ url }) => {
      if (url) onDeepLink?.(url);
    });
    listeners.push(urlHandle);
  } catch (_) {}

  try {
    const stateHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
      onAppStateChange?.(isActive);
    });
    listeners.push(stateHandle);
  } catch (_) {}

  return () => {
    listeners.forEach((h) => {
      try {
        h.remove();
      } catch (_) {}
    });
  };
}
