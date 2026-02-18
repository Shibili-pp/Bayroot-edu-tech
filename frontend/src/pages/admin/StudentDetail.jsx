import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import CommentsSection from '../../components/CommentsSection';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import './StudentDetail.css';
import '../partner/PartnerStudentDetail.css';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [activeSection, setActiveSection] = useState('offer-letter');
  const [uploadingOfferLetter, setUploadingOfferLetter] = useState(false);
  const [offerLetterFile, setOfferLetterFile] = useState(null);
  const [isDraggingOfferLetter, setIsDraggingOfferLetter] = useState(false);
  const offerLetterInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this effect
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Fetch data with abort signal
    fetchStudentDetails(signal);

    // Cleanup: abort requests if component unmounts or id changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  // Reset active section if current section becomes unavailable
  useEffect(() => {
    if (!student) return;
    
    if (activeSection === 'application' && !isApplicationProcessReceived()) {
      setActiveSection('offer-letter');
    }
    if (activeSection === 'visa' && !isVisaDocumentReceived()) {
      setActiveSection('offer-letter');
    }
  }, [student, activeSection]);

  const fetchStudentDetails = async (signal, retryCount = 0) => {
    let isRetrying = false;
    
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/students/${id}`, { signal });
      if (response.data.success) {
        setStudent(response.data.data?.student);
      } else {
        setError('Student not found');
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      
      // Handle rate limit errors with retry logic
      if (err.response?.status === 429) {
        if (retryCount < 2) {
          // Retry after a delay (exponential backoff)
          isRetrying = true;
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
          console.warn(`Rate limit reached. Retrying in ${delay/1000} seconds...`);
          setTimeout(() => {
            if (!signal?.aborted) {
              fetchStudentDetails(signal, retryCount + 1);
            }
          }, delay);
          return;
        } else {
          // Max retries reached, show error
          setError('Rate limit exceeded. Please wait a moment and refresh the page.');
        }
      } else {
        console.error('Error fetching student details:', err);
        setError(err.response?.data?.message || 'Failed to load student details');
      }
    } finally {
      // Only set loading to false if we're not retrying
      if (!isRetrying && !signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const statusOptions = [
    'Under Review',
    'Offer Requested',
    'Offer Received',
    'Application payment 1',
    'Application Moved',
    'Ministry Submitted',
    'Exam issued',
    'Application payment 2',
    'Fee Paid',
    'Visa Documents Issued',
    'Visa Submitted',
    'Visa Received',
    'Full fee',
    'Application payment 3',
    'Visa rejected',
    'Trc request',
    'Trc approved',
    'Trc rejected',
    'Student Dropped'
  ];

  const getStatusBadge = () => {
    if (!student) return { text: 'Unknown', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    // Map statuses to badge classes
    const statusClassMap = {
      'Under Review': 'status-warning',
      'Offer Requested': 'status-info',
      'Offer Received': 'status-success',
      'Application payment 1': 'status-info',
      'Application Moved': 'status-info',
      'Ministry Submitted': 'status-info',
      'Exam issued': 'status-info',
      'Application payment 2': 'status-info',
      'Fee Paid': 'status-success',
      'Visa Documents Issued': 'status-info',
      'Visa Submitted': 'status-info',
      'Visa Received': 'status-success',
      'Full fee': 'status-success',
      'Application payment 3': 'status-success',
      'Visa rejected': 'status-danger',
      'Trc request': 'status-info',
      'Trc approved': 'status-success',
      'Trc rejected': 'status-danger',
      'Student Dropped': 'status-danger'
    };

    return {
      text: currentStatus,
      class: statusClassMap[currentStatus] || 'status-warning'
    };
  };

  const getOfferLetterStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    const offerLetterStatuses = ['Offer Requested', 'Offer Received'];
    
    if (currentStatus === 'Under Review') {
      return { text: 'Pending', class: 'status-pending' };
    } else if (offerLetterStatuses.includes(currentStatus)) {
      return { text: 'Received', class: 'status-submitted' };
    } else {
      return { text: 'Received', class: 'status-submitted' };
    }
  };

  const getApplicationProcessStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    const applicationProcessStatuses = ['Application payment 1', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2', 'Fee Paid'];
    
    // If status has progressed beyond offer letter stage, it's received
    if (!['Under Review', 'Offer Requested', 'Offer Received'].includes(currentStatus)) {
      return { text: 'Received', class: 'status-submitted' };
    }
    
    // If status is "Offer Received" and there are documents, 
    // partner likely submitted application process (documents indicate submission)
    // Partner submits Application Process Request by uploading documents (passport, certificate, video, image)
    // So if status is Offer Received (meaning initial application is done) and documents exist,
    // it means application process request was likely submitted
    if (currentStatus === 'Offer Received' && student.documents && student.documents.length > 0) {
      return { text: 'Received', class: 'status-submitted' };
    }
    
    // Also check if status is "Offer Requested" and documents exist (more lenient)
    if (currentStatus === 'Offer Requested' && student.documents && student.documents.length > 0) {
      return { text: 'Received', class: 'status-submitted' };
    }
    
    return { text: 'Pending', class: 'status-pending' };
  };

  const getVisaDocumentStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    // Visa-related statuses indicate partner has submitted visa document request
    // and admin has processed it
    const visaProcessStatuses = ['Fee Paid', 'Visa Documents Issued', 'Visa Submitted', 'Visa Received', 'Full fee', 'Application payment 3'];
    
    // If status indicates visa document was processed, it's received
    if (visaProcessStatuses.includes(currentStatus)) {
      return { text: 'Received', class: 'status-submitted' };
    }
    
    // Check if application process request shows "Received"
    // Partner can only submit visa document request AFTER application process is complete
    const appProcessStatus = getApplicationProcessStatus();
    const applicationProcessReceived = appProcessStatus.text === 'Received';
    
    if (applicationProcessReceived) {
      // Application process is received, so visa document section becomes accessible
      // Partner submits visa document by uploading fee payment statement
      // If status has progressed beyond "Offer Received" (application process is complete)
      // and there are documents, visa document was likely submitted
      // The logic: once application process is complete, any documents uploaded
      // are likely visa documents (fee payment statement)
      const hasDocuments = student.documents && student.documents.length > 0;
      
      // If application process is complete (status beyond "Offer Received") 
      // and documents exist, partner likely submitted visa document request
      // Status will be "Application Moved", "Ministry Submitted", etc.
      // before admin processes visa document and moves status to "Fee Paid"
      if (hasDocuments) {
        return { text: 'Received', class: 'status-submitted' };
      }
    }
    
    // Otherwise, it's pending - partner hasn't submitted visa document request yet
    return { text: 'Pending', class: 'status-pending' };
  };

  const isVisaDocumentReceived = () => {
    if (!student) return false;
    // Use exact same logic as getVisaDocumentStatus to ensure consistency
    // If status badge shows "Received", tab should be clickable
    const status = getVisaDocumentStatus();
    return status.text === 'Received';
  };

  const isApplicationProcessReceived = () => {
    if (!student) return false;
    // Use exact same logic as getApplicationProcessStatus to ensure consistency
    const status = getApplicationProcessStatus();
    return status.text === 'Received';
  };

  const handleTabClick = (e, section) => {
    e.preventDefault(); // Prevent default behavior and scroll
    if (section === 'application' && !isApplicationProcessReceived()) {
      alert('Application Process Request has not been submitted by the partner yet. Please inform them to submit through the command section.');
      return;
    }
    if (section === 'visa' && !isVisaDocumentReceived()) {
      alert('Visa Document Request has not been submitted by the partner yet. Please inform them to submit through the command section.');
      return;
    }
    setActiveSection(section);
  };

  const handleOfferLetterDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOfferLetter(true);
  };

  const handleOfferLetterDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingOfferLetter(false);
  };

  const handleOfferLetterDrop = (e) => {
    e.preventDefault();
    setIsDraggingOfferLetter(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleOfferLetterFileSelect(file);
    }
  };

  const handleOfferLetterFileSelect = (file) => {
    // Validate file type (only PDF and images)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload PDF or image files (JPG, PNG).');
      return;
    }

    // Validate file size (20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      alert('File size exceeds 20MB limit.');
      return;
    }

    setOfferLetterFile(file);
  };

  const handleOfferLetterUpload = async () => {
    if (!offerLetterFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploadingOfferLetter(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('offerLetter', offerLetterFile);

      const response = await api.post(`/students/${id}/offer-letter`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setStudent(response.data.data?.student);
        setOfferLetterFile(null);
        alert('Offer letter uploaded successfully');
      } else {
        setError(response.data.message || 'Failed to upload offer letter');
      }
    } catch (err) {
      console.error('Error uploading offer letter:', err);
      setError(err.response?.data?.message || 'Failed to upload offer letter');
    } finally {
      setUploadingOfferLetter(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!student || updatingStatus) return;
    
    try {
      setUpdatingStatus(true);
      const response = await api.put(`/students/${student.id || student._id}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        setStudent(prev => ({
          ...prev,
          status: newStatus
        }));
      } else {
        alert('Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'NA';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getS3KeyFromDoc = (doc) => {
    if (!doc.s3Key && !doc.s3Url && !doc.url) {
      return null;
    }

    // If we have s3Key, use it; otherwise extract from s3Url or url
    let s3Key = doc.s3Key;
    if (!s3Key) {
      const urlToParse = doc.s3Url || doc.url;
      if (urlToParse) {
        // Try to extract s3Key from URL
        // Format 1: https://bucket.s3.region.amazonaws.com/key
        // Format 2: https://s3.region.amazonaws.com/bucket/key
        // Format 3: https://bucket.s3-region.amazonaws.com/key
        try {
          const urlObj = new URL(urlToParse);
          // If pathname starts with bucket name, remove it
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          if (pathParts.length > 0) {
            // Check if first part is bucket name (usually in format bucket.s3.region.amazonaws.com)
            if (urlObj.hostname.includes('.s3.') || urlObj.hostname.includes('s3-')) {
              // Format: https://bucket.s3.region.amazonaws.com/key
              s3Key = urlObj.pathname.substring(1); // Remove leading /
            } else {
              // Format: https://s3.region.amazonaws.com/bucket/key
              // Skip bucket name (first part) and join the rest
              s3Key = pathParts.slice(1).join('/');
            }
          }
        } catch (urlError) {
          // Fallback: try simple string split
          const urlParts = urlToParse.split('.amazonaws.com/');
          if (urlParts.length > 1) {
            s3Key = urlParts[1].split('?')[0]; // Remove query params if any
          }
        }
      }
    }

    return s3Key;
  };

  const handleDocumentClick = async (doc) => {
    const s3Key = getS3KeyFromDoc(doc);
    if (!s3Key) {
      console.error('Could not determine s3Key for document', doc);
      alert('Unable to access document: missing file information');
      return;
    }

    try {
      // Get presigned URL from backend (using query parameter to handle slashes in s3Key)
      const response = await api.get(`/files/document`, {
        params: { s3Key: s3Key }
      });
      if (response.data.success && response.data.data?.url) {
        window.open(response.data.data.url, '_blank');
      } else {
        console.error('Failed to get document URL');
        alert('Failed to generate document access URL');
      }
    } catch (err) {
      console.error('Error accessing document:', err);
      alert(err.response?.data?.message || 'Failed to open document. Please try again.');
    }
  };

  const handleDocumentDownload = async (doc) => {
    const s3Key = getS3KeyFromDoc(doc);
    if (!s3Key) {
      console.error('Could not determine s3Key for document', doc);
      alert('Unable to download document: missing file information');
      return;
    }

    const docId = doc.fileId || doc._id;
    setDownloadingDocId(docId);

    try {
      const fileName = doc.originalName || doc.filename || 'document';
      
      // Use the backend download endpoint which proxies the file (avoids CORS)
      const response = await api.get(`/files/download`, {
        params: { 
          s3Key: s3Key,
          filename: fileName
        },
        responseType: 'blob' // Important: tell axios to expect binary data
      });
      
      // response.data is already a Blob when responseType is 'blob'
      const blob = response.data;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (err) {
      console.error('Error downloading document:', err);
      // Try to extract error message from blob response if available
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const errorData = JSON.parse(text);
          alert(errorData.message || 'Failed to download document');
        } catch {
          alert('Failed to download document. Please try again.');
        }
      } else {
        alert(err.response?.data?.message || 'Failed to download document. Please try again.');
      }
    } finally {
      setDownloadingDocId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="student-detail-page">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading student details...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !student) {
    return (
      <AdminLayout>
        <div className="student-detail-page">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error || 'Student not found'}</p>
            <button className="btn-back" onClick={() => navigate('/admin/applications')}>
              Back to Applications
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const status = getStatusBadge();

  return (
    <AdminLayout>
      <div className="student-detail-page">
        {/* Header */}
        <div className="detail-header">
          <button className="btn-back" onClick={() => navigate('/admin/applications')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Applications
          </button>
          <div className="header-content">
            <div className="student-header-info">
              <div className="student-avatar-large">
                {getInitials(student.fullName)}
              </div>
              <div>
                <h1>{student.fullName}</h1>
                <p className="student-subtitle">
                  {student.universityId?.name || 'N/A'} • {student.courseId?.name || 'N/A'}
                </p>
              </div>
            </div>
            <div className="status-selector-container">
              <select
                className={`status-select status-${status.class.replace('status-', '')}`}
                value={student.status || 'Under Review'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updatingStatus}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {updatingStatus && (
                <div className="status-updating-indicator">
                  <div className="spinner-small"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="section-tabs">
          <button 
            className={`tab-button ${activeSection === 'offer-letter' ? 'active' : ''}`}
            onClick={(e) => handleTabClick(e, 'offer-letter')}
            type="button"
          >
            <span>Offer Letter Process Request</span>
            <span className={`tab-status-badge ${getOfferLetterStatus().class}`}>
              {getOfferLetterStatus().text}
            </span>
          </button>
          <button 
            className={`tab-button ${activeSection === 'application' ? 'active' : ''} ${!isApplicationProcessReceived() ? 'disabled' : ''}`}
            onClick={(e) => handleTabClick(e, 'application')}
            disabled={!isApplicationProcessReceived()}
            type="button"
          >
            <span>Application Process Request</span>
            <span className={`tab-status-badge ${getApplicationProcessStatus().class}`}>
              {getApplicationProcessStatus().text}
            </span>
          </button>
          <button 
            className={`tab-button ${activeSection === 'visa' ? 'active' : ''} ${!isVisaDocumentReceived() ? 'disabled' : ''}`}
            onClick={(e) => handleTabClick(e, 'visa')}
            disabled={!isVisaDocumentReceived()}
            type="button"
          >
            <span>Visa Document Request</span>
            <span className={`tab-status-badge ${getVisaDocumentStatus().class}`}>
              {getVisaDocumentStatus().text}
            </span>
          </button>
        </div>

        {/* Section Content */}
        <div className="section-content">
          {error && <div className="form-error">{error}</div>}

          {/* Section 1: Offer Letter Process Request */}
          {activeSection === 'offer-letter' && student && (
            <div className="process-section">
              <div className="section-header-with-status">
                <h2 className="section-title">Offer Letter Process Request</h2>
                <span className={`offer-status-badge ${getOfferLetterStatus().class}`}>
                  {getOfferLetterStatus().text}
                </span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">{student.fullName || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Email</span>
                  <span className="info-value">{student.email || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{student.phone || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Aadhar Number / GCC ID</span>
                  <span className="info-value">{student.aadharNumber || 'N/A'}</span>
                </div>
                {student.nationality && (
                  <div className="info-item">
                    <span className="info-label">Nationality</span>
                    <span className="info-value">{student.nationality}</span>
                  </div>
                )}
                {student.passportNumber && (
                  <div className="info-item">
                    <span className="info-label">Passport Number</span>
                    <span className="info-value">{student.passportNumber}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">University</span>
                  <span className="info-value">{student.universityId?.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Course</span>
                  <span className="info-value">{student.courseId?.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Country</span>
                  <span className="info-value">{student.universityId?.country || 'N/A'}</span>
                </div>
                {student.intakeYear && (
                  <div className="info-item">
                    <span className="info-label">Intake Year</span>
                    <span className="info-value">{student.intakeYear}</span>
                  </div>
                )}
                {student.intakeId && (
                  <div className="info-item">
                    <span className="info-label">Intake</span>
                    <span className="info-value">{student.intakeId?.name || student.intake?.name || 'N/A'}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Partner Company</span>
                  <span className="info-value">
                    {student.partner?.companyName || student.partnerId?.companyName || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Partner Email</span>
                  <span className="info-value">
                    {student.partner?.email || student.partnerId?.email || 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Application Created</span>
                  <span className="info-value">{formatDate(student.createdAt)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Application ID</span>
                  <span className="info-value">{student.id || student._id || 'N/A'}</span>
                </div>
              </div>

              {/* Offer Letter Upload Section (Admin Only) */}
              <div className="offer-letter-section">
                <h3 className="section-subtitle">Send Offer Letter</h3>
                {!student.offerLetter || !student.offerLetter.fileId ? (
                  <div
                    className={`file-upload-area ${isDraggingOfferLetter ? 'dragging' : ''}`}
                    onDragOver={handleOfferLetterDragOver}
                    onDragLeave={handleOfferLetterDragLeave}
                    onDrop={handleOfferLetterDrop}
                    onClick={() => offerLetterInputRef.current?.click()}
                  >
                    <input
                      ref={offerLetterInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleOfferLetterFileSelect(file);
                      }}
                    />
                    <div className="upload-icon">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 18V12M12 12L9 15M12 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="upload-text">
                      {isDraggingOfferLetter ? 'Drop the file here' : 'Drag and drop offer letter here or click to browse'}
                    </p>
                    <p className="upload-hint">PDF, JPG, PNG (Max 20MB)</p>
                    {offerLetterFile && (
                      <div className="selected-file">
                        <span>{offerLetterFile.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOfferLetterFile(null);
                          }}
                          className="remove-file-btn"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="offer-letter-display">
                    <div className="offer-letter-info">
                      <div className="offer-letter-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="offer-letter-details">
                        <h4>{student.offerLetter.originalName || student.offerLetter.filename}</h4>
                        {student.offerLetter.uploadedAt && (
                          <span className="offer-letter-date">
                            Uploaded: {formatDate(student.offerLetter.uploadedAt)}
                          </span>
                        )}
                      </div>
                      <div className="offer-letter-actions">
                        <button
                          className="document-view-btn"
                          onClick={() => handleDocumentClick(student.offerLetter)}
                          title="View offer letter"
                        >
                          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M1 9C1 9 3.5 4.5 9 4.5C14.5 4.5 17 9 17 9C17 9 14.5 13.5 9 13.5C3.5 13.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View
                        </button>
                        <button
                          className="document-download-btn"
                          onClick={() => handleDocumentDownload(student.offerLetter)}
                          title="Download offer letter"
                        >
                          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                            <path d="M9 12.75V1.5M9 12.75L5.25 9M9 12.75L12.75 9M1.5 15.75H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {offerLetterFile && !student.offerLetter?.fileId && (
                  <button
                    type="button"
                    className="submit-offer-letter-btn"
                    onClick={handleOfferLetterUpload}
                    disabled={uploadingOfferLetter}
                  >
                    {uploadingOfferLetter ? 'Uploading...' : 'Submit Offer Letter'}
                  </button>
                )}
              </div>

              {/* Documents Section */}
              {student.documents && student.documents.length > 0 && (
                <div className="documents-section">
                  <h3 className="documents-section-title">Uploaded Documents</h3>
                  <div className="documents-grid">
                    {student.documents.map((doc, index) => (
                      <div key={doc.fileId || index} className="document-card">
                        <div className="document-icon">
                          {doc.fileType === 'pdf' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : doc.fileType === 'video' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H14C15.1046 19 16 18.1046 16 17V7C16 5.89543 15.1046 5 14 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9 9C9.55228 9 10 9.44772 10 10C10 10.5523 9.55228 11 9 11C8.44772 11 8 10.5523 8 10C8 9.44772 8.44772 9 9 9Z" fill="currentColor"/>
                              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="document-info">
                          <h3 className="document-name" title={doc.originalName || doc.filename}>
                            {doc.originalName || doc.filename || 'Document'}
                          </h3>
                          <span className="document-type-badge">{doc.fileType?.toUpperCase() || 'FILE'}</span>
                          {doc.uploadedAt && (
                            <span className="document-date">
                              Uploaded: {formatDate(doc.uploadedAt)}
                            </span>
                          )}
                        </div>
                        {(doc.url || doc.s3Url) && (
                          <div className="document-actions">
                            <button
                              className="document-view-btn"
                              onClick={() => handleDocumentClick(doc)}
                              title="View document"
                            >
                              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                <path d="M1 9C1 9 3.5 4.5 9 4.5C14.5 4.5 17 9 17 9C17 9 14.5 13.5 9 13.5C3.5 13.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              View
                            </button>
                            <button
                              className="document-download-btn"
                              onClick={() => handleDocumentDownload(doc)}
                              title="Download document"
                              disabled={downloadingDocId === (doc.fileId || doc._id)}
                            >
                              {downloadingDocId === (doc.fileId || doc._id) ? (
                                <>
                                  <div className="spinner-small"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 12.75V1.5M9 12.75L5.25 9M9 12.75L12.75 9M1.5 15.75H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <CommentsSection studentId={id} userRole={user?.role || 'ADMIN'} />
            </div>
          )}

          {/* Section 2: Application Process Request */}
          {activeSection === 'application' && student && (
            <div className="process-section">
              <div className="section-header-with-status">
                <h2 className="section-title">Application Process Request</h2>
                <span className={`offer-status-badge ${getApplicationProcessStatus().class}`}>
                  {getApplicationProcessStatus().text}
                </span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{student.fullName || 'N/A'}</span>
                </div>
                {student.nationality && (
                  <div className="info-item">
                    <span className="info-label">Nationality</span>
                    <span className="info-value">{student.nationality}</span>
                  </div>
                )}
                {student.passportNumber && (
                  <div className="info-item">
                    <span className="info-label">Passport Number</span>
                    <span className="info-value">{student.passportNumber}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">Course</span>
                  <span className="info-value">{student.courseId?.name || student.course?.name || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">University</span>
                  <span className="info-value">{student.universityId?.name || student.university?.name || 'N/A'}</span>
                </div>
                {student.intakeYear && (
                  <div className="info-item">
                    <span className="info-label">Intake Year</span>
                    <span className="info-value">{student.intakeYear}</span>
                  </div>
                )}
                {student.intakeId && (
                  <div className="info-item">
                    <span className="info-label">Intake</span>
                    <span className="info-value">{student.intakeId?.name || student.intake?.name || 'N/A'}</span>
                  </div>
                )}
                {student.courseId?.description && (
                  <div className="info-item full-width">
                    <span className="info-label">Course Description</span>
                    <span className="info-value">{student.courseId.description}</span>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              {student.documents && student.documents.length > 0 && (
                <div className="documents-section">
                  <h3 className="documents-section-title">Uploaded Documents</h3>
                  <div className="documents-grid">
                    {student.documents.map((doc, index) => (
                      <div key={doc.fileId || index} className="document-card">
                        <div className="document-icon">
                          {doc.fileType === 'pdf' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : doc.fileType === 'video' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H14C15.1046 19 16 18.1046 16 17V7C16 5.89543 15.1046 5 14 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9 9C9.55228 9 10 9.44772 10 10C10 10.5523 9.55228 11 9 11C8.44772 11 8 10.5523 8 10C8 9.44772 8.44772 9 9 9Z" fill="currentColor"/>
                              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="document-info">
                          <h3 className="document-name" title={doc.originalName || doc.filename}>
                            {doc.originalName || doc.filename || 'Document'}
                          </h3>
                          <span className="document-type-badge">{doc.fileType?.toUpperCase() || 'FILE'}</span>
                          {doc.uploadedAt && (
                            <span className="document-date">
                              Uploaded: {formatDate(doc.uploadedAt)}
                            </span>
                          )}
                        </div>
                        {(doc.url || doc.s3Url) && (
                          <div className="document-actions">
                            <button
                              className="document-view-btn"
                              onClick={() => handleDocumentClick(doc)}
                              title="View document"
                            >
                              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                <path d="M1 9C1 9 3.5 4.5 9 4.5C14.5 4.5 17 9 17 9C17 9 14.5 13.5 9 13.5C3.5 13.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              View
                            </button>
                            <button
                              className="document-download-btn"
                              onClick={() => handleDocumentDownload(doc)}
                              title="Download document"
                              disabled={downloadingDocId === (doc.fileId || doc._id)}
                            >
                              {downloadingDocId === (doc.fileId || doc._id) ? (
                                <>
                                  <div className="spinner-small"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 12.75V1.5M9 12.75L5.25 9M9 12.75L12.75 9M1.5 15.75H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <CommentsSection studentId={id} userRole={user?.role || 'ADMIN'} />
            </div>
          )}

          {/* Section 3: Visa Document Request */}
          {activeSection === 'visa' && student && (
            <div className="process-section">
              <div className="section-header-with-status">
                <h2 className="section-title">Visa Document Request</h2>
                <span className={`offer-status-badge ${getVisaDocumentStatus().class}`}>
                  {getVisaDocumentStatus().text}
                </span>
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name</span>
                  <span className="info-value">{student.fullName || 'N/A'}</span>
                </div>
                {student.nationality && (
                  <div className="info-item">
                    <span className="info-label">Nationality</span>
                    <span className="info-value">{student.nationality}</span>
                  </div>
                )}
                {student.passportNumber && (
                  <div className="info-item">
                    <span className="info-label">Passport Number</span>
                    <span className="info-value">{student.passportNumber}</span>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              {student.documents && student.documents.length > 0 && (
                <div className="documents-section">
                  <h3 className="documents-section-title">Uploaded Documents</h3>
                  <div className="documents-grid">
                    {student.documents.map((doc, index) => (
                      <div key={doc.fileId || index} className="document-card">
                        <div className="document-icon">
                          {doc.fileType === 'pdf' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : doc.fileType === 'video' ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M14 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H14C15.1046 19 16 18.1046 16 17V7C16 5.89543 15.1046 5 14 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                              <path d="M21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M9 9C9.55228 9 10 9.44772 10 10C10 10.5523 9.55228 11 9 11C8.44772 11 8 10.5523 8 10C8 9.44772 8.44772 9 9 9Z" fill="currentColor"/>
                              <path d="M21 15L16 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <div className="document-info">
                          <h3 className="document-name" title={doc.originalName || doc.filename}>
                            {doc.originalName || doc.filename || 'Document'}
                          </h3>
                          <span className="document-type-badge">{doc.fileType?.toUpperCase() || 'FILE'}</span>
                          {doc.uploadedAt && (
                            <span className="document-date">
                              Uploaded: {formatDate(doc.uploadedAt)}
                            </span>
                          )}
                        </div>
                        {(doc.url || doc.s3Url) && (
                          <div className="document-actions">
                            <button
                              className="document-view-btn"
                              onClick={() => handleDocumentClick(doc)}
                              title="View document"
                            >
                              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                <path d="M1 9C1 9 3.5 4.5 9 4.5C14.5 4.5 17 9 17 9C17 9 14.5 13.5 9 13.5C3.5 13.5 1 9 1 9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M9 11.25C10.2426 11.25 11.25 10.2426 11.25 9C11.25 7.75736 10.2426 6.75 9 6.75C7.75736 6.75 6.75 7.75736 6.75 9C6.75 10.2426 7.75736 11.25 9 11.25Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              View
                            </button>
                            <button
                              className="document-download-btn"
                              onClick={() => handleDocumentDownload(doc)}
                              title="Download document"
                              disabled={downloadingDocId === (doc.fileId || doc._id)}
                            >
                              {downloadingDocId === (doc.fileId || doc._id) ? (
                                <>
                                  <div className="spinner-small"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                                    <path d="M9 12.75V1.5M9 12.75L5.25 9M9 12.75L12.75 9M1.5 15.75H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <CommentsSection studentId={id} userRole={user?.role || 'ADMIN'} />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentDetail;

