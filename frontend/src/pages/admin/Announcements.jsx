import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import NewAnnouncementModal from '../../components/NewAnnouncementModal';
import api from '../../api/axios';
import './Announcements.css';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null, content: '' });
  const [deleting, setDeleting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedCategory]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const response = await api.get('/announcements', { params });
      if (response.data.success) {
        setAnnouncements(response.data.data?.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (announcement) => {
    setDeleteConfirm({
      show: true,
      id: announcement._id,
      content: announcement.content
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;

    try {
      setDeleting(true);
      const response = await api.delete(`/announcements/${deleteConfirm.id}`);
      
      if (response.data.success) {
        setAnnouncements(prev => prev.filter(a => a._id !== deleteConfirm.id));
        setDeleteConfirm({ show: false, id: null, content: '' });
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert(error.response?.data?.message || 'Failed to delete announcement');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, id: null, content: '' });
  };

  const getCategoryInfo = (category) => {
    const categories = {
      reminder: { name: 'Reminder', color: '#3b82f6', bg: '#eff6ff' },
      urgent: { name: 'Urgent', color: '#f59e0b', bg: '#fffbeb' },
      critical: { name: 'Critical', color: '#ef4444', bg: '#fef2f2' }
    };
    return categories[category] || categories.reminder;
  };

  const formatDate = (date) => {
    const createdDate = new Date(date);
    const now = new Date();
    const diffMs = now - createdDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const filteredAnnouncements = selectedCategory === 'all' 
    ? announcements 
    : announcements.filter(a => a.category === selectedCategory);

  return (
    <AdminLayout>
      <div className="announcements-page">
        {/* Header */}
        <div className="announcements-header">
          <div>
            <h1>Announcements</h1>
            <p className="page-subtitle">Manage and view all announcements</p>
          </div>
          <button 
            className="btn-new-announcement"
            onClick={() => setIsAnnouncementModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '6px' }}>
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New Announcement
          </button>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <button
            className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All ({announcements.length})
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'reminder' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('reminder')}
          >
            Reminder ({announcements.filter(a => a.category === 'reminder').length})
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'urgent' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('urgent')}
          >
            Urgent ({announcements.filter(a => a.category === 'urgent').length})
          </button>
          <button
            className={`filter-btn ${selectedCategory === 'critical' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('critical')}
          >
            Critical ({announcements.filter(a => a.category === 'critical').length})
          </button>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading announcements...</p>
          </div>
        ) : filteredAnnouncements.length > 0 ? (
          <div className="announcements-list-page">
            {filteredAnnouncements.map((announcement) => {
              const categoryInfo = getCategoryInfo(announcement.category);
              return (
                <div key={announcement._id} className="announcement-card-page">
                  <div className="announcement-header-page">
                    <div className="announcement-category-badge-page" style={{ 
                      backgroundColor: categoryInfo.bg,
                      color: categoryInfo.color
                    }}>
                      {categoryInfo.name}
                    </div>
                    <button
                      className="delete-announcement-btn-page"
                      onClick={() => handleDeleteClick(announcement)}
                      title="Delete announcement"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                  <div className="announcement-content-page">
                    <p>{announcement.content}</p>
                    {(announcement.image?.imageUrl || announcement.image?.s3Url) && (
                      <div className="announcement-image-page">
                        <img 
                          src={announcement.image.imageUrl || announcement.image.s3Url} 
                          alt="Announcement" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="announcement-footer-page">
                    <span className="announcement-date-page">{formatDate(announcement.createdAt)}</span>
                    {announcement.hiddenFromPartners?.length > 0 && (
                      <span className="hidden-badge-page">
                        Hidden from {announcement.hiddenFromPartners.length} {announcement.hiddenFromPartners.length === 1 ? 'consultancy' : 'consultancies'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>No announcements found</p>
            <p className="empty-subtext">
              {selectedCategory === 'all' 
                ? 'Create your first announcement using the "New Announcement" button.'
                : `No ${selectedCategory} announcements found.`}
            </p>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="delete-modal-overlay" onClick={handleDeleteCancel}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="delete-modal-header">
                <h3>Delete Announcement</h3>
                <button className="delete-modal-close" onClick={handleDeleteCancel} disabled={deleting}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="delete-modal-body">
                <p>Are you sure you want to delete this announcement?</p>
                <div className="delete-preview">
                  <p>"{deleteConfirm.content.length > 100 ? deleteConfirm.content.substring(0, 100) + '...' : deleteConfirm.content}"</p>
                </div>
                <p className="delete-warning">This action cannot be undone. The announcement will be removed from all partner interfaces.</p>
              </div>
              <div className="delete-modal-actions">
                <button
                  className="btn-cancel-delete"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm-delete"
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <div className="spinner-small"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Announcement Modal */}
      <NewAnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
        onSuccess={(announcement) => {
          setIsAnnouncementModalOpen(false);
          fetchAnnouncements();
        }}
      />
    </AdminLayout>
  );
};

export default Announcements;


