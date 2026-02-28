import './ImageLightbox.css';

/**
 * Lightbox modal - shows image in full size when clicked
 */
const ImageLightbox = ({ isOpen, imageUrl, alt = 'Image', onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="image-lightbox-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="View image"
    >
      <button 
        className="image-lightbox-close" 
        onClick={onClose} 
        aria-label="Close"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      <div 
        className="image-lightbox-content" 
        onClick={(e) => e.stopPropagation()}
      >
        <img src={imageUrl} alt={alt} />
      </div>
    </div>
  );
};

export default ImageLightbox;
