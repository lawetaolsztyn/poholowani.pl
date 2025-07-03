// src/components/Modal.jsx
import React, { useEffect, useRef } from 'react';
import './Modal.css'; // Stwórz ten plik CSS w tym samym katalogu

export default function Modal({ isOpen, onClose, children, title }) {
  const modalRef = useRef(null);

  // Efekt do obsługi zamykania modala po naciśnięciu Esc lub kliknięciu poza nim
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      // Zamknij modal, jeśli kliknięto poza jego zawartością, ale nie na sam modalRef ani jego dzieci
      // Dodatkowo, upewnij się, że kliknięcie nie pochodzi z elementu Portalu (jak Mapbox Autocomplete Sugestie)
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        // Sprawdź, czy kliknięcie nie pochodzi z sugestii LocationAutocomplete
        const isAutocompleteClick = event.target.closest('.autocomplete-list');
        if (!isAutocompleteClick) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      // Zablokuj scrollowanie tła
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset'; // Przywróć scrollowanie przy odmontowaniu
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" ref={modalRef}>
        <div className="modal-header">
          {title && <h2 className="modal-title">{title}</h2>}
          <button className="modal-close-button" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}