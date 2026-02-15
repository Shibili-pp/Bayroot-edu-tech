import { useState, useEffect } from 'react';
import api from '../api/axios';
import './NewApplicationModal.css';

const NewApplicationModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    passportNumber: '',
    aadharNumber: '',
    countryId: '',
    courseId: '',
    universityId: '',
    documents: []
  });
  const [countries, setCountries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCountries();
      fetchCourses();
      fetchUniversities();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.countryId) {
      // Filter courses and universities by selected country
      const country = countries.find(c => c._id === formData.countryId);
      if (country) {
        // Filter courses by countryId (can be ObjectId or populated object)
        const filteredCoursesList = courses.filter(c => {
          if (!c.isActive) return false;
          const courseCountryId = c.countryId?._id || c.countryId;
          return courseCountryId === formData.countryId || courseCountryId?.toString() === formData.countryId;
        });
        // Filter universities by country name
        const filteredUniversitiesList = universities.filter(u => 
          u.isActive && u.country === country.name
        );
        setFilteredCourses(filteredCoursesList);
        setFilteredUniversities(filteredUniversitiesList);
      } else {
        setFilteredCourses([]);
        setFilteredUniversities([]);
      }
      // Reset course and university selections when country changes
      setFormData(prev => ({ ...prev, courseId: '', universityId: '' }));
    } else {
      setFilteredCourses([]);
      setFilteredUniversities([]);
    }
  }, [formData.countryId, countries, courses, universities]);

  const fetchCountries = async () => {
    try {
      const response = await api.get('/countries');
      if (response.data.success) {
        const activeCountries = (response.data.data?.countries || []).filter(c => c.isActive);
        setCountries(activeCountries);
      }
    } catch (err) {
      console.error('Error fetching countries:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await api.get('/courses');
      if (response.data.success) {
        setCourses(response.data.data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchUniversities = async () => {
    try {
      const response = await api.get('/universities');
      if (response.data.success) {
        setUniversities(response.data.data.universities || []);
      }
    } catch (err) {
      console.error('Error fetching universities:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };


  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleFileUpload = async (files) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'video/mp4'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== fileArray.length) {
      setError('Some files are invalid. Only JPG, PNG, PDF, and MP4 files are allowed.');
      return;
    }

    // Check file sizes (10MB limit)
    const oversizedFiles = validFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Some files exceed the 10MB size limit.');
      return;
    }

    setError('');

    // Upload files
    for (const file of validFiles) {
      const fileIndex = uploadingFiles.length;
      setUploadingFiles(prev => [...prev, { name: file.name, status: 'uploading' }]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/files/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          const fileData = response.data.data.file;
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, {
              fileId: fileData.fileId,
              filename: fileData.filename,
              originalName: fileData.originalName,
              path: fileData.path,
              fileType: fileData.fileType,
              url: fileData.url,
              type: 'file'
            }]
          }));
          setUploadingFiles(prev => prev.filter((_, i) => i !== fileIndex));
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }
      } catch (err) {
        setUploadingFiles(prev => prev.filter((_, i) => i !== fileIndex));
        setError(err.response?.data?.message || err.message || 'Failed to upload file');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.aadharNumber || !formData.countryId || !formData.courseId || !formData.universityId) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate phone (at least 10 digits)
    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    // Validate Aadhar (12 digits) or GCC ID
    const aadharRegex = /^\d{12}$/;
    const gccIdRegex = /^[A-Z0-9]{8,}$/i;
    if (!aadharRegex.test(formData.aadharNumber.replace(/\s/g, '')) && !gccIdRegex.test(formData.aadharNumber)) {
      setError('Please enter a valid Aadhar Number (12 digits) or GCC ID');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        aadharNumber: formData.aadharNumber.replace(/\s/g, ''),
        courseId: formData.courseId,
        universityId: formData.universityId,
        documents: formData.documents.map(doc => {
          if (doc.type === 'url') {
            return doc.url;
          } else {
            // File upload - return file metadata
            return {
              fileId: doc.fileId,
              filename: doc.filename,
              originalName: doc.originalName,
              path: doc.path,
              fileType: doc.fileType,
              url: doc.url
            };
          }
        })
      };

      // Add passport number only if provided
      if (formData.passportNumber.trim()) {
        payload.passportNumber = formData.passportNumber.trim();
      }

      const response = await api.post('/students', payload);

      if (response.data.success) {
        // Reset form
        setFormData({
          fullName: '',
          email: '',
          phone: '',
          passportNumber: '',
          aadharNumber: '',
          countryId: '',
          courseId: '',
          universityId: '',
          documents: []
        });
        onSuccess && onSuccess(response.data.data.student);
        onClose();
      } else {
        setError(response.data.message || 'Failed to create application');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create application';
      
      // Handle duplicate Aadhar/Passport errors
      if (errorMessage === 'DUPLICATE_AADHAR' || errorMessage.includes('DUPLICATE_AADHAR')) {
        alert('⚠️ Duplicate Aadhar Number\n\nThe same Aadhar number has already been submitted to this portal. Please contact Bayroot Edu Connect help desk for assistance.');
        setError('This Aadhar number has already been submitted. Please contact Bayroot Edu Connect help desk.');
        return;
      } else if (errorMessage === 'DUPLICATE_PASSPORT' || errorMessage.includes('DUPLICATE_PASSPORT')) {
        alert('⚠️ Duplicate Passport Number\n\nThe same Passport number has already been submitted to this portal. Please contact Bayroot Edu Connect help desk for assistance.');
        setError('This Passport number has already been submitted. Please contact Bayroot Edu Connect help desk.');
        return;
      }
      
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        passportNumber: '',
        aadharNumber: '',
        countryId: '',
        courseId: '',
        universityId: '',
        documents: []
      });
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Application</h2>
          <button className="modal-close" onClick={handleClose} disabled={submitting}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="fullName">
              Name (as per Passport/Aadhar) <span className="required">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="student@example.com"
                required
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 1234567890"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="passportNumber">
                Passport Number
              </label>
              <input
                type="text"
                id="passportNumber"
                name="passportNumber"
                value={formData.passportNumber}
                onChange={handleChange}
                placeholder="Enter passport number (if available)"
                disabled={submitting}
              />
            </div>

            <div className="form-group">
              <label htmlFor="aadharNumber">
                Aadhar Number / GCC ID <span className="required">*</span>
              </label>
              <input
                type="text"
                id="aadharNumber"
                name="aadharNumber"
                value={formData.aadharNumber}
                onChange={handleChange}
                placeholder="12-digit Aadhar or GCC ID"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="countryId">
              Country <span className="required">*</span>
            </label>
            <select
              id="countryId"
              name="countryId"
              value={formData.countryId}
              onChange={handleChange}
              required
              disabled={submitting || loading}
            >
              <option value="">Select Country</option>
              {countries.map(country => (
                <option key={country._id} value={country._id}>
                  {country.name} {country.code && `(${country.code})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="courseId">
                Course <span className="required">*</span>
              </label>
              <select
                id="courseId"
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                required
                disabled={submitting || loading || !formData.countryId || filteredCourses.length === 0}
              >
                <option value="">
                  {!formData.countryId 
                    ? 'Select a country first' 
                    : filteredCourses.length === 0 
                    ? 'No courses available for this country'
                    : 'Select Course'}
                </option>
                {filteredCourses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="universityId">
                University <span className="required">*</span>
              </label>
              <select
                id="universityId"
                name="universityId"
                value={formData.universityId}
                onChange={handleChange}
                required
                disabled={submitting || loading || !formData.countryId || filteredUniversities.length === 0}
              >
                <option value="">
                  {!formData.countryId 
                    ? 'Select a country first' 
                    : filteredUniversities.length === 0 
                    ? 'No universities available for this country'
                    : 'Select University'}
                </option>
                {filteredUniversities.map(university => (
                  <option key={university._id} value={university._id}>
                    {university.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="documents">
              Documents (PDF, Images)
            </label>
            
            {/* Drag and Drop Area */}
            <div
              className={`drag-drop-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-input"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.mp4"
                onChange={handleFileInputChange}
                disabled={submitting}
                style={{ display: 'none' }}
              />
              <label htmlFor="file-input" className="drag-drop-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div className="drag-drop-text">
                  <strong>Drag and drop files here</strong>
                  <span>or click to browse</span>
                  <small>Supports: JPG, PNG, PDF, MP4 (Max 10MB per file)</small>
                </div>
              </label>
            </div>


            {/* Uploading Files Indicator */}
            {uploadingFiles.length > 0 && (
              <div className="uploading-files">
                {uploadingFiles.map((file, index) => (
                  <div key={index} className="uploading-item">
                    <span>{file.name}</span>
                    <span className="upload-status">Uploading...</span>
                  </div>
                ))}
              </div>
            )}

            {/* Document List */}
            {formData.documents.length > 0 && (
              <div className="document-list">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="document-item">
                    <div className="document-info">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                        <path d="M4 2.5C4 1.67157 4.67157 1 5.5 1H10.5L13 3.5V13.5C13 14.3284 12.3284 15 11.5 15H5.5C4.67157 15 4 14.3284 4 13.5V2.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M10 1V4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="document-name" title={doc.originalName || doc.filename}>
                        {doc.originalName || doc.filename}
                      </span>
                      <span className="document-type">{doc.fileType?.toUpperCase() || 'FILE'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      disabled={submitting}
                      className="btn-remove-doc"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-submit"
            >
              {submitting ? 'Creating...' : 'Create Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewApplicationModal;

