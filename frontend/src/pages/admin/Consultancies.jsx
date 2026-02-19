import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import api, { invalidateCache } from '../../api/axios';
import './Consultancies.css';

const Consultancies = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingPartner, setUpdatingPartner] = useState(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await api.get('/partner');
      if (response.data.success) {
        setPartners(response.data.data?.partners || []);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleApprove = async (partnerId) => {
    // Prevent multiple clicks - check if already updating this partner or any partner
    if (updatingPartner !== null) return;
    
    try {
      setUpdatingPartner(partnerId);
      
      // Optimistically update the UI immediately
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner._id === partnerId 
            ? { ...partner, isApproved: true }
            : partner
        )
      );
      
      const response = await api.put(`/partner/${partnerId}/approve`);
      if (response.data.success) {
        // Invalidate cache and refetch to ensure consistency
        invalidateCache('/partner');
        await fetchPartners();
      } else {
        // Revert optimistic update on error
        setPartners(prevPartners => 
          prevPartners.map(partner => 
            partner._id === partnerId 
              ? { ...partner, isApproved: false }
              : partner
          )
        );
        alert(response.data.message || 'Failed to approve partner');
      }
    } catch (error) {
      console.error('Error approving partner:', error);
      
      // Revert optimistic update on error
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner._id === partnerId 
            ? { ...partner, isApproved: false }
            : partner
        )
      );
      
      // Handle specific error cases
      let errorMessage = 'Failed to approve partner';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
        if (retryAfter) {
          errorMessage = `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
        } else {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        }
      } else if (error.response?.status === 503) {
        errorMessage = 'Database connection unavailable. Please ensure MongoDB is running and try again.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be unavailable or MongoDB is not running. Please check your connection and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      // Add a small delay before re-enabling to prevent rapid clicks
      setTimeout(() => {
        setUpdatingPartner(null);
      }, 500);
    }
  };

  const handleReject = async (partnerId) => {
    // Prevent multiple clicks - check if already updating this partner or any partner
    if (updatingPartner !== null) return;
    
    try {
      setUpdatingPartner(partnerId);
      
      // Optimistically update the UI immediately
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner._id === partnerId 
            ? { ...partner, isApproved: false }
            : partner
        )
      );
      
      const response = await api.put(`/partner/${partnerId}/reject`);
      if (response.data.success) {
        // Invalidate cache and refetch to ensure consistency
        invalidateCache('/partner');
        await fetchPartners();
      } else {
        // Revert optimistic update on error
        setPartners(prevPartners => 
          prevPartners.map(partner => 
            partner._id === partnerId 
              ? { ...partner, isApproved: true }
              : partner
          )
        );
        alert(response.data.message || 'Failed to revoke partner approval');
      }
    } catch (error) {
      console.error('Error rejecting partner:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      // Revert optimistic update on error
      setPartners(prevPartners => 
        prevPartners.map(partner => 
          partner._id === partnerId 
            ? { ...partner, isApproved: true }
            : partner
        )
      );
      
      // Handle specific error cases
      let errorMessage = 'Failed to revoke partner approval';
      
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after'] || error.response?.headers?.['Retry-After'];
        if (retryAfter) {
          errorMessage = `Too many requests. Please wait ${retryAfter} seconds before trying again.`;
        } else {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
        }
      } else if (error.response?.status === 503) {
        errorMessage = 'Database connection unavailable. Please ensure MongoDB is running and try again.';
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be unavailable or MongoDB is not running. Please check your connection and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      // Add a small delay before re-enabling to prevent rapid clicks
      setTimeout(() => {
        setUpdatingPartner(null);
      }, 500);
    }
  };

  const filteredPartners = partners.filter(partner => {
    const searchLower = searchTerm.toLowerCase();
    return (
      partner.companyName?.toLowerCase().includes(searchLower) ||
      partner.email?.toLowerCase().includes(searchLower) ||
      partner.mobileNumber?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <AdminLayout>
      <div className="consultancies-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1>Partners</h1>
            <p className="page-subtitle">Manage and view all registered partners</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L11.1 11.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or mobile number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Partners Table */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading partners...</p>
          </div>
        ) : filteredPartners.length > 0 ? (
          <div className="partners-table-container">
            <table className="partners-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mobile Number</th>
                  <th>Email ID</th>
                  <th>Created Date</th>
                  <th>Approval Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.map((partner) => (
                  <tr key={partner._id}>
                    <td>
                      <div className="partner-name-cell">
                        <span className="partner-name">{partner.companyName || 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="mobile-number">{partner.mobileNumber || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="email">{partner.email || 'N/A'}</span>
                    </td>
                    <td>
                      <span className="created-date">{formatDate(partner.createdAt)}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${partner.isApproved ? 'approved' : 'not-approved'}`}>
                        {partner.isApproved ? 'Approved' : 'Not Approved'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {partner.isApproved ? (
                          <button
                            className="btn-reject"
                            onClick={() => handleReject(partner._id)}
                            disabled={updatingPartner !== null}
                            title="Revoke Approval"
                          >
                            {updatingPartner === partner._id ? 'Updating...' : 'Not Approved'}
                          </button>
                        ) : (
                          <button
                            className="btn-approve"
                            onClick={() => handleApprove(partner._id)}
                            disabled={updatingPartner !== null}
                            title="Approve Partner"
                          >
                            {updatingPartner === partner._id ? 'Updating...' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No partners found</p>
            <p className="empty-subtext">
              {searchTerm ? 'Try adjusting your search criteria' : 'No partners have registered yet'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Consultancies;

