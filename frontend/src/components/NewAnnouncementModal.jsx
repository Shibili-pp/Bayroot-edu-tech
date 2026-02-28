import { useState, useEffect } from 'react';
import api from '../api/axios';
import './NewAnnouncementModal.css';

const NewAnnouncementModal = ({ isOpen, onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('reminder');
  const [hiddenFromPartners, setHiddenFromPartners] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPartners, setShowPartners] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchPartners();
    }
  }, [isOpen]);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/partners');
      if (response.data.success) {
        setPartners(response.data.data?.partners || []);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePartner = (partnerId) => {
    setHiddenFromPartners(prev => {
      if (prev.includes(partnerId)) {
        return prev.filter(id => id !== partnerId);
      } else {
        return [...prev, partnerId];
      }
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid image (JPG, PNG, or WebP)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be smaller than 5MB');
        return;
      }
      setError('');
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Please enter announcement content');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('content', content.trim());
      formData.append('category', category);
      formData.append('hiddenFromPartners', JSON.stringify(hiddenFromPartners));
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await api.post('/announcements', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setContent('');
        setCategory('reminder');
        setHiddenFromPartners([]);
        setShowPartners(false);
        setImageFile(null);
        setImagePreview(null);
        onSuccess && onSuccess(response.data.data.announcement);
        onClose();
      } else {
        setError(response.data.message || 'Failed to create announcement');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setContent('');
      setCategory('reminder');
      setHiddenFromPartners([]);
      setShowPartners(false);
      setImageFile(null);
      setImagePreview(null);
      setError('');
      onClose();
    }
  };

  const categoryOptions = [
    { 
      value: 'reminder', 
      label: 'Reminder', 
      icon: '📌',
      color: '#3b82f6',
      bgColor: '#eff6ff'
    },
    { 
      value: 'urgent', 
      label: 'Urgent', 
      icon: '⚠️',
      color: '#f59e0b',
      bgColor: '#fffbeb'
    },
    { 
      value: 'critical', 
      label: 'Critical', 
      icon: '🚨',
      color: '#ef4444',
      bgColor: '#fef2f2'
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content announcement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">📢</div>
            <div>
              <h2>New Announcement</h2>
              <p className="header-subtitle">Share important updates with consultancies</p>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose} disabled={submitting}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && (
            <div className="form-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px' }}>
                <path d="M8 5.33333V8M8 10.6667H8.00667M14.6667 8C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8C1.33333 4.3181 4.3181 1.33333 8 1.33333C11.6819 1.33333 14.6667 4.3181 14.6667 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Category Selection - First */}
          <div className="form-section">
            <label className="section-label">Priority Level</label>
            <div className="category-grid">
              {categoryOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`category-card ${category === option.value ? 'active' : ''}`}
                  onClick={() => setCategory(option.value)}
                  disabled={submitting}
                  style={{
                    borderColor: category === option.value ? option.color : '#e5e7eb',
                    backgroundColor: category === option.value ? option.bgColor : 'white',
                    color: category === option.value ? option.color : '#6b7280'
                  }}
                >
                  <span className="category-icon">{option.icon}</span>
                  <span className="category-name">{option.label}</span>
                  {category === option.value && (
                    <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M13.3333 4L6 11.3333L2.66667 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Image */}
          <div className="form-section">
            <label className="section-label">Add Image (optional)</label>
            <div className="announcement-image-upload">
              <input
                type="file"
                id="announcement-image"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                disabled={submitting}
              />
              {!imagePreview ? (
                <label htmlFor="announcement-image" className="announcement-image-dropzone">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15l-5-5L5 21"/>
                  </svg>
                  <span>Click to add image</span>
                  <span className="image-hint">JPG, PNG, WebP (max 5MB)</span>
                </label>
              ) : (
                <div className="announcement-image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={handleRemoveImage}
                    disabled={submitting}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Announcement Content */}
          <div className="form-section">
            <label htmlFor="content" className="section-label">
              Message
            </label>
            <textarea
              id="content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your announcement message here..."
              rows="5"
              required
              disabled={submitting}
              className="announcement-textarea"
            />
            <div className="char-count">{content.length} characters</div>
          </div>

          {/* Hidden Consultancies Section - Collapsible */}
          <div className="form-section">
            <button
              type="button"
              className="section-toggle"
              onClick={() => setShowPartners(!showPartners)}
            >
              <span className="section-label">
                Hide from Consultancies
                {hiddenFromPartners.length > 0 && (
                  <span className="badge-count">{hiddenFromPartners.length}</span>
                )}
              </span>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 20 20" 
                fill="none"
                className={showPartners ? 'rotated' : ''}
              >
                <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {showPartners && (
              <div className="partners-section">
                <p className="section-hint">Select consultancies that should NOT see this announcement</p>
                <div className="partners-list-container">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <span>Loading consultancies...</span>
                    </div>
                  ) : partners.length === 0 ? (
                    <div className="empty-state">No consultancies available</div>
                  ) : (
                    <div className="partners-grid">
                      {partners.map((partner) => {
                        const isSelected = hiddenFromPartners.includes(partner._id || partner.id);
                        return (
                          <button
                            key={partner._id || partner.id}
                            type="button"
                            className={`partner-chip ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleTogglePartner(partner._id || partner.id)}
                            disabled={submitting}
                          >
                            <span>{partner.companyName || partner.name || 'Unknown'}</span>
                            {isSelected && (
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M11.6667 3.5L5.25 10.5L2.33333 7.58333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              disabled={submitting || !content.trim()}
              className="btn-submit"
            >
              {submitting ? (
                <>
                  <div className="spinner-small"></div>
                  Posting...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8L6 12L14 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Post Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewAnnouncementModal;
