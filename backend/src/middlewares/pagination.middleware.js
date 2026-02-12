/**
 * Parse and validate pagination parameters
 */
const parsePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50 records
  const skip = (page - 1) * limit;

  // Ensure valid values
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0'
    });
  }

  if (limit < 1 || limit > 50) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 50'
    });
  }

  req.pagination = {
    page,
    limit,
    skip
  };

  next();
};

module.exports = {
  parsePagination
};

