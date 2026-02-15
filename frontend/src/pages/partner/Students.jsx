import { useState, useEffect } from 'react';
import PartnerLayout from '../../components/layout/PartnerLayout';
import api from '../../api/axios';
import './Students.css';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

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
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      student.fullName?.toLowerCase().includes(search) ||
      student.universityId?.name?.toLowerCase().includes(search) ||
      student.courseId?.name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (student) => {
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
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const status = getStatusBadge(student);
                  return (
                    <tr key={student._id || student.id} className="student-row">
                      <td>
                        <div className="student-name-cell">
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

