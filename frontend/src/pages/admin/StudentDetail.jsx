import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './StudentDetail.css';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  useEffect(() => {
    if (id) {
      fetchStudentDetails();
    }
  }, [id]);

  const fetchStudentDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/students/${id}`);
      if (response.data.success) {
        setStudent(response.data.data?.student);
      } else {
        setError('Student not found');
      }
    } catch (err) {
      console.error('Error fetching student details:', err);
      setError(err.response?.data?.message || 'Failed to load student details');
    } finally {
      setLoading(false);
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
    'Under review',
    'Offer requested',
    'Offer received',
    'Application moved',
    'Ministry submitted',
    'Ministry approved',
    'Fee paid',
    'Visa documents issued',
    'Visa submitted',
    'Visa received',
    'Student dropped'
  ];

  const getStatusBadge = () => {
    if (!student) return { text: 'Unknown', class: 'status-pending' };
    const currentStatus = student.status || 'Under review';
    
    // Map statuses to badge classes
    const statusClassMap = {
      'Under review': 'status-warning',
      'Offer requested': 'status-info',
      'Offer received': 'status-success',
      'Application moved': 'status-info',
      'Ministry submitted': 'status-info',
      'Ministry approved': 'status-success',
      'Fee paid': 'status-success',
      'Visa documents issued': 'status-info',
      'Visa submitted': 'status-info',
      'Visa received': 'status-success',
      'Student dropped': 'status-danger'
    };

    return {
      text: currentStatus,
      class: statusClassMap[currentStatus] || 'status-warning'
    };
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
                value={student.status || 'Under review'}
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

        {/* Main Content */}
        <div className="detail-content">
          {/* Personal Information */}
          <div className="detail-section">
            <h2 className="section-title">Personal Information</h2>
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
              {student.passportNumber && (
                <div className="info-item">
                  <span className="info-label">Passport Number</span>
                  <span className="info-value">{student.passportNumber}</span>
                </div>
              )}
            </div>
          </div>

          {/* Application Details */}
          <div className="detail-section">
            <h2 className="section-title">Application Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">University</span>
                <span className="info-value">{student.universityId?.name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Country</span>
                <span className="info-value">{student.universityId?.country || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Course</span>
                <span className="info-value">{student.courseId?.name || 'N/A'}</span>
              </div>
              {student.courseId?.description && (
                <div className="info-item full-width">
                  <span className="info-label">Course Description</span>
                  <span className="info-value">{student.courseId.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Partner Information */}
          <div className="detail-section">
            <h2 className="section-title">Partner Information</h2>
            <div className="info-grid">
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
            </div>
          </div>

          {/* Documents Section */}
          <div className="detail-section">
            <div className="section-header-with-count">
              <h2 className="section-title">Documents</h2>
              <span className="doc-count-badge">
                {student.documents?.length || 0} {student.documents?.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
            {student.documents && student.documents.length > 0 ? (
              <div className="documents-grid">
                {student.documents.map((doc, index) => (
                  <div key={doc.fileId || index} className="document-card">
                    <div className="document-icon">
                      {doc.fileType === 'pdf' ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : doc.fileType === 'video' ? (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                          <path d="M23 7L16 12L23 17V7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14 5H3C1.89543 5 1 5.89543 1 7V17C1 18.1046 1.89543 19 3 19H14C15.1046 19 16 18.1046 16 17V7C16 5.89543 15.1046 5 14 5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
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
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
                              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
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
            ) : (
              <div className="empty-documents">
                <div className="empty-icon">📄</div>
                <p>No documents uploaded yet</p>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="detail-section">
            <h2 className="section-title">Additional Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Application Created</span>
                <span className="info-value">{formatDate(student.createdAt)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Application ID</span>
                <span className="info-value">{student.id || student._id || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default StudentDetail;

