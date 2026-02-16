import { useState, useEffect } from 'react';
import api from '../api/axios';
import './DocumentUploadModal.css';

const DocumentUploadModal = ({ isOpen, onClose, studentId, studentName, missingDocument, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [existingDocuments, setExistingDocuments] = useState([]);

  useEffect(() => {
    if (isOpen && studentId) {
      fetchStudentDocuments();
    }
  }, [isOpen, studentId]);

  const fetchStudentDocuments = async () => {
    try {
      const response = await api.get(`/students/${studentId}`);
      if (response.data.success) {
        setExistingDocuments(response.data.data?.student?.documents || []);
      }
    } catch (err) {
      console.error('Error fetching student documents:', err);
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

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    handleFiles(selectedFiles);
    e.target.value = ''; // Reset input
  };

  const handleFiles = (fileArray) => {
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'video/mp4'];
      return validTypes.includes(file.type);
    });

    if (validFiles.length !== fileArray.length) {
      setError('Some files are invalid. Only JPG, PNG, PDF, and MP4 files are allowed.');
      return;
    }

    // Check file sizes (20MB limit)
    const oversizedFiles = validFiles.filter(file => file.size > 20 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError('Some files exceed the 20MB size limit.');
      return;
    }

    setError('');
    setFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (files.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('documents', file);
      });

      const response = await api.post(`/students/${studentId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        onSuccess && onSuccess();
        handleClose();
      } else {
        setError(response.data.message || 'Failed to upload documents');
      }
    } catch (err) {
      console.error('Error uploading documents:', err);
      setError(err.response?.data?.message || err.message || 'Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setError('');
      setIsDragging(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="document-modal-overlay" onClick={handleClose}>
      <div className="document-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="document-modal-header">
          <div>
            <h2>Upload Document</h2>
            <p className="document-modal-subtitle">
              {studentName && `For: ${studentName}`}
              {missingDocument && ` • Missing: ${missingDocument}`}
            </p>
          </div>
          <button className="document-modal-close" onClick={handleClose} disabled={uploading}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="document-modal-form">
          {error && <div className="document-form-error">{error}</div>}

          {/* Existing Documents */}
          {existingDocuments.length > 0 && (
            <div className="existing-documents-section">
              <h3 className="section-label">Existing Documents</h3>
              <div className="existing-documents-list">
                {existingDocuments.map((doc, index) => (
                  <div key={doc.fileId || index} className="existing-document-item">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                      <path d="M4 2.5C4 1.67157 4.67157 1 5.5 1H10.5L13 3.5V13.5C13 14.3284 12.3284 15 11.5 15H5.5C4.67157 15 4 14.3284 4 13.5V2.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <path d="M10 1V4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span className="document-name" title={doc.originalName || doc.filename}>
                      {doc.originalName || doc.filename || 'Document'}
                    </span>
                    <span className="document-type">{doc.fileType?.toUpperCase() || 'FILE'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* File Upload Area */}
          <div className="document-upload-section">
            <label className="section-label">Upload New Document</label>
            <div
              className={`document-drag-drop-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="document-file-input"
                multiple
                accept=".jpg,.jpeg,.png,.pdf,.mp4"
                onChange={handleFileInputChange}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <label htmlFor="document-file-input" className="document-drag-drop-label">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div className="document-drag-drop-text">
                  <strong>Drag and drop files here</strong>
                  <span>or click to browse</span>
                  <small>Supports: JPG, PNG, PDF, MP4 (Max 20MB per file)</small>
                </div>
              </label>
            </div>

            {/* Selected Files List */}
            {files.length > 0 && (
              <div className="selected-files-list">
                {files.map((file, index) => (
                  <div key={index} className="selected-file-item">
                    <div className="file-info">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px', flexShrink: 0 }}>
                        <path d="M4 2.5C4 1.67157 4.67157 1 5.5 1H10.5L13 3.5V13.5C13 14.3284 12.3284 15 11.5 15H5.5C4.67157 15 4 14.3284 4 13.5V2.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                        <path d="M10 1V4H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="file-name" title={file.name}>
                        {file.name}
                      </span>
                      <span className="file-size">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="btn-remove-file"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="document-modal-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={uploading}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || files.length === 0}
              className="btn-submit"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;



