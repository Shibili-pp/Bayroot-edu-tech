const crypto = require('crypto');
const { ENCRYPTION_KEY } = require('../config/env');

const algorithm = 'aes-256-cbc';
// Use a fixed salt for consistent key derivation
const salt = 'bayroot-edu-tech-salt-v1';
const key = crypto.scryptSync(ENCRYPTION_KEY || 'default-key-change-in-production-min-32-chars-long', salt, 32);
const ivLength = 16;

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted text (hex format)
 */
const encrypt = (text) => {
  if (!text) return text;
  
  try {
    const iv = crypto.randomBytes(ivLength);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted text (hex format)
 * @returns {string} Decrypted plain text
 */
const decrypt = (encryptedText) => {
  if (!encryptedText) return encryptedText;
  
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      // If not in expected format, return as is (for backward compatibility)
      return encryptedText;
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return original if decryption fails (for backward compatibility)
    return encryptedText;
  }
};

/**
 * Mask sensitive data for display
 * @param {string} text - Text to mask
 * @param {number} visibleChars - Number of characters to show at the end
 * @returns {string} Masked text
 */
const mask = (text, visibleChars = 4) => {
  if (!text || text.length <= visibleChars) {
    return '*'.repeat(text?.length || 0);
  }
  return '*'.repeat(text.length - visibleChars) + text.slice(-visibleChars);
};

module.exports = {
  encrypt,
  decrypt,
  mask
};

