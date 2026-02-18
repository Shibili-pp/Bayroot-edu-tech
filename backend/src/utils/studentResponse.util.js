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
      nationality: studentObj.nationality || null,
      passportNumber: studentObj.passportNumber ? decrypt(studentObj.passportNumber) : null,
      aadharNumber: decrypt(studentObj.aadharNumber),
      courseId: studentObj.courseId,
      course: studentObj.course || null,
      universityId: studentObj.universityId,
      university: studentObj.university || null,
      intakeId: studentObj.intakeId,
      intake: studentObj.intake || null,
      intakeYear: studentObj.intakeYear || null,
      partnerId: studentObj.partnerId,
      partner: studentObj.partnerId ? {
        id: studentObj.partnerId._id || studentObj.partnerId.id,
        companyName: studentObj.partnerId.companyName,
        email: studentObj.partnerId.email
      } : null,
      status: studentObj.status || 'Under Review',
      documents: studentObj.documents || [],
      offerLetter: studentObj.offerLetter || null,
      createdAt: studentObj.createdAt
    };
  }

  // Partner gets full decrypted data
  if (role === 'PARTNER') {
    return {
      id: studentObj._id || studentObj.id,
      fullName: studentObj.fullName,
      email: decrypt(studentObj.email), // Show full email
      phone: decrypt(studentObj.phone), // Show full phone number
      nationality: studentObj.nationality || null,
      passportNumber: studentObj.passportNumber ? decrypt(studentObj.passportNumber) : null, // Show full passport number
      aadharNumber: decrypt(studentObj.aadharNumber), // Show full Aadhar/GCC ID
      courseId: studentObj.courseId,
      course: studentObj.course || null,
      universityId: studentObj.universityId,
      university: studentObj.university || null,
      intakeId: studentObj.intakeId,
      intake: studentObj.intake || null,
      intakeYear: studentObj.intakeYear || null,
      partnerId: studentObj.partnerId,
      status: studentObj.status || 'Under Review',
      documents: studentObj.documents || [],
      offerLetter: studentObj.offerLetter || null,
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




