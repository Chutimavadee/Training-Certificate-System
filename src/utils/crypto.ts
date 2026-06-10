/**
 * Web Crypto API client-side TOTP generation & validation
 * Generates HMAC-SHA256 hashes for 15-second windows
 */

export async function generateHMAC256(keyStr: string, messageStr: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(keyStr);
  const messageData = enc.encode(messageStr);
  
  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );
  
  const signature = await window.crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData
  );
  
  // Format as hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generates the current TOTP token for given course, session, and secret
 * @param courseId Course ID
 * @param sessionId Session ID
 * @param qrSecret Shared secret
 * @param timestampSeconds Epoch timestamp in seconds (optional)
 * @returns 64-character HMAC-SHA256 hash or short readable hash slice
 */
export async function generateTOTPToken(
  courseId: string,
  sessionId: string,
  qrSecret: string,
  timestampSeconds: number = Math.floor(Date.now() / 1000)
): Promise<{ token: string; windowId: number }> {
  // 15-second window ID
  const windowId = Math.floor(timestampSeconds / 15);
  // Concatenate ingredients
  const message = `${courseId}:${sessionId}:${windowId}`;
  
  // Compute secure HMAC-SHA256
  const fullHash = await generateHMAC256(qrSecret, message);
  
  // Return the computed token (we'll use the first 32 chars for user scanning convenience, or the full 64 chars)
  return {
    token: fullHash,
    windowId
  };
}

/**
 * Validates a scanned QR token by testing current and previous 15-second windows
 * to handle net lag and client clock synchronization tolerances.
 */
export async function validateTOTPToken(
  scannedToken: string,
  courseId: string,
  sessionId: string,
  qrSecret: string,
  toleranceWindows: number = 1 // Support 1-window historic tolerance (prev 15 seconds)
): Promise<{ isValid: boolean; windowOffset: number }> {
  const currentEpoch = Math.floor(Date.now() / 1000);
  
  // Check windows starting from now backwards
  for (let offset = 0; offset <= toleranceWindows; offset++) {
    const testEpoch = currentEpoch - (offset * 15);
    const { token } = await generateTOTPToken(courseId, sessionId, qrSecret, testEpoch);
    if (scannedToken === token) {
      return { isValid: true, windowOffset: offset };
    }
  }
  
  return { isValid: false, windowOffset: -1 };
}
