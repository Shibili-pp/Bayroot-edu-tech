import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import api from '../../api/axios';
import './Applications.css';

const Applications = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initialize selectedStatus from URL params or default to 'All'
  const getInitialStatus = () => {
    const filter = searchParams.get('filter');
    if (!filter) return 'All';
    
    // Map filter categories to status
    const filterMap = {
      'All': 'All',
      'offer-letter': 'offer-letter',
      'application': 'application',
      'visa': 'visa',
      'trc': 'trc',
      'Visa Received': 'Visa Received',
      'Visa rejected': 'Visa rejected',
      'Student Dropped': 'Student Dropped'
    };
    
    return filterMap[filter] || 'All';
  };
  
  const [selectedStatus, setSelectedStatus] = useState(getInitialStatus());

  // Multi-filter state (now supports selecting multiple values)
  const [filters, setFilters] = useState({
    partner: [],
    course: [],
    status: [],
    intake: [],
    university: [],
    country: []
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setSelectedStatus('All');
    setFilters({
      partner: [],
      course: [],
      status: [],
      intake: [],
      university: [],
      country: []
    });
  };

  const statusOptions = [
    'All',
    'Under Review',
    'Offer Requested',
    'Offer Received',
    'Application payment 1 received',
    'Application Moved',
    'Ministry Submitted',
    'Exam issued',
    'Application payment 2 received',
    'Fee Paid',
    'Visa Documents Issued',
    'Visa Submitted',
    'Visa Received',
    'Full fee',
    'Application payment 3 received',
    'Visa rejected',
    'Trc request',
    'Trc approved',
    'Trc rejected',
    'Student Dropped'
  ];

  // Extract unique filter options from applications data
  const filterOptions = {
    partners: [...new Set(applications.map(a => 
      a.partner?.companyName || (typeof a.partnerId === 'object' ? a.partnerId?.companyName : null) || ''
    ).filter(Boolean))].sort(),
    courses: [...new Set(applications.map(a => a.courseId?.name).filter(Boolean))].sort(),
    statuses: statusOptions.filter(s => s !== 'All'),
    intakes: [...new Set(applications.map(a => a.intakeId?.name || a.intake?.name).filter(Boolean))].sort(),
    universities: [...new Set(applications.map(a => a.universityId?.name).filter(Boolean))].sort(),
    countries: [...new Set(applications.map(a => a.universityId?.country).filter(Boolean))].sort()
  };

  const hasActiveFilters = selectedStatus !== 'All' || Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v));

  useEffect(() => {
    fetchApplications();
  }, []);

  // Update status when URL params change
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setSelectedStatus(getInitialStatus());
    }
  }, [searchParams]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // Fetch students with pagination
      let allStudents = [];
      let page = 1;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await api.get(`/students?page=${page}&limit=${limit}`, {
          cacheTTL: 30 * 1000
        });
        
        if (response.data.success) {
          const students = response.data.data?.students || [];
          allStudents = [...allStudents, ...students];
          
          const pagination = response.data.data?.pagination;
          hasMore = pagination && page < pagination.pages;
          page++;
        } else {
          hasMore = false;
        }
      }

      setApplications(allStudents);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = applications.filter(app => {
    const appStatus = app.status || 'Under Review';
    const partnerName = app.partner?.companyName || (typeof app.partnerId === 'object' ? app.partnerId?.companyName : null) || '';

    // Multi-filter: Partner (supports multiple selected partners)
    if (filters.partner.length > 0 && !filters.partner.includes(partnerName)) return false;

    // Multi-filter: Course
    const courseName = app.courseId?.name || '';
    if (filters.course.length > 0 && !filters.course.includes(courseName)) return false;

    // Multi-filter: Status (supports multiple selected statuses/groups, OR logic)
    if (filters.status.length > 0) {
      const statusMatches = filters.status.some(selectedStatusFilter => {
        if (selectedStatusFilter === 'offer-letter') {
          return ['Under Review', 'Offer Requested', 'Offer Received'].includes(appStatus);
        }
        if (selectedStatusFilter === 'application') {
          return ['Application payment 1 received', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2 received', 'Fee Paid'].includes(appStatus);
        }
        if (selectedStatusFilter === 'visa') {
          return ['Visa Documents Issued', 'Visa Submitted', 'Full fee', 'Application payment 3 received'].includes(appStatus);
        }
        if (selectedStatusFilter === 'trc') {
          return ['Trc request', 'Trc approved', 'Trc rejected'].includes(appStatus);
        }
        // Direct status match
        return appStatus === selectedStatusFilter;
      });

      if (!statusMatches) return false;
    }

    // Legacy status filter (quick buttons)
    if (selectedStatus !== 'All') {
      if (selectedStatus === 'offer-letter') {
        if (!['Under Review', 'Offer Requested', 'Offer Received'].includes(appStatus)) return false;
      } else if (selectedStatus === 'application') {
        if (!['Application payment 1 received', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2 received', 'Fee Paid'].includes(appStatus)) return false;
      } else if (selectedStatus === 'visa') {
        if (!['Visa Documents Issued', 'Visa Submitted', 'Full fee', 'Application payment 3 received'].includes(appStatus)) return false;
      } else if (selectedStatus === 'trc') {
        if (!['Trc request', 'Trc approved', 'Trc rejected'].includes(appStatus)) return false;
      } else if (appStatus !== selectedStatus) return false;
    }

    // Multi-filter: Intake
    const intakeName = app.intakeId?.name || app.intake?.name || '';
    if (filters.intake.length > 0 && !filters.intake.includes(intakeName)) return false;

    // Multi-filter: University
    const universityName = app.universityId?.name || '';
    if (filters.university.length > 0 && !filters.university.includes(universityName)) return false;

    // Multi-filter: Country
    const countryName = app.universityId?.country || '';
    if (filters.country.length > 0 && !filters.country.includes(countryName)) return false;

    // Search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!(
        app.fullName?.toLowerCase().includes(search) ||
        app.universityId?.name?.toLowerCase().includes(search) ||
        app.courseId?.name?.toLowerCase().includes(search) ||
        app.email?.toLowerCase().includes(search) ||
        app.partner?.companyName?.toLowerCase().includes(search) ||
        app.partnerId?.companyName?.toLowerCase().includes(search)
      )) return false;
    }

    return true;
  });

  const getStatusBadge = (app) => {
    const currentStatus = app.status || 'Under Review';
    
    // Map statuses to badge classes
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
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

  return (
    <AdminLayout>
      <div className="applications-page">
        <div className="page-header">
          <div>
            <h1>Applications</h1>
            <p>View and manage all student applications</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17.5 17.5L13.875 13.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, university, course, email, or partner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="clear-search-btn"
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
          <div className="applications-count">
            {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
          </div>
        </div>

        {/* Status Filter */}
        <div className="filter-section">
          <div className="filter-header">
            <div className="filter-label">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M4 8H12M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>Filter by Status</span>
            </div>
            <select
              className="filter-select"
              value={selectedStatus === 'offer-letter' || selectedStatus === 'application' || selectedStatus === 'visa' || selectedStatus === 'trc' ? 'All' : selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <optgroup label="Offer Letter Process">
                <option value="Under Review">Under Review</option>
                <option value="Offer Requested">Offer Requested</option>
                <option value="Offer Received">Offer Received</option>
              </optgroup>
              <optgroup label="Application Process">
                <option value="Application payment 1 received">Application payment 1 received</option>
                <option value="Application Moved">Application Moved</option>
                <option value="Ministry Submitted">Ministry Submitted</option>
                <option value="Exam issued">Exam issued</option>
                <option value="Application payment 2 received">Application payment 2 received</option>
                <option value="Fee Paid">Fee Paid</option>
              </optgroup>
              <optgroup label="Visa Process">
                <option value="Visa Documents Issued">Visa Documents Issued</option>
                <option value="Visa Submitted">Visa Submitted</option>
                <option value="Full fee">Full fee</option>
                <option value="Application payment 3 received">Application payment 3 received</option>
                <option value="Visa Received">Visa Received</option>
                <option value="Visa rejected">Visa rejected</option>
              </optgroup>
              <optgroup label="TRC Process">
                <option value="Trc request">Trc request</option>
                <option value="Trc approved">Trc approved</option>
                <option value="Trc rejected">Trc rejected</option>
              </optgroup>
              <optgroup label="Other">
                <option value="Student Dropped">Student Dropped</option>
              </optgroup>
            </select>
          </div>
          {/* Quick Filter Buttons */}
          <div className="filter-quick-buttons">
            <button
              className={`filter-quick-btn ${selectedStatus === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('All')}
            >
              All
            </button>
            <button
              className={`filter-quick-btn ${selectedStatus === 'offer-letter' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('offer-letter')}
            >
              Offer Letter
            </button>
            <button
              className={`filter-quick-btn ${selectedStatus === 'application' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('application')}
            >
              Application
            </button>
            <button
              className={`filter-quick-btn ${selectedStatus === 'visa' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('visa')}
            >
              Visa
            </button>
            <button
              className={`filter-quick-btn ${selectedStatus === 'trc' ? 'active' : ''}`}
              onClick={() => setSelectedStatus('trc')}
            >
              TRC
            </button>
          </div>

          {/* Multi-Filter Panel */}
          <div className="multi-filter-panel">
            <div className="multi-filter-header">
              <span className="multi-filter-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                Advanced Filters
              </span>
              {hasActiveFilters && (
                <button type="button" className="btn-clear-filters" onClick={clearAllFilters}>
                  Clear all
                </button>
              )}
            </div>
            <div className="multi-filter-grid">
              <div className="multi-filter-item">
                <label>Partner</label>
                <select
                  multiple
                  value={filters.partner}
                  onChange={(e) =>
                    updateFilter(
                      'partner',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  {filterOptions.partners.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="multi-filter-item">
                <label>Course</label>
                <select
                  multiple
                  value={filters.course}
                  onChange={(e) =>
                    updateFilter(
                      'course',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  {filterOptions.courses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="multi-filter-item">
                <label>Status</label>
                <select
                  multiple
                  value={filters.status}
                  onChange={(e) =>
                    updateFilter(
                      'status',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  <optgroup label="Offer Letter">
                    <option value="offer-letter">All Offer Letter Statuses</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Offer Requested">Offer Requested</option>
                    <option value="Offer Received">Offer Received</option>
                  </optgroup>
                  <optgroup label="Application">
                    <option value="application">All Application Statuses</option>
                    <option value="Application payment 1 received">Application payment 1 received</option>
                    <option value="Application Moved">Application Moved</option>
                    <option value="Ministry Submitted">Ministry Submitted</option>
                    <option value="Exam issued">Exam issued</option>
                    <option value="Application payment 2 received">Application payment 2 received</option>
                    <option value="Fee Paid">Fee Paid</option>
                  </optgroup>
                  <optgroup label="Visa">
                    <option value="visa">All Visa Statuses</option>
                    <option value="Visa Documents Issued">Visa Documents Issued</option>
                    <option value="Visa Submitted">Visa Submitted</option>
                    <option value="Full fee">Full fee</option>
                    <option value="Application payment 3 received">Application payment 3 received</option>
                    <option value="Visa Received">Visa Received</option>
                    <option value="Visa rejected">Visa rejected</option>
                  </optgroup>
                  <optgroup label="TRC">
                    <option value="trc">All TRC Statuses</option>
                    <option value="Trc request">Trc request</option>
                    <option value="Trc approved">Trc approved</option>
                    <option value="Trc rejected">Trc rejected</option>
                  </optgroup>
                  <optgroup label="Other">
                    <option value="Student Dropped">Student Dropped</option>
                  </optgroup>
                </select>
              </div>
              <div className="multi-filter-item">
                <label>Intake</label>
                <select
                  multiple
                  value={filters.intake}
                  onChange={(e) =>
                    updateFilter(
                      'intake',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  {filterOptions.intakes.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div className="multi-filter-item">
                <label>University</label>
                <select
                  multiple
                  value={filters.university}
                  onChange={(e) =>
                    updateFilter(
                      'university',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  {filterOptions.universities.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div className="multi-filter-item">
                <label>Country</label>
                <select
                  multiple
                  value={filters.country}
                  onChange={(e) =>
                    updateFilter(
                      'country',
                      Array.from(e.target.selectedOptions, option => option.value)
                    )
                  }
                  className="multi-filter-select"
                >
                  {filterOptions.countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="multi-filter-result-hint">
              Total applications: {applications.length || 0} • After filters: {filteredApplications.length || 0}
            </p>
          </div>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading applications...</p>
          </div>
        ) : filteredApplications.length > 0 ? (
          <div className="applications-table-container">
            <table className="applications-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>University</th>
                  <th>Course</th>
                  <th>Partner Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => {
                  const status = getStatusBadge(app);
                  return (
                    <tr key={app._id || app.id} className="application-row">
                      <td>
                        <div 
                          className="student-name-cell clickable"
                          onClick={() => navigate(`/admin/applications/${app._id || app.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="student-avatar-small">
                            {getInitials(app.fullName)}
                          </div>
                          <span className="student-name">{app.fullName}</span>
                        </div>
                      </td>
                      <td>{app.universityId?.name || 'N/A'}</td>
                      <td>{app.courseId?.name || 'N/A'}</td>
                      <td>{app.partner?.companyName || app.partnerId?.companyName || (typeof app.partnerId === 'object' ? app.partnerId?.companyName : 'Unknown Partner')}</td>
                      <td>{app.email || 'N/A'}</td>
                      <td>{app.phone || 'N/A'}</td>
                      <td>
                        <span className="doc-count">
                          {app.documents?.length || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.class}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>{formatDate(app.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No applications found</p>
            <p className="empty-subtext">
              {searchTerm || hasActiveFilters
                ? 'Try adjusting your search or filters'
                : 'Applications will appear here once students are registered'}
            </p>
            {hasActiveFilters && (
              <button type="button" className="btn-clear-filters-empty" onClick={clearAllFilters}>
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Applications;

