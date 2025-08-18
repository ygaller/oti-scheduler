
import React, { useState, useEffect } from 'react'; // Import useEffect
import './HelpModal.css';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: number;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, activeTab }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return; // Only fetch when modal is open

    const fetchHelpContent = async () => {
      setLoading(true);
      setError(null);
      try {
        let fileName = '';
        switch (activeTab) {
          case 0: // Settings tab
            fileName = 'settings_help.html';
            break;
          case 1: // Employees tab
            fileName = 'employees_help.html';
            break;
          case 2: // Patients tab
            fileName = 'patients_help.html';
            break;
          case 3: // Rooms tab
            fileName = 'rooms_help.html';
            break;
          case 4: // Schedule tab
            fileName = 'schedule_help.html';
            break;
          default:
            setError('תוכן עזרה לא נמצא עבור לשונית זו.');
            setContent('');
            setLoading(false);
            return;
        }
        
        const response = await fetch(`${process.env.PUBLIC_URL}/help/${fileName}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const htmlContent = await response.text();
        setContent(htmlContent);
      } catch (err) {
        console.error('Failed to fetch help content:', err);
        setError('שגיאה בטעינת תוכן העזרה. אנא נסה שוב מאוחר יותר.');
        setContent('');
      } finally {
        setLoading(false);
      }
    };

    fetchHelpContent();
  }, [isOpen, activeTab]); // Re-fetch when modal opens or activeTab changes

  if (!isOpen) return null;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal" onClick={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>עזרה</h2>
          <button className="help-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="help-modal-content">
          {loading && <p>טוען תוכן עזרה...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {!loading && !error && <div dangerouslySetInnerHTML={{ __html: content }} />}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
