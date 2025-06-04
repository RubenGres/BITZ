import React, { useEffect } from 'react';

interface FullscreenImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

const FullscreenImageModal: React.FC<FullscreenImageModalProps> = ({
  src,
  alt,
  isOpen,
  onClose
}) => {
  // Handle escape key to close fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 transition-colors z-10"
          aria-label="Close fullscreen"
        >
          ×
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="text-white text-center mt-4 text-sm">
          <div>{alt}</div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenImageModal;