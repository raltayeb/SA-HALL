import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Hall, UserProfile, VAT_RATE } from '../types';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../utils/currency';
import { ImageOff, MapPin, CheckCircle2 } from 'lucide-react';

interface BrowseHallsProps {
  user: UserProfile;
}

export const BrowseHalls: React.FC<BrowseHallsProps> = ({ user }) => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingHall, setBookingHall] = useState<Hall | null>(null);
  const [bookingDate, setBookingDate] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('halls').select('*').eq('is_active', true);
      if (data) setHalls(data);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleBook = async () => {
    if (!bookingHall || !bookingDate) return;

    const baseAmount = bookingHall.price_per_night;
    const vatAmount = baseAmount * VAT_RATE;
    const totalAmount = baseAmount + vatAmount;

    const { error } = await supabase.from('bookings').insert([{
      hall_id: bookingHall.id,
      user_id: user.id,
      vendor_id: bookingHall.vendor_id,
      booking_date: bookingDate,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      status: 'pending'
    }]);

    if (!error) {
      alert('تم إرسال طلب الحجز بنجاح!');
      setBookingHall(null);
      setBookingDate('');
    } else {
      alert('فشل الحجز. حاول مرة أخرى.');
    }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">تصفح القاعات المتاحة</h2>

      {bookingHall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-card w-full max-w-md rounded-xl p-6 space-y-4 shadow-lg border">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <CheckCircle2 className="text-primary w-5 h-5" />
              حجز {bookingHall.name}
            </h3>
            <div className="space-y-2">
              <label className="text-sm font-medium">تاريخ المناسبة</label>
              <input 
                type="date" 
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-foreground"
                value={bookingDate}
                onChange={e => setBookingDate(e.target.value)}
              />
            </div>
            
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <div className="flex justify-between">
                <span>سعر القاعة</span>
                <span>{formatCurrency(bookingHall.price_per_night)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>ضريبة القيمة المضافة (15%)</span>
                <span>{formatCurrency(bookingHall.price_per_night * VAT_RATE)}</span>
              </div>
              <div className="flex justify-between font-bold text-primary pt-2 border-t border-border">
                <span>الإجمالي</span>
                <span>{formatCurrency(bookingHall.price_per_night * (1 + VAT_RATE))}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setBookingHall(null)}>إلغاء</Button>
              <Button onClick={handleBook} disabled={!bookingDate}>تأكيد الحجز</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {halls.map(hall => (
          <div key={hall.id} className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all group">
             <div className="aspect-video w-full bg-muted relative overflow-hidden">
              {hall.image_url ? (
                <img src={hall.image_url} alt={hall.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                  <ImageOff className="h-8 w-8 mb-2 opacity-50" />
                  <span className="text-xs">صورة القاعة</span>
                </div>
              )}
             </div>
             <div className="p-4">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{hall.name}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {hall.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block font-bold text-primary">{formatCurrency(hall.price_per_night)}</span>
                  </div>
               </div>
               <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{hall.description}</p>
               <Button className="w-full mt-4" onClick={() => setBookingHall(hall)}>
                 احجز الآن
               </Button>
             </div>
          </div>
        ))}
        {halls.length === 0 && (
          <div className="col-span-full py-20 text-center text-muted-foreground">
            لا توجد قاعات متاحة حالياً.
          </div>
        )}
      </div>
    </div>
  );
};