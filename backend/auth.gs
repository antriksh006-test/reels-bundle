/**
 * auth.gs - Admin Authentication & Token Verification for Google Apps Script
 */

/**
 * Computes a SHA-256 hash of a string
 */
function hashString(str) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str, Utilities.Charset.UTF_8);
  let hashStr = '';
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = '0' + byteHex;
    hashStr += byteHex;
  }
  return hashStr;
}

/**
 * Gets or creates the admin password hash stored in Script Properties
 */
function getAdminPasswordHash() {
  const props = PropertiesService.getScriptProperties();
  let storedHash = props.getProperty('ADMIN_PASSWORD_HASH');
  if (!storedHash) {
    // Check SITE_SETTINGS sheet for admin_secret_hash
    try {
      const settings = getSiteSettings();
      if (settings && settings.admin_secret_hash) {
        storedHash = settings.admin_secret_hash;
        props.setProperty('ADMIN_PASSWORD_HASH', storedHash);
      }
    } catch (e) {
      // ignore
    }
  }
  if (!storedHash) {
    // Default password is 'admin123'
    storedHash = hashString('admin123');
    props.setProperty('ADMIN_PASSWORD_HASH', storedHash);
  }
  return storedHash;
}

/**
 * Gets or creates the secret signing key for token generation
 */
function getJwtSecret() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('JWT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + '-' + Date.now();
    props.setProperty('JWT_SECRET', secret);
  }
  return secret;
}

/**
 * Generates an authentication token
 */
function generateAdminToken() {
  const secret = getJwtSecret();
  const expiresAt = Date.now() + (CONFIG.TOKEN_EXPIRY_HOURS * 3600 * 1000);
  const payload = 'admin:' + expiresAt;
  const signature = hashString(payload + ':' + secret);
  return Utilities.base64Encode(payload) + '.' + signature;
}

/**
 * Verifies whether a token is valid and unexpired
 */
function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  try {
    const rawPayload = Utilities.newBlob(Utilities.base64Decode(parts[0])).getDataAsString();
    const signature = parts[1];
    const secret = getJwtSecret();
    const expectedSignature = hashString(rawPayload + ':' + secret);
    
    if (signature !== expectedSignature) return false;
    
    const [user, expiryStr] = rawPayload.split(':');
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || Date.now() > expiry) return false;
    
    return user === 'admin';
  } catch (err) {
    return false;
  }
}

/**
 * Handles admin login attempt
 */
function handleAdminLogin(password) {
  if (!password) {
    return { success: false, error: 'Password is required' };
  }
  const providedHash = hashString(password);
  const targetHash = getAdminPasswordHash();
  
  if (providedHash === targetHash) {
    const token = generateAdminToken();
    return {
      success: true,
      token: token,
      expires_in: CONFIG.TOKEN_EXPIRY_HOURS * 3600,
      user: { role: 'admin', username: 'admin' }
    };
  } else {
    return { success: false, error: 'Invalid administrator credentials' };
  }
}

/**
 * Changes administrator password
 */
function changeAdminPassword(oldPassword, newPassword, token) {
  if (!verifyAdminToken(token)) {
    return { success: false, error: 'Unauthorized' };
  }
  const oldHash = hashString(oldPassword);
  if (oldHash !== getAdminPasswordHash()) {
    return { success: false, error: 'Current password does not match' };
  }
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }
  const newHash = hashString(newPassword);
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_PASSWORD_HASH', newHash);
  
  // Also sync to SITE_SETTINGS tab
  updateSiteSetting('admin_secret_hash', newHash);
  
  return { success: true, message: 'Password updated successfully' };
}

