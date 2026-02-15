import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Courses.css';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [countries, setCountries] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, name: '' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    countryId: '',
    universityId: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchCountries();
  }, []);

  useEffect(() => {
    if (formData.countryId) {
      fetchUniversities(formData.countryId);
    } else {
      setFilteredUniversities([]);
      setFormData(prev => ({ ...prev, universityId: '' }));
    }
  }, [formData.countryId]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses');
      if (response.data.success) {
        setCourses(response.data.data?.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await api.get('/countries');
      if (response.data.success) {
        const activeCountries = (response.data.data?.countries || []).filter(c => c.isActive);
        setCountries(activeCountries);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchUniversities = async (countryId) => {
    try {
      // Get current countries state or fetch if needed
      let countriesList = countries;
      if (countriesList.length === 0) {
        const countriesResponse = await api.get('/countries');
        if (countriesResponse.data.success) {
          countriesList = (countriesResponse.data.data?.countries || []).filter(c => c.isActive);
        }
      }

      const response = await api.get('/universities');
      if (response.data.success) {
        const allUniversities = response.data.data?.universities || [];
        // Filter universities by selected country
        const country = countriesList.find(c => c._id === countryId);
        if (country) {
          const filtered = allUniversities.filter(u => 
            u.isActive && u.country === country.name
          );
          setFilteredUniversities(filtered);
        } else {
          setFilteredUniversities([]);
        }
      }
    } catch (error) {
      console.error('Error fetching universities:', error);
      setFilteredUniversities([]);
    }
  };

  const handleOpenModal = (course = null) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        name: course.name || '',
        description: course.description || '',
        category: course.category || '',
        countryId: course.countryId?._id || course.countryId || '',
        universityId: course.universityId?._id || course.universityId || ''
      });
      // Fetch universities for the selected country
      if (course.countryId?._id || course.countryId) {
        fetchUniversities(course.countryId?._id || course.countryId);
      }
    } else {
      setEditingCourse(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        countryId: '',
        universityId: ''
      });
      setFilteredUniversities([]);
    }
    setError('');
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormData({
      name: '',
      description: '',
      category: '',
      countryId: '',
      universityId: ''
    });
    setFilteredUniversities([]);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.countryId || !formData.universityId) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      if (editingCourse) {
        const response = await api.put(`/courses/${editingCourse._id}`, formData);
        if (response.data.success) {
          await fetchCourses();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to update course');
        }
      } else {
        const response = await api.post('/courses', formData);
        if (response.data.success) {
          await fetchCourses();
          handleCloseModal();
        } else {
          setError(response.data.message || 'Failed to create course');
        }
      }
    } catch (error) {
      console.error('Error saving course:', error);
      setError(error.response?.data?.message || 'Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (course) => {
    setDeleteConfirm({
      show: true,
      id: course._id,
      name: course.name
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await api.delete(`/courses/${deleteConfirm.id}`);
      if (response.data.success) {
        await fetchCourses();
        setDeleteConfirm({ show: false, id: null, name: '' });
      } else {
        alert('Failed to delete course');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(error.response?.data?.message || 'Failed to delete course');
    }
  };

  return (
    <AdminLayout>
      <div className="courses-page">
        <div className="page-header">
          <div>
            <h1>Courses</h1>
            <p>Manage courses and their information</p>
          </div>
          <button className="btn-primary" onClick={() => handleOpenModal()}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create New Course
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading courses...</p>
          </div>
        ) : courses.length > 0 ? (
          <div className="courses-grid">
            {courses.map((course) => (
              <div key={course._id} className="course-card">
                <div className="card-header">
                  <h3>{course.name}</h3>
                  <div className="card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenModal(course)}
                      title="Edit"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M11.3333 2.00001C11.5084 1.8249 11.7163 1.68605 11.9444 1.59128C12.1726 1.49652 12.4163 1.44775 12.6625 1.44775C12.9087 1.44775 13.1524 1.49652 13.3806 1.59128C13.6087 1.68605 13.8166 1.8249 13.9917 2.00001C14.1668 2.17512 14.3056 2.38304 14.4004 2.61118C14.4952 2.83932 14.544 3.08301 14.544 3.32918C14.544 3.57535 14.4952 3.81904 14.4004 4.04718C14.3056 4.27532 14.1668 4.48324 13.9917 4.65835L5.32499 13.325L1.33333 14.6667L2.67499 10.675L11.3333 2.00001Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="btn-icon delete"
                      onClick={() => handleDeleteClick(course)}
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
                    <span className="value">
                      {course.countryId?.name || 'N/A'}
                      {course.countryId?.code && ` (${course.countryId.code})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">University:</span>
                    <span className="value">{course.universityId?.name || 'N/A'}</span>
                  </div>
                  {course.category && (
                    <div className="info-row">
                      <span className="label">Category:</span>
                      <span className="value">{course.category}</span>
                    </div>
                  )}
                  {course.description && (
                    <div className="info-row">
                      <span className="label">Description:</span>
                      <span className="value">{course.description}</span>
                    </div>
                  )}
                  <div className="info-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${course.isActive ? 'active' : 'inactive'}`}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No courses found</p>
            <p className="empty-subtext">Create your first course to get started</p>
            <button className="btn-primary" onClick={() => handleOpenModal()}>
              Create Course
            </button>
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCourse ? 'Edit Course' : 'Create New Course'}</h2>
                <button className="modal-close" onClick={handleCloseModal} disabled={submitting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                {error && <div className="form-error">{error}</div>}
                <div className="form-group">
                  <label htmlFor="name">
                    Course Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    required
                    disabled={submitting}
                  />
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
                    disabled={submitting || loadingCountries}
                    className="form-select"
                  >
                    <option value="">Select a country</option>
                    {countries.map((country) => (
                      <option key={country._id} value={country._id}>
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
                  <label htmlFor="universityId">
                    University <span className="required">*</span>
                  </label>
                  <select
                    id="universityId"
                    name="universityId"
                    value={formData.universityId}
                    onChange={handleChange}
                    required
                    disabled={submitting || !formData.countryId || filteredUniversities.length === 0}
                    className="form-select"
                  >
                    <option value="">
                      {!formData.countryId 
                        ? 'Select a country first' 
                        : filteredUniversities.length === 0 
                        ? 'No universities available for this country'
                        : 'Select a university'}
                    </option>
                    {filteredUniversities.map((university) => (
                      <option key={university._id} value={university._id}>
                        {university.name}
                      </option>
                    ))}
                  </select>
                  {formData.countryId && filteredUniversities.length === 0 && (
                    <small style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                      No universities available for the selected country. Please create a university first.
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g., Engineering, Business, Arts"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Enter course description..."
                    disabled={submitting}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={handleCloseModal}
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
                    {submitting ? 'Saving...' : editingCourse ? 'Update Course' : 'Create Course'}
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
                <h2>Delete Course</h2>
                <button className="modal-close" onClick={() => setDeleteConfirm({ show: false, id: null, name: '' })}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this course?</p>
                <p className="warning-text">
                  <strong>{deleteConfirm.name}</strong> will be permanently deleted and cannot be recovered.
                </p>
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
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Courses;

