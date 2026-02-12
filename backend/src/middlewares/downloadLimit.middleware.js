const DownloadLimit = require('../models/DownloadLimit.model');
const { sendError } = require('../utils/response.util');

const MAX_DAILY_DOWNLOADS = 20;

/**
 * Check and enforce download limit for Partners
 */
const checkDownloadLimit = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    const role = req.user.role;

    // Admin has no download limit
    if (role === 'ADMIN') {
      return next();
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find or create today's download record
    let downloadRecord = await DownloadLimit.findOne({
      userId,
      date: today
    });

    if (!downloadRecord) {
      downloadRecord = await DownloadLimit.create({
        userId,
        userModel: 'Partner',
        date: today,
        downloadCount: 0
      });
    }

    // Check if limit exceeded
    if (downloadRecord.downloadCount >= MAX_DAILY_DOWNLOADS) {
      return sendError(
        res,
        `Daily download limit of ${MAX_DAILY_DOWNLOADS} files exceeded. Please try again tomorrow.`,
        429
      );
    }

    // Increment download count
    downloadRecord.downloadCount += 1;
    await downloadRecord.save();

    // Attach download info to request for logging
    req.downloadInfo = {
      dailyCount: downloadRecord.downloadCount,
      limit: MAX_DAILY_DOWNLOADS
    };

    next();
  } catch (error) {
    console.error('Download limit check error:', error);
    next(); // Don't block downloads on error
  }
};

module.exports = {
  checkDownloadLimit
};

