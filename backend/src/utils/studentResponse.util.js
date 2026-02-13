const { decrypt, mask } = require('./encryption.util');

/**
 * Format student response based on user role
 * @param {Object} student - Student document from database
 * @param {string} role - User role (ADMIN | PARTNER)
 * @returns {Object} Formatted student object
 */
const formatStudentResponse = (student, role) => {
  if (!student) return null;

  const studentObj = student.toObject ? student.toObject() : student;

  // Admin gets full decrypted data
  if (role === 'ADMIN') {
    return {
      id: studentObj._id || studentObj.id,
      fullName: studentObj.fullName,
      email: decrypt(studentObj.email),
      phone: decrypt(studentObj.phone),
      passportNumber: studentObj.passportNumber ? decrypt(studentObj.passportNumber) : null,
      aadharNumber: decrypt(studentObj.aadharNumber),
      courseId: studentObj.courseId,
      course: studentObj.course || null,
      universityId: studentObj.universityId,
      university: studentObj.university || null,
      partnerId: studentObj.partnerId,
      documents: studentObj.documents || [],
      createdAt: studentObj.createdAt
    };
  }

  // Partner gets masked sensitive data
  if (role === 'PARTNER') {
    return {
      id: studentObj._id || studentObj.id,
      fullName: studentObj.fullName,
      email: mask(decrypt(studentObj.email), 3), // Show last 3 chars
      phone: mask(decrypt(studentObj.phone), 4), // Show last 4 digits
      passportNumber: studentObj.passportNumber ? mask(decrypt(studentObj.passportNumber), 2) : null,
      aadharNumber: mask(decrypt(studentObj.aadharNumber), 4), // Show last 4 digits
      courseId: studentObj.courseId,
      course: studentObj.course || null,
      universityId: studentObj.universityId,
      university: studentObj.university || null,
      partnerId: studentObj.partnerId,
      documents: studentObj.documents || [],
      createdAt: studentObj.createdAt
    };
  }

  // Default: return minimal data
  return {
    id: studentObj._id || studentObj.id,
    fullName: studentObj.fullName,
    courseId: studentObj.courseId,
    course: studentObj.course || null,
    universityId: studentObj.universityId,
    university: studentObj.university || null
  };
};

module.exports = {
  formatStudentResponse
};




