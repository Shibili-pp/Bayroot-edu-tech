import { useState, useEffect, useRef } from 'react';
import api, { invalidateCache } from '../api/axios';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB } from '../constants/upload';
import './CommentsSection.css';

const CommentsSection = ({ studentId, userRole }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const fileInputRef = useRef(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (!studentId) return;
    
    const abortController = new AbortController();
    
    fetchComments(abortController.signal);
    
    return () => {
      abortController.abort();
    };
  }, [studentId]);

  // Removed auto-scroll to bottom - user doesn't want automatic scrolling
  // useEffect(() => {
  //   // Scroll to bottom when new comments are added
  //   commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [comments]);

  const fetchComments = async (signal = null) => {
    try {
      setLoading(true);
      // Invalidate cache to ensure fresh data
      invalidateCache(`/comments/student/${studentId}`);
      const response = await api.get(`/comments/student/${studentId}`, { 
        signal,
        cache: false // Force fresh fetch
      });
      if (response.data.success) {
        setComments(response.data.data.comments || []);
      }
    } catch (err) {
      // Ignore abort errors
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      
      // Handle rate limit errors gracefully
      if (err.response?.status === 429) {
        console.warn('Rate limit reached for comments. Retrying...');
        setError('Rate limit exceeded. Comments will load automatically.');
        // Retry after delay
        setTimeout(() => {
          if (!signal?.aborted) {
            fetchComments(signal);
          }
        }, 2000);
        return;
      }
      
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/webm'];
      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a valid file type. Please upload JPG, JPEG, PNG, WEBP, PDF, MP4, MOV, or WEBM files.`);
        return false;
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        alert(`${file.name} exceeds ${MAX_UPLOAD_SIZE_MB}MB limit.`);
        return false;
      }
      return true;
    });
    setFilesToUpload(prev => [...prev, ...validFiles]);
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && filesToUpload.length === 0) {
      setError('Please enter a message or upload a file');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', newComment.trim());
      filesToUpload.forEach(file => {
        formData.append('documents', file);
      });

      // Let the browser set multipart/form-data with the correct boundary (manual header breaks parsing)
      const response = await api.post(`/comments/student/${studentId}`, formData);

      if (response.data.success) {
        const newCommentData = response.data.data.comment;
        
        // ARCHITECTURE IMPROVEMENT: Optimistic UI update - add comment immediately
        // This provides instant feedback without waiting for refetch
        if (newCommentData) {
          setComments(prevComments => {
            // Check if comment already exists (prevent duplicates)
            const exists = prevComments.some(c => c._id === newCommentData._id);
            if (exists) {
              return prevComments;
            }
            // Add new comment to the list
            return [...prevComments, newCommentData];
          });
        }
        
        setNewComment('');
        setFilesToUpload([]);
        
        // Invalidate cache and refetch to ensure consistency
        invalidateCache(`/comments/student/${studentId}`);
        // Refetch with a small delay to ensure backend has processed the comment
        setTimeout(() => {
          fetchComments();
        }, 100);
      } else {
        setError(response.data.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId) => {
    if (!replyText.trim() && filesToUpload.length === 0) {
      setError('Please enter a message or upload a file');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('message', replyText.trim());
      formData.append('parentCommentId', parentId);
      filesToUpload.forEach(file => {
        formData.append('documents', file);
      });

      // Let the browser set multipart/form-data with the correct boundary (manual header breaks parsing)
      const response = await api.post(`/comments/student/${studentId}`, formData);

      if (response.data.success) {
        const newReplyData = response.data.data.comment;
        
        // ARCHITECTURE IMPROVEMENT: Optimistic UI update - add reply immediately
        // This provides instant feedback without waiting for refetch
        if (newReplyData) {
          setComments(prevComments => {
            // Check if reply already exists (prevent duplicates)
            const exists = prevComments.some(c => c._id === newReplyData._id);
            if (exists) {
              return prevComments;
            }
            // Add new reply to the list
            return [...prevComments, newReplyData];
          });
        }
        
        setReplyText('');
        setReplyingTo(null);
        setFilesToUpload([]);
        
        // Invalidate cache and refetch to ensure consistency
        invalidateCache(`/comments/student/${studentId}`);
        // Refetch with a small delay to ensure backend has processed the reply
        setTimeout(() => {
          fetchComments();
        }, 100);
      } else {
        setError(response.data.message || 'Failed to post reply');
      }
    } catch (err) {
      console.error('Error posting reply:', err);
      setError(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuthorName = (comment) => {
    // Check if this comment is from the current user
    const isCurrentUser = comment.role === userRole;
    
    if (isCurrentUser) {
      return 'You';
    }
    
    // For partner interface: show "Bayroot" for admin comments
    if (userRole === 'PARTNER' && comment.role === 'ADMIN') {
      return 'Bayroot';
    }
    
    // For admin interface: show partner company name
    if (userRole === 'ADMIN' && comment.role === 'PARTNER') {
      if (comment.authorId?.companyName) {
        return comment.authorId.companyName;
      }
      return 'Partner';
    }
    
    // Fallback
    if (comment.authorId?.companyName) {
      return comment.authorId.companyName;
    }
    if (comment.authorId?.name) {
      return comment.authorId.name;
    }
    return comment.role === 'ADMIN' ? 'Bayroot' : 'Partner';
  };

  const getS3KeyFromDoc = (doc) => {
    return doc.s3Key || (doc.s3Url ? doc.s3Url.split('.amazonaws.com/')[1]?.split('?')[0] : null);
  };

  const handleDocumentClick = async (doc) => {
    const s3Key = getS3KeyFromDoc(doc);
    if (!s3Key) {
      alert('Unable to access document: missing file information');
      return;
    }

    try {
      const response = await api.get(`/files/document`, {
        params: { s3Key }
      });
      if (response.data.success && response.data.data?.url) {
        window.open(response.data.data.url, '_blank');
      }
    } catch (err) {
      alert('Failed to open document');
    }
  };

  const handleDocumentDownload = async (doc) => {
    const s3Key = getS3KeyFromDoc(doc);
    if (!s3Key) {
      alert('Unable to download document: missing file information');
      return;
    }

    const docId = doc.fileId || doc._id;
    setDownloadingDocId(docId);

    try {
      const fileName = doc.originalName || doc.filename || 'document';
      const response = await api.get(`/files/download`, {
        params: { s3Key, filename: fileName },
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

  const parentComments = comments.filter(c => !c.parentCommentId);
  const repliesMap = comments
    .filter(c => c.parentCommentId)
    .reduce((acc, reply) => {
      const parentId = reply.parentCommentId._id || reply.parentCommentId;
      if (!acc[parentId]) acc[parentId] = [];
      acc[parentId].push(reply);
      return acc;
    }, {});

  if (loading) {
    return (
      <div className="comments-section">
        <div className="comments-loading">Loading comments...</div>
      </div>
    );
  }

  return (
    <div className="comments-section">
      <h3 className="comments-section-title">Comments & Communication</h3>
      
      {error && <div className="comments-error">{error}</div>}

      {/* Comments List */}
      <div className="comments-list">
        {parentComments.length === 0 ? (
          <div className="no-comments">No comments yet. Start the conversation!</div>
        ) : (
          parentComments.map(comment => (
            <div key={comment._id} className={`comment-item ${comment.role === 'ADMIN' ? 'admin-comment' : 'partner-comment'}`}>
              <div className="comment-header">
                <div className="comment-author">
                  <span className="comment-author-name">{getAuthorName(comment)}</span>
                  {getAuthorName(comment) !== 'You' && (
                    <span className={`comment-role-badge ${comment.role.toLowerCase()}`}>
                      {comment.role === 'ADMIN' && userRole === 'PARTNER' ? 'Bayroot' : 
                       comment.role === 'ADMIN' ? 'Admin' : 
                       comment.role === 'PARTNER' && userRole === 'ADMIN' ? (comment.authorId?.companyName || 'Partner') : 'Partner'}
                    </span>
                  )}
                </div>
                <span className="comment-date">{formatDate(comment.createdAt)}</span>
              </div>
              <div className="comment-message">{comment.message}</div>
              
              {/* Comment Documents */}
              {comment.documents && comment.documents.length > 0 && (
                <div className="comment-documents">
                  {comment.documents.map((doc, idx) => (
                    <div key={doc.fileId || idx} className="comment-document-item">
                      <span className="document-name">{doc.originalName || doc.filename}</span>
                      <div className="document-action-btns">
                        <button
                          className="document-view-btn-small"
                          onClick={() => handleDocumentClick(doc)}
                        >
                          View
                        </button>
                        <button
                          className="document-download-btn-small"
                          onClick={() => handleDocumentDownload(doc)}
                          disabled={downloadingDocId === (doc.fileId || doc._id)}
                          title="Download document"
                        >
                          {downloadingDocId === (doc.fileId || doc._id) ? (
                            <>
                              <span className="spinner-small"></span>
                              Downloading...
                            </>
                          ) : (
                            'Download'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Button */}
              {(userRole === 'PARTNER' && comment.role === 'ADMIN') || 
               (userRole === 'ADMIN' && comment.role === 'PARTNER') ? (
                <button
                  className="reply-btn"
                  onClick={() => {
                    setReplyingTo(comment._id);
                    setReplyText('');
                  }}
                >
                  Reply
                </button>
              ) : null}

              {/* Reply Form */}
              {replyingTo === comment._id && (
                <div className="reply-form">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows="3"
                    disabled={submitting}
                  />
                  {filesToUpload.length > 0 && (
                    <div className="files-preview">
                      {filesToUpload.map((file, idx) => (
                        <div key={idx} className="file-preview-item">
                          <span>{file.name}</span>
                          <button onClick={() => removeFile(idx)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="reply-actions">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="attach-file-btn"
                    >
                      Attach File
                    </button>
                    <div className="reply-buttons">
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyText('');
                          setFilesToUpload([]);
                        }}
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSubmitReply(comment._id)}
                        disabled={submitting}
                        className="submit-reply-btn"
                      >
                        {submitting ? 'Sending...' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {repliesMap[comment._id] && repliesMap[comment._id].map(reply => (
                <div key={reply._id} className="comment-reply">
                  <div className="comment-header">
                    <div className="comment-author">
                      <span className="comment-author-name">{getAuthorName(reply)}</span>
                      {getAuthorName(reply) !== 'You' && (
                        <span className={`comment-role-badge ${reply.role.toLowerCase()}`}>
                          {reply.role === 'ADMIN' && userRole === 'PARTNER' ? 'Bayroot' : 
                           reply.role === 'ADMIN' ? 'Admin' : 
                           reply.role === 'PARTNER' && userRole === 'ADMIN' ? (reply.authorId?.companyName || 'Partner') : 'Partner'}
                        </span>
                      )}
                    </div>
                    <span className="comment-date">{formatDate(reply.createdAt)}</span>
                  </div>
                  <div className="comment-message">{reply.message}</div>
                  {reply.documents && reply.documents.length > 0 && (
                    <div className="comment-documents">
                      {reply.documents.map((doc, idx) => (
                        <div key={doc.fileId || idx} className="comment-document-item">
                          <span className="document-name">{doc.originalName || doc.filename}</span>
                          <div className="document-action-btns">
                            <button
                              className="document-view-btn-small"
                              onClick={() => handleDocumentClick(doc)}
                            >
                              View
                            </button>
                            <button
                              className="document-download-btn-small"
                              onClick={() => handleDocumentDownload(doc)}
                              disabled={downloadingDocId === (doc.fileId || doc._id)}
                              title="Download document"
                            >
                              {downloadingDocId === (doc.fileId || doc._id) ? (
                                <>
                                  <span className="spinner-small"></span>
                                  Downloading...
                                </>
                              ) : (
                                'Download'
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* New Comment Form */}
      {(userRole === 'PARTNER' || userRole === 'ADMIN') && (
        <form onSubmit={handleSubmitComment} className="new-comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your message..."
            rows="3"
            disabled={submitting}
            required={filesToUpload.length === 0}
          />
          {filesToUpload.length > 0 && (
            <div className="files-preview">
              {filesToUpload.map((file, idx) => (
                <div key={idx} className="file-preview-item">
                  <span>{file.name}</span>
                  <button type="button" onClick={() => removeFile(idx)}>×</button>
                </div>
              ))}
            </div>
          )}
          <div className="comment-form-actions">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="attach-file-btn"
            >
              Attach File
            </button>
            <button
              type="submit"
              disabled={submitting || (!newComment.trim() && filesToUpload.length === 0)}
              className="submit-comment-btn"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CommentsSection;

