import crypto from "crypto";

/**
 * Generiert einen zufälligen Gruppen-Code (z.B. "GRP-A7F2B")
 */
export function generateGroupCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "GRP-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generiert eine zufällige Admin-PIN (alphanumerisch, 8 Zeichen)
 * Beispiel: "K7m2P9qL"
 */
export function generateAdminPin(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let pin = "";
  for (let i = 0; i < 8; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
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
 */
export function checkPinFromLocalStorage(gameId: string, pin: string): boolean {
  const pins = JSON.parse(localStorage.getItem("adminPins") || "{}");
  if (!pins[gameId]) return false;
  return validatePin(pin, pins[gameId]);
}
