// "Telefonga o'rnatish": brauzer ilovani o'rnatishga tayyor bo'lsa beforeinstallprompt
// hodisasini beradi. Uni sahifa ochilishi bilan ushlab qolamiz (keyin tugma bosilganda ishlatamiz)
let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(installState()));

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  emit();
});
window.addEventListener("appinstalled", () => {
  deferred = null;
  emit();
});

export const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

// iPhone/iPad Safari'da o'rnatish faqat "Ulashish -> Bosh ekranga" orqali
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function installState() {
  if (isStandalone()) return "installed";
  if (deferred) return "ready";
  if (isIOS()) return "ios";
  return "unavailable";
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  fn(installState());
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferred) return false;
  deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}
