import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { X } from 'lucide-react';

interface PopupAnnouncement {
  id: string;
  title: string;
  content: string;
  image_url: string;
  button_text: string;
  button_link: string;
  show_on_load: boolean;
  target_audience: 'all' | 'users' | 'vendors';
}

interface PopupAnnouncementsProps {
  userRole?: 'super_admin' | 'vendor' | 'user';
}

export const PopupAnnouncements: React.FC<PopupAnnouncementsProps> = ({ userRole }) => {
  const [announcements, setAnnouncements] = useState<PopupAnnouncement[]>([]);
  const [currentAnnouncement, setCurrentAnnouncement] = useState<PopupAnnouncement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [userRole]);

  const fetchAnnouncements = async () => {
    try {
      let query = supabase
        .from('popup_announcements')
        .select('*')
        .eq('is_active', true)
        .eq('show_on_load', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      // Filter by audience if user is logged in
      if (userRole) {
        query = query.or(`target_audience.eq.all,target_audience.eq.${userRole}`);
      } else {
        query = query.eq('target_audience', 'all');
      }

      const { data } = await query;
      
      if (data && data.length > 0) {
        setAnnouncements(data);
        setCurrentAnnouncement(data[0]);
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setCurrentAnnouncement(null);
    }, 300);
  };

  const handleButtonClick = () => {
    if (currentAnnouncement?.button_link) {
      window.open(currentAnnouncement.button_link, '_blank');
    }
    handleClose();
  };

  if (!currentAnnouncement) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="" className="max-w-2xl">
      <div className="relative">
        <button
          onClick={handleClose}
          className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="space-y-4">
          {currentAnnouncement.image_url && (
            <img
              src={currentAnnouncement.image_url}
              alt={currentAnnouncement.title}
              className="w-full h-64 object-cover rounded-2xl"
            />
          )}

          <div className="text-center space-y-3">
            <h3 className="text-2xl font-bold text-gray-900">{currentAnnouncement.title}</h3>
            <p className="text-gray-600 whitespace-pre-line">{currentAnnouncement.content}</p>
          </div>

          {currentAnnouncement.button_text && (
            <Button
              onClick={handleButtonClick}
              className="w-full h-12 rounded-xl font-bold text-base"
            >
              {currentAnnouncement.button_text}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
