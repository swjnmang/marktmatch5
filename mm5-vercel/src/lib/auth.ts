import crypto from "crypto";

/**
 * Generiert einen einfachen Gruppen-Code (z.B. "A3F7K")
 */
export function generateGroupCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generiert eine einfache Admin-PIN (z.B. "4726" - nur Zahlen)
 */
export function generateAdminPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString(); // 4-stellige Zahl
}

/**
 * Hasht eine PIN mit SHA256
 */
export function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

/**
 * Validiert eine PIN gegen ihren Hash
 */
export function validatePin(pin: string, hash: string): boolean {
  return hashPin(pin) === hash;
}

/**
 * Speichert PIN im localStorage (für Test/Demo)
 * In Produktion würde das auf dem Server laufen
 */
export function savePinToLocalStorage(pin: string, gameId: string): void {
  const pins = JSON.parse(localStorage.getItem("adminPins") || "{}");
  pins[gameId] = hashPin(pin);
  localStorage.setItem("adminPins", JSON.stringify(pins));
}

/**
 * Prüft PIN aus localStorage
 * Wenn kein pin-Parameter gegeben, nur checken ob PIN existiert
 */
export function checkPinFromLocalStorage(gameId: string, pin?: string): boolean {
  try {
    const pins = JSON.parse(localStorage.getItem("adminPins") || "{}");
    if (!pins[gameId]) return false;
    if (!pin) return true; // Nur prüfen ob PIN existiert
    return validatePin(pin, pins[gameId]);
  } catch (e) {
    console.warn("Error checking PIN:", e);
    return false;
  }
}
