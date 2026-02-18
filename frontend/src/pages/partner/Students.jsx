import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PartnerLayout from '../../components/layout/PartnerLayout';
import api from '../../api/axios';
import './Students.css';

const Students = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [droppingStudentId, setDroppingStudentId] = useState(null);
  
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

  useEffect(() => {
    fetchStudents();
  }, []);

  // Update status when URL params change
  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setSelectedStatus(getInitialStatus());
    }
  }, [searchParams]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students?limit=1000');
      if (response.data.success) {
        setStudents(response.data.data?.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    // Filter by status or category
    if (selectedStatus !== 'All') {
      const studentStatus = student.status || 'Under Review';
      
      // Handle special categories
      if (selectedStatus === 'offer-letter') {
        if (!['Under Review', 'Offer Requested', 'Offer Received'].includes(studentStatus)) {
          return false;
        }
      } else if (selectedStatus === 'application') {
        if (!['Application payment 1', 'Application Moved', 'Ministry Submitted', 'Exam issued', 'Application payment 2', 'Fee Paid'].includes(studentStatus)) {
          return false;
        }
      } else if (selectedStatus === 'visa') {
        if (!['Visa Documents Issued', 'Visa Submitted', 'Full fee', 'Application payment 3'].includes(studentStatus)) {
          return false;
        }
      } else if (selectedStatus === 'trc') {
        if (!['Trc request', 'Trc approved', 'Trc rejected'].includes(studentStatus)) {
          return false;
        }
      } else if (studentStatus !== selectedStatus) {
        return false;
      }
    }

    // Filter by search term
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      student.fullName?.toLowerCase().includes(search) ||
      student.universityId?.name?.toLowerCase().includes(search) ||
      student.courseId?.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  const statusOptions = [
    'All',
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

  const getStatusBadge = (student) => {
    const currentStatus = student.status || 'Under Review';
    
    // Map statuses to badge classes
    const statusClassMap = {
      'Under Review': 'status-info',
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
      class: statusClassMap[currentStatus] || 'status-info'
    };
  };

  const handleMarkDropped = async (student) => {
    const studentId = student?._id || student?.id;
    if (!studentId) return;

    const currentStatus = student?.status || 'Under Review';
    if (currentStatus === 'Student Dropped') return;

    const ok = window.confirm(
      `Mark "${student.fullName || 'this student'}" as Student Dropped?\n\nThis will update the status in the database and will be visible to admin too.`
    );
    if (!ok) return;

    try {
      setDroppingStudentId(studentId);
      const response = await api.put(`/students/${studentId}`, { status: 'Student Dropped' });
      if (response.data?.success) {
        // Refresh students list from server to ensure we have the latest data from DB
        await fetchStudents();
        alert('Student marked as dropped successfully. Status saved in database.');
      } else {
        alert(response.data?.message || 'Failed to mark student as dropped');
      }
    } catch (error) {
      console.error('Error marking student dropped:', error);
      alert(error.response?.data?.message || 'Failed to mark student as dropped. Please try again.');
    } finally {
      setDroppingStudentId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <PartnerLayout>
      <div className="students-page">
        <div className="page-header">
          <div>
            <h1>Students</h1>
            <p>View and manage all your students</p>
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
              placeholder="Search by name, university, course, or email..."
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
          <div className="students-count">
            {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
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
                <option value="Application payment 1">Application payment 1</option>
                <option value="Application Moved">Application Moved</option>
                <option value="Ministry Submitted">Ministry Submitted</option>
                <option value="Exam issued">Exam issued</option>
                <option value="Application payment 2">Application payment 2</option>
                <option value="Fee Paid">Fee Paid</option>
              </optgroup>
              <optgroup label="Visa Process">
                <option value="Visa Documents Issued">Visa Documents Issued</option>
                <option value="Visa Submitted">Visa Submitted</option>
                <option value="Full fee">Full fee</option>
                <option value="Application payment 3">Application payment 3</option>
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
        </div>

        {/* Students List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading students...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <div className="students-table-container">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>University</th>
                  <th>Course</th>
                  <th>Email</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const status = getStatusBadge(student);
                  const studentId = student._id || student.id;
                  const isDropped = (student.status || 'Under Review') === 'Student Dropped';
                  const isDropping = droppingStudentId === studentId;
                  return (
                    <tr key={student._id || student.id} className="student-row">
                      <td>
                        <div 
                          className="student-name-cell clickable"
                          onClick={() => navigate(`/partner/students/${student._id || student.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="student-avatar-small">
                            {student.fullName?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <span className="student-name">{student.fullName}</span>
                        </div>
                      </td>
                      <td>{student.universityId?.name || 'N/A'}</td>
                      <td>{student.courseId?.name || 'N/A'}</td>
                      <td>{student.email || 'N/A'}</td>
                      <td>
                        <span className="doc-count">
                          {student.documents?.length || 0}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.class}`}>
                          {status.text}
                        </span>
                      </td>
                      <td>{formatDate(student.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-drop"
                          onClick={() => handleMarkDropped(student)}
                          disabled={isDropped || isDropping}
                          title={isDropped ? 'Already dropped' : 'Mark as Student Dropped'}
                        >
                          {isDropping ? 'Dropping...' : isDropped ? 'Dropped' : 'Drop'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No students found</p>
            <p className="empty-subtext">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Create your first student application to get started'}
            </p>
          </div>
        )}
      </div>
    </PartnerLayout>
  );
};

export default Students;

