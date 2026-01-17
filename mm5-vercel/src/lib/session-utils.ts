/**
 * Session Management Utilities
 * Handles group session persistence, validation, and multi-device protection
 */

export interface SessionData {
  groupId: string;
  gameId: string;
  deviceId: string;
  lastActivity: number; // timestamp
  createdAt: number; // timestamp
}

/**
 * Generate a unique device ID for this browser/device
 */
export function getOrCreateDeviceId(): string {
  const storageKey = "mm5_device_id";
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    // Create new device ID: timestamp + random string
    deviceId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(storageKey, deviceId);
  }
  
  return deviceId;
}

/**
 * Save a group session to localStorage
 */
export function saveSession(groupId: string, gameId: string): void {
  const deviceId = getOrCreateDeviceId();
  const session: SessionData = {
    groupId,
    gameId,
    deviceId,
    lastActivity: Date.now(),
    createdAt: Date.now(),
  };
  
  console.log(`[SaveSession] Saving session for groupId=${groupId}, gameId=${gameId}`);
  console.log(`[SaveSession] Device ID: ${deviceId.substring(0, 20)}...`);
  
  localStorage.setItem(`session_${gameId}`, JSON.stringify(session));
  console.log(`[SaveSession] ✓ Set localStorage.session_${gameId}`);
  
  // Also save individual keys for backward compatibility
  localStorage.setItem(`group_${gameId}`, groupId);
  localStorage.setItem(`gameId_${groupId}`, gameId);
  localStorage.setItem(`session_device_${gameId}`, deviceId);
  localStorage.setItem(`session_activity_${gameId}`, Date.now().toString());
  
  console.log(`[SaveSession] ✓ Saved all session keys for game ${gameId}`);
}

/**
 * Update last activity timestamp for current session
 */
export function updateSessionActivity(gameId: string): void {
  const sessionStr = localStorage.getItem(`session_${gameId}`);
  
  if (sessionStr) {
    try {
      const session: SessionData = JSON.parse(sessionStr);
      const oldTime = new Date(session.lastActivity).toLocaleTimeString();
      session.lastActivity = Date.now();
      const newTime = new Date(session.lastActivity).toLocaleTimeString();
      
      localStorage.setItem(`session_${gameId}`, JSON.stringify(session));
      console.log(`[UpdateActivity] Game ${gameId}: ${oldTime} → ${newTime}`);
    } catch (e) {
      console.error("[UpdateActivity] Error updating session activity:", e);
    }
  } else {
    console.warn(`[UpdateActivity] ✗ No session found for game ${gameId}`);
  }
  
  // Also update individual key for compatibility
  localStorage.setItem(`session_activity_${gameId}`, Date.now().toString());
}

/**
 * Get current session if it exists
 */
export function getSession(gameId: string): SessionData | null {
  const sessionStr = localStorage.getItem(`session_${gameId}`);
  
  if (!sessionStr) {
    console.log(`[GetSession] Game ${gameId}: No session_${gameId} in localStorage`);
    return null;
  }
  
  try {
    const session = JSON.parse(sessionStr);
    console.log(`[GetSession] Game ${gameId}: Found session (groupId=${session.groupId})`);
    return session;
  } catch (e) {
    console.error(`[GetSession] Game ${gameId}: Error parsing session:`, e);
    return null;
  }
}

/**
 * Check if session is valid (exists and not expired)
 * @param gameId Game ID
 * @param expiryMinutes Session expires after this many minutes of inactivity (default: 90)
 */
export function isSessionValid(gameId: string, expiryMinutes: number = 90): boolean {
  const session = getSession(gameId);
  
  console.log(`[SessionValid] Checking session for game ${gameId}:`);
  console.log(`[SessionValid] Session found: ${session ? "YES" : "NO"}`);
  
  if (!session) {
    console.log(`[SessionValid] ✗ No session data in localStorage`);
    return false;
  }
  
  const now = Date.now();
  const expiryMs = expiryMinutes * 60 * 1000;
  const timeSinceActivity = now - session.lastActivity;
  const isExpired = timeSinceActivity > expiryMs;
  
  console.log(`[SessionValid] Session data: groupId=${session.groupId}, createdAt=${new Date(session.createdAt).toLocaleTimeString()}`);
  console.log(`[SessionValid] Last activity: ${new Date(session.lastActivity).toLocaleTimeString()} (${Math.round(timeSinceActivity / 1000)}s ago)`);
  console.log(`[SessionValid] Expiry after ${expiryMinutes}min inactivity: ${isExpired ? "EXPIRED ✗" : "VALID ✓"}`);
  
  if (isExpired) {
    console.log(`[SessionValid] ✗ Session expired (inactive for ${Math.round(timeSinceActivity / 60000)}min)`);
    clearSession(gameId);
    return false;
  }
  
  return true;
}

/**
 * Check if this device matches the session device
 * Used to prevent multi-device access to same group session
 */
export function isDeviceAuthorized(gameId: string): boolean {
  const session = getSession(gameId);
  const currentDeviceId = getOrCreateDeviceId();
  
  console.log(`[DeviceAuth] Checking device authorization for game ${gameId}:`);
  
  if (!session) {
    console.log(`[DeviceAuth] ✗ No session found`);
    return false;
  }
  
  const isAuthorized = session.deviceId === currentDeviceId;
  
  console.log(`[DeviceAuth] Session device: ${session.deviceId.substring(0, 20)}...`);
  console.log(`[DeviceAuth] Current device: ${currentDeviceId.substring(0, 20)}...`);
  console.log(`[DeviceAuth] Match: ${isAuthorized ? "YES ✓" : "NO ✗"}`);
  
  if (!isAuthorized) {
    console.warn(`[DeviceAuth] ✗ Device mismatch!`);
  }
  
  return isAuthorized;
}

/**
 * Clear session from localStorage
 */
export function clearSession(gameId: string): void {
  const groupId = localStorage.getItem(`group_${gameId}`);
  
  localStorage.removeItem(`session_${gameId}`);
  localStorage.removeItem(`group_${gameId}`);
  localStorage.removeItem(`session_device_${gameId}`);
  localStorage.removeItem(`session_activity_${gameId}`);
  localStorage.removeItem(`pending_pin_${gameId}`);
  
  if (groupId) {
    localStorage.removeItem(`gameId_${groupId}`);
  }
}

/**
 * Get all active sessions in localStorage
 * Useful for finding orphaned sessions
 */
export function getAllSessions(): Array<{ gameId: string; session: SessionData }> {
  const sessions: Array<{ gameId: string; session: SessionData }> = [];
  
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith("session_") && !key.includes("device") && !key.includes("activity")) {
      const gameId = key.replace("session_", "");
      const sessionStr = localStorage.getItem(key);
      if (sessionStr) {
        try {
          const session: SessionData = JSON.parse(sessionStr);
          sessions.push({ gameId, session });
        } catch (e) {
          console.error(`Error parsing session for ${gameId}:`, e);
        }
      }
    }
  });
  
  return sessions;
}

/**
 * Clean up expired sessions from localStorage
 */
export function cleanupExpiredSessions(expiryMinutes: number = 90): void {
  const sessions = getAllSessions();
  const now = Date.now();
  const expiryMs = expiryMinutes * 60 * 1000;
  
  sessions.forEach(({ gameId, session }) => {
    if ((now - session.lastActivity) > expiryMs) {
      console.log(`Cleaning up expired session for game ${gameId} (group ${session.groupId})`);
      clearSession(gameId);
    }
  });
}

/**
 * Check for device conflict (session exists but from different device)
 * Returns the conflicting session if found
 */
export function getConflictingSession(gameId: string): SessionData | null {
  const session = getSession(gameId);
  if (!session) return null;
  
  const currentDeviceId = getOrCreateDeviceId();
  if (session.deviceId !== currentDeviceId) {
    return session;
  }
  
  return null;
}
