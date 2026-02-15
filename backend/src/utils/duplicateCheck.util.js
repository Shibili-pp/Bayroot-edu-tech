const Admin = require('../models/Admin.model');
const Partner = require('../models/Partner.model');

/**
 * Check if email exists in either Admin or Partner models
 * @param {string} email - Email to check
 * @returns {Promise<{exists: boolean, model: string|null}>}
 */
const checkEmailExists = async (email) => {
  try {
    // Check in Admin model
    const adminExists = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (adminExists) {
      return { exists: true, model: 'Admin', user: adminExists };
    }

    // Check in Partner model
    const partnerExists = await Partner.findOne({ email: email.toLowerCase().trim() });
    if (partnerExists) {
      return { exists: true, model: 'Partner', user: partnerExists };
    }

    return { exists: false, model: null, user: null };
  } catch (error) {
    console.error('Error checking email:', error);
    throw error;
  }
};

/**
 * Normalize mobile number for comparison
 * @param {string} mobileNumber - Mobile number to normalize
 * @returns {string} Normalized mobile number
 */
const normalizeMobileNumber = (mobileNumber) => {
  if (!mobileNumber) return '';
  // Remove all non-digit characters except leading +
  return mobileNumber.replace(/\s+/g, '').replace(/-/g, '').trim();
};

/**
 * Check if mobile number exists in either Admin or Partner models
 * @param {string} mobileNumber - Mobile number to check
 * @returns {Promise<{exists: boolean, model: string|null}>}
 */
const checkMobileExists = async (mobileNumber) => {
  try {
    if (!mobileNumber) {
      return { exists: false, model: null, user: null };
    }

    // Normalize mobile number for comparison
    const normalizedMobile = normalizeMobileNumber(mobileNumber);
    
    if (!normalizedMobile) {
      return { exists: false, model: null, user: null };
    }

    // Get last 10 digits for flexible matching (handles country codes)
    const last10Digits = normalizedMobile.slice(-10);

    // Check in Admin model - get all and check normalized
    const admins = await Admin.find({}).select('mobileNumber');
    for (const admin of admins) {
      const adminMobile = normalizeMobileNumber(admin.mobileNumber);
      // Exact match or last 10 digits match
      if (adminMobile === normalizedMobile || 
          (adminMobile.slice(-10) === last10Digits && normalizedMobile.length >= 10 && adminMobile.length >= 10)) {
        const fullAdmin = await Admin.findById(admin._id);
        return { exists: true, model: 'Admin', user: fullAdmin };
      }
    }

    // Check in Partner model - get all and check normalized
    const partners = await Partner.find({}).select('mobileNumber');
    for (const partner of partners) {
      const partnerMobile = normalizeMobileNumber(partner.mobileNumber);
      // Exact match or last 10 digits match
      if (partnerMobile === normalizedMobile || 
          (partnerMobile.slice(-10) === last10Digits && normalizedMobile.length >= 10 && partnerMobile.length >= 10)) {
        const fullPartner = await Partner.findById(partner._id);
        return { exists: true, model: 'Partner', user: fullPartner };
      }
    }

    return { exists: false, model: null, user: null };
  } catch (error) {
    console.error('Error checking mobile number:', error);
    throw error;
  }
};

/**
 * Check both email and mobile number for duplicates
 * @param {string} email - Email to check
 * @param {string} mobileNumber - Mobile number to check
 * @returns {Promise<{emailExists: object, mobileExists: object}>}
 */
const checkDuplicates = async (email, mobileNumber) => {
  try {
    const [emailCheck, mobileCheck] = await Promise.all([
      checkEmailExists(email),
      mobileNumber ? checkMobileExists(mobileNumber) : { exists: false, model: null, user: null }
    ]);

    return {
      emailExists: emailCheck,
      mobileExists: mobileCheck
    };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    throw error;
  }
};

module.exports = {
  checkEmailExists,
  checkMobileExists,
  checkDuplicates
};

