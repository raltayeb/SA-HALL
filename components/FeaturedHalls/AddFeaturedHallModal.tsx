import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { UserProfile, Hall } from '../../types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { Star, Plus, X, Search, Check } from 'lucide-react';

interface AddFeaturedHallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddFeaturedHallModal: React.FC<AddFeaturedHallModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [selectedHall, setSelectedHall] = useState<string | null>(null);
  const [duration, setDuration] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchHalls();
    }
  }, [isOpen]);

  const fetchHalls = async () => {
    const { data } = await supabase
      .from('halls')
      .select('*')
      .eq('is_active', true)
      .eq('type', 'hall')
      .order('created_at', { ascending: false });
    
    setHalls(data || []);
  };

  const handleAdd = async () => {
    if (!selectedHall) {
      toast({ title: 'تنبيه', description: 'يرجى اختيار قاعة', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const days = parseInt(duration);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      // Update hall
      await supabase
        .from('halls')
        .update({
          is_featured: true,
          featured_until: endDate.toISOString()
        })
        .eq('id', selectedHall);

      // Create featured_halls record
      const { error } = await supabase
        .from('featured_halls')
        .insert([{
          hall_id: selectedHall,
          end_date: endDate.toISOString(),
          is_active: true
        }]);

      if (error) throw error;

      toast({ title: 'تم التفعيل', description: `تم تفعيل القاعة كمميزة لمدة ${days} يوم`, variant: 'success' });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'خطأ', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredHalls = halls.filter(hall => 
    hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hall.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center z-10">
          <h3 className="text-xl font-black text-gray-900">إضافة قاعة مميزة</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="ابحث عن قاعة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 rounded-xl pr-12 pl-4 border border-gray-200 outline-none focus:border-primary"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          </div>

          {/* Halls List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredHalls.length === 0 ? (
              <p className="text-center text-gray-400 py-8 font-bold">لا توجد قاعات</p>
            ) : (
              filteredHalls.map((hall) => (
                <div
                  key={hall.id}
                  onClick={() => !hall.is_featured && setSelectedHall(hall.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedHall === hall.id
                      ? 'border-primary bg-primary/5'
                      : hall.is_featured
                      ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-100 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img src={hall.image_url} alt={hall.name} className="w-16 h-16 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="font-black text-gray-900">{hall.name}</p>
                      <p className="text-xs text-gray-500 font-bold">{hall.city}</p>
                    </div>
                    {hall.is_featured ? (
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" /> مميزة
                      </span>
                    ) : selectedHall === hall.id ? (
                      <Check className="w-6 h-6 text-primary" />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Duration */}
          {selectedHall && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <label className="text-sm font-bold text-gray-500">مدة التمييز</label>
              <div className="grid grid-cols-3 gap-3">
                {[7, 14, 30, 60, 90, 180].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDuration(days.toString())}
                    className={`h-12 rounded-xl font-bold text-sm transition-all ${
                      duration === days.toString()
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {days} يوم
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={handleAdd}
              disabled={!selectedHall || loading}
              className="flex-1 h-14 rounded-2xl font-black"
            >
              <Star className="w-5 h-5 ml-2" />
              {loading ? 'جاري التفعيل...' : 'تفعيل القاعة كمميزة'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
