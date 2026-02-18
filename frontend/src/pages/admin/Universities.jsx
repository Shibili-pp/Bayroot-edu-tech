import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Universities.css';

const Universities = () => {
  const [universities, setUniversities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    location: '',
    description: '',
    requiredDocuments: []
  });
  const [newDocumentName, setNewDocumentName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUniversities();
    fetchCountries();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const response = await api.get('/universities');
      if (response.data.success) {
        setUniversities(response.data.data?.universities || []);
      }
    } catch (error) {
      console.error('Error fetching universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await api.get('/countries');
      if (response.data.success) {
        // Filter only active countries
        const activeCountries = (response.data.data?.countries || []).filter(c => c.isActive);
        setCountries(activeCountries);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const handleOpenModal = (university = null) => {
    if (university) {
      setEditingUniversity(university);
      setFormData({
        name: university.name || '',
        country: university.country || '',
        location: university.location || '',
        description: university.description || '',
        requiredDocuments: university.requiredDocuments || []
      });
    } else {
      setEditingUniversity(null);
      setFormData({
        name: '',
        country: '',
        location: '',
        description: '',
        requiredDocuments: []
      });
    }
    setNewDocumentName('');
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUniversity(null);
    setFormData({
      name: '',
      country: '',
      location: '',
      description: '',
      requiredDocuments: []
    });
    setNewDocumentName('');
    setError('');
  };

  const handleAddDocument = () => {
    if (newDocumentName.trim() && !formData.requiredDocuments.includes(newDocumentName.trim())) {
      setFormData(prev => ({
        ...prev,
        requiredDocuments: [...prev.requiredDocuments, newDocumentName.trim()]
      }));
      setNewDocumentName('');
    }
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      requiredDocuments: prev.requiredDocuments.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editingUniversity) {
        // Update
        const response = await api.put(`/universities/${editingUniversity._id}`, formData);
        if (response.data.success) {
          await fetchUniversities();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to update university');
        }
      } else {
        // Create
        const response = await api.post('/universities', formData);
        if (response.data.success) {
          await fetchUniversities();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to create university');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (university) => {
    setDeleteConfirm({
      show: true,
      id: university._id,
      name: university.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/universities/${deleteConfirm.id}`);
      if (response.data.success) {
        await fetchUniversities();
        setDeleteConfirm({ show: false, id: null, name: '' });
      } else {
        alert('Failed to delete university');
      }
    } catch (error) {
      console.error('Error deleting university:', error);
      alert(error.response?.data?.message || 'Failed to delete university');
    }
  };

  return (
    <AdminLayout>
      <div className="universities-page">
        <div className="page-header">
          <div>
            <h1>Universities</h1>
            <p>Manage universities and their information</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create New University
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading universities...</p>
          </div>
        ) : universities.length > 0 ? (
          <div className="universities-grid">
            {universities.map((university) => (
              <div key={university._id} className="university-card">
                <div className="card-header">
                  <h3>{university.name}</h3>
                  <div className="card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenModal(university)}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49652 12.4163 1.44775 12.6625 1.44775C12.9087 1.44775 13.1524 1.49652 13.3806 1.59128C13.6087 1.68605 13.8166 1.8249 13.9917 2.00001C14.1668 2.17512 14.3056 2.38304 14.4004 2.61118C14.4952 2.83932 14.544 3.08301 14.544 3.32918C14.544 3.57535 14.4952 3.81904 14.4004 4.04718C14.3056 4.27532 14.1668 4.48324 13.9917 4.65835L5.32499 13.325L1.33333 14.6667L2.67499 10.675L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteClick(university)}
                      title="Delete"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Country:</span>
                    <span className="value">{university.country || 'N/A'}</span>
                  </div>
                  {university.location && (
                    <div className="info-row">
                      <span className="label">Location:</span>
                      <span className="value">{university.location}</span>
                    </div>
                  )}
                  {university.description && (
                    <div className="info-row">
                      <span className="label">Description:</span>
                      <span className="value">{university.description}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${university.isActive ? 'active' : 'inactive'}`}>
                      {university.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {university.requiredDocuments && university.requiredDocuments.length > 0 && (
                    <div className="info-row">
                      <span className="label">Required Documents:</span>
                      <span className="value">
                        {university.requiredDocuments.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No universities found</p>
            <p className="empty-subtext">Create your first university to get started.</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Create New University
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingUniversity ? 'Edit University' : 'Create New University'}</h2>
                <button className="modal-close" onClick={handleCloseModal} disabled={submitting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="form-error">{error}</div>}
                <div className="form-group">
                  <label>University Name <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={submitting}
                    placeholder="e.g., University of Toronto"
                  />
                </div>
                <div className="form-group">
                  <label>Country <span className="required">*</span></label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    disabled={submitting}
                    className="form-select"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country._id} value={country.name}>
                        {country.name} {country.code && `(${country.code})`}
                      </option>
                    ))}
                  </select>
                  {countries.length === 0 && (
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      No countries available. Please create a country first.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={submitting}
                    placeholder="e.g., Toronto, Ontario"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                    rows="4"
                    placeholder="Enter university description..."
                  />
                </div>
                <div className="form-group">
                  <label>Required Documents</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      type="text"
                      value={newDocumentName}
                      onChange={(e) => setNewDocumentName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDocument();
                        }
                      }}
                      placeholder="e.g., Passport, Certificate, etc."
                      disabled={submitting}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={handleAddDocument}
                      disabled={submitting || !newDocumentName.trim()}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                    >
                      Add
                    </button>
                  </div>
                  {formData.requiredDocuments && formData.requiredDocuments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {formData.requiredDocuments.map((doc, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.375rem 0.75rem',
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                          }}
                        >
                          <span>{doc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(index)}
                            disabled={submitting}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '0',
                              fontSize: '1rem',
                              lineHeight: '1'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem', display: 'block' }}>
                    Add document types that partners need to upload for this university. Add "General" to allow bulk upload option.
                  </small>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={handleCloseModal} disabled={submitting} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting} className="btn-submit">
                    {submitting ? 'Saving...' : editingUniversity ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="modal-overlay" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Delete University</h2>
                <button className="modal-close" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Universities;

