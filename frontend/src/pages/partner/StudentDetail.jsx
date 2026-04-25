import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PartnerLayout from '../../components/layout/PartnerLayout';
import CommentsSection from '../../components/CommentsSection';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from '../../constants/upload';
import '../admin/StudentDetail.css';
import './PartnerStudentDetail.css';

const StudentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('offer-letter');
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  
  // Application Process Request form data
  const [appProcessForm, setAppProcessForm] = useState({
    name: '',
    passportNumber: '',
    courseId: '',
    universityId: '',
    intake: '',
    documents: {
      passport: null,
      certificate12th: null,
      introVideo: null,
      image: null
    }
  });
  
  // Visa Document Request form data
  const [visaForm, setVisaForm] = useState({
    name: '',
    passportNumber: '',
    feePaymentStatement: null
  });
  
  const [universities, setUniversities] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedUniversity, setSelectedUniversity] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [passportCheckError, setPassportCheckError] = useState('');
  const [generalDocuments, setGeneralDocuments] = useState([]);
  const [isDraggingGeneral, setIsDraggingGeneral] = useState(false);
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
    fetchUniversities(signal);
    fetchCourses(signal);

    // Cleanup: abort requests if component unmounts or id changes
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [id]);

  useEffect(() => {
    if (student) {
      // Load intake from localStorage if available
      const savedIntake = localStorage.getItem(`student_intake_${id}`) || '';
      
      const universityId = student.universityId?._id || student.universityId || '';
      const university = universities.find(u => (u._id === universityId) || (u.id === universityId));
      setSelectedUniversity(university);
      
      // Populate Application Process Request form from student data
      setAppProcessForm({
        name: student.fullName || '',
        passportNumber: student.passportNumber || '',
        courseId: student.courseId?._id || student.courseId || '',
        universityId: universityId,
        intake: savedIntake,
        documents: {}
      });
      
      // Populate Visa Document Request form
      setVisaForm({
        name: student.fullName || '',
        passportNumber: student.passportNumber || '',
        feePaymentStatement: null
      });
    }
  }, [student, id, universities]);

  const fetchStudentDetails = async (signal) => {
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
      // Don't show error for rate limit - it's temporary
      if (err.response?.status === 429) {
        console.warn('Rate limit reached. Please wait a moment and refresh.');
        return;
      }
      console.error('Error fetching student details:', err);
      setError(err.response?.data?.message || 'Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniversities = async (signal) => {
    try {
      const response = await api.get('/universities', { signal });
      if (response.data.success) {
        setUniversities(response.data.data?.universities || []);
      }
    } catch (err) {
      // Ignore abort errors and rate limits
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.response?.status === 429) {
        return;
      }
      console.error('Error fetching universities:', err);
    }
  };

  const fetchCourses = async (signal) => {
    try {
      const response = await api.get('/courses', { signal });
      if (response.data.success) {
        setCourses(response.data.data?.courses || []);
      }
    } catch (err) {
      // Ignore abort errors and rate limits
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.response?.status === 429) {
        return;
      }
      console.error('Error fetching courses:', err);
    }
  };

  const checkPassportDuplicate = async (passportNumber) => {
    if (!passportNumber || passportNumber.trim() === '') {
      setPassportCheckError('');
      return true;
    }

    try {
      // Fetch all students and check for duplicate passport
      // Fetch students with pagination (for dropdown)
      let allStudents = [];
      let page = 1;
      const limit = 50;
      let hasMore = true;

      while (hasMore && allStudents.length < 100) { // Limit to 100 for dropdown
        const response = await api.get(`/students?page=${page}&limit=${limit}`, {
          cacheTTL: 30 * 1000
        });
        
        if (response.data.success) {
          const students = response.data.data?.students || [];
          allStudents = [...allStudents, ...students];
          
          const pagination = response.data.data?.pagination;
          hasMore = pagination && page < pagination.pages && allStudents.length < 100;
          page++;
        } else {
          hasMore = false;
        }
      }

      const response = { data: { success: true, data: { students: allStudents } } };
      if (response.data.success) {
        const students = response.data.data?.students || [];
        const normalizedPassport = passportNumber.trim().toUpperCase();
        
        const duplicate = students.find(s => {
          if (s._id === id || s.id === id) return false; // Exclude current student
          if (!s.passportNumber) return false;
          return s.passportNumber.trim().toUpperCase() === normalizedPassport;
        });
        
        if (duplicate) {
          setPassportCheckError('This passport number already exists in the system');
          return false;
        } else {
          setPassportCheckError('');
          return true;
        }
      }
      return true;
    } catch (err) {
      console.error('Error checking passport:', err);
      // If check fails, allow continuation but show warning
      return true;
    }
  };

  const handleAppProcessChange = (field, value) => {
    setAppProcessForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // When university changes, update selected university and reset documents
    if (field === 'universityId') {
      const university = universities.find(u => u._id === value || u.id === value);
      setSelectedUniversity(university);
      // Reset documents when university changes
      setAppProcessForm(prev => ({
        ...prev,
        documents: {}
      }));
      setGeneralDocuments([]);
    }
    
    // Check passport duplicate when passport number changes
    if (field === 'passportNumber') {
      checkPassportDuplicate(value);
    }
  };

  const handleDocumentUpload = async (file, documentType) => {
    if (!file) {
      // Remove document if file is null
      setAppProcessForm(prev => {
        const newDocuments = { ...prev.documents };
        delete newDocuments[documentType];
        return {
          ...prev,
          documents: newDocuments
        };
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, JPEG, PNG, WEBP, PDF, MP4, MOV, or WEBM files.');
      return;
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert(`File size exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`);
      return;
    }

    setUploadingFiles(prev => ({ ...prev, [documentType]: true }));

    try {
      // Store file reference for later submission
      setAppProcessForm(prev => ({
        ...prev,
        documents: {
          ...prev.documents,
          [documentType]: file
        }
      }));
    } catch (err) {
      console.error('Error preparing document:', err);
      alert(err.response?.data?.message || 'Failed to prepare document');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const handleGeneralDocumentsUpload = (files) => {
    if (!files || files.length === 0) {
      return;
    }

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        alert(`Invalid file type for ${file.name}. Please upload JPG, JPEG, PNG, WEBP, PDF, MP4, MOV, or WEBM files.`);
        return false;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        alert(`File size exceeds ${MAX_UPLOAD_SIZE_MB}MB limit for ${file.name}.`);
        return false;
      }
      return true;
    });

    // Add new files to existing ones (allow multiple selections)
    setGeneralDocuments(prev => {
      const existingNames = prev.map(f => f.name);
      const newFiles = validFiles.filter(f => !existingNames.includes(f.name));
      return [...prev, ...newFiles];
    });
  };

  const handleGeneralDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGeneral(true);
  };

  const handleGeneralDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGeneral(false);
  };

  const handleGeneralDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingGeneral(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleGeneralDocumentsUpload(files);
    }
  };

  const handleGeneralFileInputChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleGeneralDocumentsUpload(files);
    }
    e.target.value = ''; // Reset input
  };

  const handleRemoveGeneralDocument = (index) => {
    setGeneralDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAppProcessSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!appProcessForm.name || !appProcessForm.courseId || !appProcessForm.universityId || !appProcessForm.intake) {
      setError('Please fill in all required fields');
      return;
    }

    // Check passport if provided
    if (appProcessForm.passportNumber && passportCheckError) {
      setError('Please fix passport number error');
      return;
    }

    // Validate required documents (excluding "General")
    if (selectedUniversity?.requiredDocuments && selectedUniversity.requiredDocuments.length > 0) {
      const requiredDocs = selectedUniversity.requiredDocuments.filter(doc => doc !== 'General');
      const missingDocs = [];

      requiredDocs.forEach((docName, index) => {
        const documentType = `doc_${index}_${docName.replace(/\s+/g, '_')}`;
        if (!appProcessForm.documents[documentType]) {
          missingDocs.push(docName);
        }
      });

      if (missingDocs.length > 0) {
        setError(`Please upload all required documents: ${missingDocs.join(', ')}`);
        return;
      }
    }

    setSubmitting(true);

    try {
      // Update student with form data
      const payload = {
        fullName: appProcessForm.name,
        passportNumber: appProcessForm.passportNumber || undefined,
        courseId: appProcessForm.courseId,
        universityId: appProcessForm.universityId
      };

      const updateResponse = await api.put(`/students/${id}`, payload);

      if (updateResponse.data.success) {
        // Upload documents if any
        const documentsToUpload = Object.values(appProcessForm.documents).filter(doc => doc !== null && doc instanceof File);
        
        // Add general documents if any
        const allDocuments = [...documentsToUpload, ...generalDocuments];
        
        if (allDocuments.length > 0) {
          const formData = new FormData();
          allDocuments.forEach(file => {
            formData.append('documents', file);
          });

          await api.post(`/students/${id}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }

        // Store intake in localStorage for persistence
        if (appProcessForm.intake) {
          localStorage.setItem(`student_intake_${id}`, appProcessForm.intake);
        }
        
        // Mark application process as submitted
        localStorage.setItem(`app_process_submitted_${id}`, 'true');

        alert('Application process request submitted successfully');
        fetchStudentDetails();
        // Reset form documents
        setAppProcessForm(prev => ({
          ...prev,
          documents: {}
        }));
        setGeneralDocuments([]);
      } else {
        setError(updateResponse.data.message || 'Failed to submit application process request');
      }
    } catch (err) {
      console.error('Error submitting application process:', err);
      setError(err.response?.data?.message || 'Failed to submit application process request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVisaDocumentUpload = async (file) => {
    if (!file) {
      setVisaForm(prev => ({
        ...prev,
        feePaymentStatement: null
      }));
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload JPG, JPEG, PNG, WEBP, or PDF files.');
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert(`File size exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`);
      return;
    }

    // Store file reference for submission
    setVisaForm(prev => ({
      ...prev,
      feePaymentStatement: file
    }));
  };

  const handleVisaSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!visaForm.feePaymentStatement) {
      setError('Please upload fee payment statement');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('documents', visaForm.feePaymentStatement);

      const response = await api.post(`/students/${id}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Mark visa document as submitted
        localStorage.setItem(`visa_document_submitted_${id}`, 'true');
        
        alert('Visa document request submitted successfully');
        fetchStudentDetails();
        setVisaForm(prev => ({ ...prev, feePaymentStatement: null }));
      } else {
        setError(response.data.message || 'Failed to submit visa document request');
      }
    } catch (err) {
      console.error('Error submitting visa request:', err);
      setError(err.response?.data?.message || 'Failed to submit visa document request');
    } finally {
      setSubmitting(false);
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

  const getStatusBadge = () => {
    if (!student) return { text: 'Unknown', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    const statusClassMap = {
      'Under Review': 'status-info',
      'Offer Requested': 'status-info',
      'Offer Received': 'status-success',
      'Application payment 1 received': 'status-info',
      'Application Moved': 'status-info',
      'Ministry Submitted': 'status-info',
      'Exam issued': 'status-info',
      'Application payment 2 received': 'status-info',
      'Fee Paid': 'status-success',
      'Visa Documents Issued': 'status-info',
      'Visa Submitted': 'status-info',
      'Visa Received': 'status-success',
      'Full fee': 'status-success',
      'Application payment 3 received': 'status-success',
      'Visa rejected': 'status-danger',
      'Trc request': 'status-info',
      'Trc approved': 'status-success',
      'Trc rejected': 'status-danger',
      'Student Dropped': 'status-danger'
    };

    return {
      text: currentStatus,
      class: statusClassMap[currentStatus] || 'status-info'
    };
  };

  const getOfferLetterStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    // Offer letter process statuses
    const offerLetterStatuses = ['Offer Requested', 'Offer Received'];
    
    if (currentStatus === 'Under Review') {
      return { text: 'Pending', class: 'status-pending' };
    } else if (offerLetterStatuses.includes(currentStatus)) {
      return { text: 'Submitted', class: 'status-submitted' };
    } else {
      // If status has moved beyond offer letter process, it's completed
      return { text: 'Submitted', class: 'status-submitted' };
    }
  };

  const getApplicationProcessStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    // Application process statuses
    const applicationProcessStatuses = ['Application payment 1 received', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2 received', 'Fee Paid'];
    
    // Check if status indicates submission (admin has moved it forward)
    if (!['Under Review', 'Offer Requested', 'Offer Received'].includes(currentStatus)) {
      return { text: 'Submitted', class: 'status-submitted' };
    }
    
    // Check if there's a submission flag in localStorage
    const submissionFlag = localStorage.getItem(`app_process_submitted_${id}`);
    if (submissionFlag === 'true') {
      return { text: 'Submitted', class: 'status-submitted' };
    }
    
    // Check if intake is filled AND documents exist (indicates form was submitted)
    const savedIntake = localStorage.getItem(`student_intake_${id}`);
    const hasIntake = savedIntake && savedIntake.trim() !== '';
    const hasDocuments = student.documents && student.documents.length > 0;
    
    // If both intake and documents exist, it's been submitted
    if (hasIntake && hasDocuments) {
      return { text: 'Submitted', class: 'status-submitted' };
    }
    
    // Otherwise, it's pending
    return { text: 'Pending', class: 'status-pending' };
  };

  const isApplicationProcessSubmitted = () => {
    if (!student) return false;
    const currentStatus = student.status || 'Under Review';
    
    // Check if status indicates submission (admin has moved it forward)
    if (!['Under Review', 'Offer Requested', 'Offer Received'].includes(currentStatus)) {
      return true;
    }
    
    // Check if there's a submission flag in localStorage
    const submissionFlag = localStorage.getItem(`app_process_submitted_${id}`);
    if (submissionFlag === 'true') {
      return true;
    }
    
    // Check if intake is filled AND documents exist (indicates form was submitted)
    // This handles cases where form was submitted before the flag was implemented
    const savedIntake = localStorage.getItem(`student_intake_${id}`);
    const hasIntake = savedIntake && savedIntake.trim() !== '';
    const hasDocuments = student.documents && student.documents.length > 0;
    
    // If both intake and documents exist, mark as submitted and return true
    if (hasIntake && hasDocuments) {
      // Mark as submitted for future checks
      localStorage.setItem(`app_process_submitted_${id}`, 'true');
      return true;
    }
    
    return false;
  };

  const getVisaDocumentStatus = () => {
    if (!student) return { text: 'Pending', class: 'status-pending' };
    const currentStatus = student.status || 'Under Review';
    
    // Visa document process statuses
    const visaProcessStatuses = ['Fee Paid', 'Visa Documents Issued', 'Visa Submitted', 'Visa Received', 'Full fee', 'Application payment 3 received'];
    
    // Check if status indicates submission (admin has moved it forward)
    if (visaProcessStatuses.includes(currentStatus)) {
      return { text: 'Submitted', class: 'status-submitted' };
    }
    
    // Check if there's a submission flag in localStorage
    const submissionFlag = localStorage.getItem(`visa_document_submitted_${id}`);
    if (submissionFlag === 'true') {
      return { text: 'Submitted', class: 'status-submitted' };
    }
    
    // Check if documents exist (visa document requires fee payment statement)
    // If there are documents uploaded after application process, it might be visa documents
    const hasDocuments = student.documents && student.documents.length > 0;
    const appProcessSubmitted = localStorage.getItem(`app_process_submitted_${id}`) === 'true';
    
    // If application process is submitted and there are documents, check if visa was submitted
    if (appProcessSubmitted && hasDocuments) {
      // Check if there are documents uploaded after application process submission
      // This is a heuristic - if documents exist and app process is submitted, visa might be submitted
      // But we'll rely on the flag for accuracy
    }
    
    // Otherwise, it's pending
    return { text: 'Pending', class: 'status-pending' };
  };

  const isVisaDocumentSubmitted = () => {
    if (!student) return false;
    const currentStatus = student.status || 'Under Review';
    
    // Check if status indicates submission (admin has moved it forward)
    const visaProcessStatuses = ['Fee Paid', 'Visa Documents Issued', 'Visa Submitted', 'Visa Received', 'Full fee', 'Application payment 3 received'];
    if (visaProcessStatuses.includes(currentStatus)) {
      return true;
    }
    
    // Check if there's a submission flag in localStorage
    const submissionFlag = localStorage.getItem(`visa_document_submitted_${id}`);
    if (submissionFlag === 'true') {
      return true;
    }
    
    return false;
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

    let s3Key = doc.s3Key;
    if (!s3Key) {
      const urlToParse = doc.s3Url || doc.url;
      if (urlToParse) {
        try {
          const urlObj = new URL(urlToParse);
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          if (pathParts.length > 0) {
            if (urlObj.hostname.includes('.s3.') || urlObj.hostname.includes('s3-')) {
              s3Key = urlObj.pathname.substring(1);
            } else {
              s3Key = pathParts.slice(1).join('/');
            }
          }
        } catch (urlError) {
          const urlParts = urlToParse.split('.amazonaws.com/');
          if (urlParts.length > 1) {
            s3Key = urlParts[1].split('?')[0];
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
      
      const response = await api.get(`/files/download`, {
        params: { 
          s3Key: s3Key,
          filename: fileName
        },
        responseType: 'blob'
      });
      
      const blob = response.data;
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (err) {
      console.error('Error downloading document:', err);
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
      <PartnerLayout>
        <div className="student-detail-page">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading student details...</p>
          </div>
        </div>
      </PartnerLayout>
    );
  }

  if (error && !student) {
    return (
      <PartnerLayout>
        <div className="student-detail-page">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error || 'Student not found'}</p>
            <button className="btn-back" onClick={() => navigate('/partner/students')}>
              Back to Students
            </button>
          </div>
        </div>
      </PartnerLayout>
    );
  }

  const status = getStatusBadge();

  return (
    <PartnerLayout>
      <div className="student-detail-page">
        {/* Header */}
        <div className="detail-header">
          <button className="btn-back" onClick={() => navigate('/partner/students')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to Students
          </button>
          <div className="header-content">
            <div className="student-header-info">
              <div className="student-avatar-large">
                {getInitials(student?.fullName)}
              </div>
              <div>
                <h1>{student?.fullName || 'N/A'}</h1>
                <p className="student-subtitle">
                  {student?.universityId?.name || 'N/A'} • {student?.courseId?.name || 'N/A'}
                </p>
              </div>
            </div>
            <div className="status-selector-container">
              <span className={`status-badge-large ${status.class}`}>
                {status.text}
              </span>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="section-tabs">
          <button 
            className={`tab-button ${activeSection === 'offer-letter' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('offer-letter');
            }}
            type="button"
          >
            Offer Letter Process Request
          </button>
          <button 
            className={`tab-button ${activeSection === 'application' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('application');
            }}
            type="button"
          >
            Application Process Request
          </button>
          <button 
            className={`tab-button ${activeSection === 'visa' ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveSection('visa');
            }}
            type="button"
          >
            Visa Document Request
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
                  <span className="info-label">Application Created</span>
                  <span className="info-value">{formatDate(student.createdAt)}</span>
                </div>
              </div>

              {/* Offer Letter Display Section (Partner View) */}
              {student.offerLetter && student.offerLetter.fileId && (
                <div className="offer-letter-section">
                  <h3 className="section-subtitle">Offer Letter</h3>
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
                          disabled={downloadingDocId === student.offerLetter.fileId}
                        >
                          {downloadingDocId === student.offerLetter.fileId ? (
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
                    </div>
                  </div>
                </div>
              )}

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
              <CommentsSection studentId={id} userRole={user?.role || 'PARTNER'} />
            </div>
          )}

          {/* Section 2: Application Process Request */}
          {activeSection === 'application' && (
            <div className="process-section">
              <div className="section-header-with-status">
                <h2 className="section-title">Application Process Request</h2>
                <span className={`offer-status-badge ${getApplicationProcessStatus().class}`}>
                  {getApplicationProcessStatus().text}
                </span>
              </div>
              
              {isApplicationProcessSubmitted() ? (
                /* Read-only view when submitted */
                <div className="submitted-view">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Name</span>
                      <span className="info-value">{student.fullName || appProcessForm.name || 'N/A'}</span>
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
                      <span className="info-value">{student.courseId?.name || 'N/A'}</span>
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
                    {(student.intakeId || appProcessForm.intake) && (
                      <div className="info-item">
                        <span className="info-label">Intake</span>
                        <span className="info-value">
                          {student.intakeId?.name || student.intake?.name || appProcessForm.intake || localStorage.getItem(`student_intake_${id}`) || 'N/A'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submitted Documents */}
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
                </div>
              ) : (
                /* Editable form when not submitted */
                <form onSubmit={handleAppProcessSubmit} className="process-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={appProcessForm.name}
                        onChange={(e) => handleAppProcessChange('name', e.target.value)}
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="form-group">
                      <label>Passport Number</label>
                      <input
                        type="text"
                        value={appProcessForm.passportNumber}
                        onChange={(e) => handleAppProcessChange('passportNumber', e.target.value)}
                        disabled={submitting}
                      />
                      {passportCheckError && (
                        <span className="field-error">{passportCheckError}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Course <span className="required">*</span></label>
                      <select
                        value={appProcessForm.courseId}
                        onChange={(e) => handleAppProcessChange('courseId', e.target.value)}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Course</option>
                        {courses.filter(c => c.isActive).map(course => (
                          <option key={course._id} value={course._id}>
                            {course.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>University <span className="required">*</span></label>
                      <select
                        value={appProcessForm.universityId}
                        onChange={(e) => handleAppProcessChange('universityId', e.target.value)}
                        required
                        disabled={submitting}
                      >
                        <option value="">Select University</option>
                        {universities.filter(u => u.isActive).map(university => (
                          <option key={university._id} value={university._id}>
                            {university.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Intake <span className="required">*</span></label>
                      <input
                        type="text"
                        value={appProcessForm.intake}
                        onChange={(e) => handleAppProcessChange('intake', e.target.value)}
                        placeholder="e.g., Fall 2024, Spring 2025"
                        required
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="documents-upload-section">
                    <h3>Required Documents</h3>
                    
                    {selectedUniversity?.requiredDocuments && selectedUniversity.requiredDocuments.length > 0 ? (
                      <>
                        {selectedUniversity.requiredDocuments.includes('General') ? (
                          <div className="general-document-upload" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
                              General Documents (Upload Multiple)
                            </label>
                            
                            {/* Drag and Drop Area */}
                            <div
                              className={`general-drag-drop-area ${isDraggingGeneral ? 'dragging' : ''}`}
                              onDragOver={handleGeneralDragOver}
                              onDragLeave={handleGeneralDragLeave}
                              onDrop={handleGeneralDrop}
                              style={{
                                border: '2px dashed #d1d5db',
                                borderRadius: '8px',
                                padding: '2rem',
                                textAlign: 'center',
                                background: isDraggingGeneral ? '#dbeafe' : '#f9fafb',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                marginBottom: '1rem'
                              }}
                            >
                              <input
                                type="file"
                                id="general-file-input"
                                multiple
                                accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
                                onChange={handleGeneralFileInputChange}
                                disabled={submitting}
                                style={{ display: 'none' }}
                              />
                              <label htmlFor="general-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6b7280' }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="17 8 12 3 7 8"></polyline>
                                  <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                  <strong style={{ color: '#111827', fontSize: '0.9375rem' }}>Drag and drop files here</strong>
                                  <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>or click to browse</span>
                                  <small style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    Supports: JPG, JPEG, PNG, WEBP, PDF, MP4, MOV, WEBM (Max 150MB per file)
                                  </small>
                                </div>
                              </label>
                            </div>

                            {/* Selected Files List */}
                            {generalDocuments.length > 0 && (
                              <div style={{ marginTop: '1rem' }}>
                                <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                                  Selected Files ({generalDocuments.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {generalDocuments.map((file, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '0.75rem',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        border: '1px solid #e5e7eb'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#6b7280', flexShrink: 0 }}>
                                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                          <polyline points="14 2 14 8 20 8"></polyline>
                                          <line x1="16" y1="13" x2="8" y2="13"></line>
                                          <line x1="16" y1="17" x2="8" y2="17"></line>
                                          <polyline points="10 9 9 9 8 9"></polyline>
                                        </svg>
                                        <span style={{ fontSize: '0.875rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {file.name}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 'auto', flexShrink: 0 }}>
                                          {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveGeneralDocument(index)}
                                        disabled={submitting}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#dc2626',
                                          cursor: 'pointer',
                                          padding: '0.25rem 0.5rem',
                                          fontSize: '1.25rem',
                                          lineHeight: '1',
                                          marginLeft: '0.5rem',
                                          flexShrink: 0
                                        }}
                                        title="Remove file"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        <div className="document-upload-grid">
                          {selectedUniversity.requiredDocuments
                            .filter(doc => doc !== 'General')
                            .map((docName, index) => {
                              const documentType = `doc_${index}_${docName.replace(/\s+/g, '_')}`;
                              return (
                                <DocumentUploadField
                                  key={index}
                                  label={docName}
                                  documentType={documentType}
                                  file={appProcessForm.documents[documentType]}
                                  onUpload={handleDocumentUpload}
                                  uploading={uploadingFiles[documentType]}
                                  accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
                                  required={true}
                                />
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '6px', color: '#6b7280' }}>
                        No required documents specified for this university. Please contact admin.
                      </div>
                    )}
                  </div>

                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Application Process Request'}
                  </button>
                </form>
              )}

              {/* Comments Section */}
              <CommentsSection studentId={id} userRole={user?.role || 'PARTNER'} />
            </div>
          )}

          {/* Section 3: Visa Document Request */}
          {activeSection === 'visa' && (
            <div className="process-section">
              <div className="section-header-with-status">
                <h2 className="section-title">Visa Document Request</h2>
                <span className={`offer-status-badge ${getVisaDocumentStatus().class}`}>
                  {getVisaDocumentStatus().text}
                </span>
              </div>
              
              {isVisaDocumentSubmitted() ? (
                /* Read-only view when submitted */
                <div className="submitted-view">
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Name</span>
                      <span className="info-value">{student.fullName || visaForm.name || 'N/A'}</span>
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

                  {/* Submitted Documents */}
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
                </div>
              ) : (
                /* Editable form when not submitted */
                <form onSubmit={handleVisaSubmit} className="process-form">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Name</label>
                      <input
                        type="text"
                        value={visaForm.name}
                        disabled
                        className="disabled-input"
                      />
                    </div>

                    <div className="form-group">
                      <label>Passport Number</label>
                      <input
                        type="text"
                        value={visaForm.passportNumber}
                        disabled
                        className="disabled-input"
                      />
                    </div>
                  </div>

                  <div className="documents-upload-section">
                    <h3>Fee Payment Statement</h3>
                    <DocumentUploadField
                      label="Upload Fee Payment Statement"
                      documentType="feePaymentStatement"
                      file={visaForm.feePaymentStatement}
                      onUpload={handleVisaDocumentUpload}
                      uploading={uploadingFiles.feePaymentStatement}
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Visa Document Request'}
                  </button>
                </form>
              )}

              {/* Comments Section */}
              <CommentsSection studentId={id} userRole={user?.role || 'PARTNER'} />
            </div>
          )}
        </div>
      </div>
    </PartnerLayout>
  );
};

// Document Upload Field Component
const DocumentUploadField = ({ label, documentType, file, onUpload, uploading, accept, required = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onUpload(files[0], documentType);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      onUpload(e.target.files[0], documentType);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    onUpload(null, documentType);
  };

  return (
    <div className="document-upload-field">
      <label className="document-label">
        {label}
        {required && <span className="required" style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <div
        className={`document-drop-zone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''} ${required && !file ? 'required-missing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`file-${documentType}`}
          accept={accept}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <div className="upload-status">Uploading...</div>
        ) : file ? (
          <div className="file-info">
            <span className="file-name">{file.name || file.originalName || file.filename || 'File selected'}</span>
            <button
              type="button"
              onClick={handleRemove}
              className="remove-file-btn"
            >
              Remove
            </button>
          </div>
        ) : (
          <label htmlFor={`file-${documentType}`} className="drop-zone-label">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Drag & drop or click to upload</span>
          </label>
        )}
      </div>
    </div>
  );
};

export default StudentDetail;
