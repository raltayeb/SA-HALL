
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Booking, VAT_RATE } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { Printer, Download, QrCode, Share2, Send, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '../../context/ToastContext';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ isOpen, onClose, booking }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const { toast } = useToast();

  if (!booking) return null;

  const isConsultation = booking.booking_type === 'consultation';
  const isPackageBooking = !!booking.package_name; 
  
  // Base Price Logic
  const rawSubtotal = isPackageBooking ? 0 : (booking.halls?.price_per_night || booking.chalets?.price_per_night || booking.services?.price || 0);
  
  // Items Total
  const itemsTotal = booking.items ? booking.items.reduce((sum, i) => sum + (i.price * i.qty), 0) : 0;
  
  const totalSubWithItems = rawSubtotal + itemsTotal;
  const discountAmount = Number(booking.discount_amount || 0);
  const taxableAmount = Math.max(0, totalSubWithItems - discountAmount);
  const vatAmount = isConsultation ? 0 : taxableAmount * VAT_RATE;
  
  const paidAmount = booking.paid_amount || 0;
  const remainingAmount = Math.max(0, booking.total_amount - paidAmount);

  const vendorName = booking.vendor?.business_name || booking.profiles?.business_name || 'SA Hall';
  const taxId = booking.vendor?.pos_config?.tax_id || booking.profiles?.pos_config?.tax_id || 'غير متوفر';

  // --- ACTIONS ---

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('printable-invoice');
    if (!element) return;

    try {
      // Use html2canvas to capture the invoice div as an image (preserves Arabic fonts)
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice_${booking.id.slice(0,8)}.pdf`);
      toast({ title: 'تم التحميل', description: 'تم حفظ الفاتورة بنجاح.', variant: 'success' });
    } catch (err) {
      console.error(err);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء إنشاء الملف.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShare = async () => {
    const text = `فاتورة حجز من ${vendorName}\nرقم المرجع: #${booking.id.slice(0, 8)}\nالإجمالي: ${formatCurrency(booking.total_amount)}\nالتاريخ: ${booking.booking_date}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'فاتورة حجز',
          text: text,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      // Fallback to WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isConsultation ? "تصدير عرض سعر" : "خيارات الفاتورة"} className="max-w-md w-full mx-auto my-auto z-[2000] max-h-[85vh] flex flex-col">
      
      {/* Invoice Content (Visible & Printable) */}
      <div className="bg-white p-6 rounded-t-xl overflow-y-auto custom-scrollbar flex-1" id="printable-invoice">
        {/* Header Compact */}
        <div className="flex flex-col-reverse justify-between items-center border-b pb-6 gap-4 text-center">
          <div>
            <h2 className="text-2xl font-black text-primary leading-none">{vendorName}</h2>
            <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{isConsultation ? 'عرض مبدئي' : 'فاتورة ضريبية مبسطة'}</p>
            <p className="text-[10px] text-gray-900 font-bold mt-1">الرقم الضريبي: <span className="font-mono">{taxId}</span></p>
          </div>
          <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
             <QrCode className="w-16 h-16 text-primary" />
          </div>
        </div>

        {/* Info Compact */}
        <div className="py-6 space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500 text-xs font-bold">العميل</span>
                <span className="font-black text-gray-900 text-sm">{booking.profiles?.full_name || booking.guest_name || 'عميل'}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500 text-xs font-bold">رقم المرجع</span>
                <span className="font-mono font-black text-primary text-sm">#{booking.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-gray-500 text-xs font-bold">التاريخ</span>
                <span className="font-bold font-mono text-sm">{new Date(booking.created_at || '').toLocaleDateString('ar-SA')}</span>
            </div>
        </div>

        {/* Table Compact */}
        <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-6">
          <table className="w-full text-xs">
            <thead className="bg-gray-900 text-white font-black text-[10px] uppercase">
              <tr>
                <th className="p-3 text-right">الوصف</th>
                <th className="p-3 text-left">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {/* Main Hall/Service/Chalet */}
              {(booking.halls || booking.services || booking.chalets) && (
                  <tr>
                    <td className="p-3">
                      <div className="font-bold text-gray-900 line-clamp-1">{booking.halls?.name || booking.chalets?.name || booking.services?.name}</div>
                      <div className="text-[9px] text-gray-400 font-bold mt-0.5">{booking.booking_date}</div>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-gray-900">
                        {isPackageBooking ? <span className="text-[9px] text-gray-400 font-medium">مشمول في الباقة</span> : formatCurrency(booking.halls?.price_per_night || booking.chalets?.price_per_night || booking.services?.price || 0)}
                    </td>
                  </tr>
              )}
              
              {/* Extra Items */}
              {booking.items && booking.items.map((item, idx) => (
                  <tr key={idx}>
                      <td className="p-3">
                          <div className="font-medium text-gray-700 flex items-center gap-1 line-clamp-1">
                              {item.name} <span className="text-[9px] text-gray-400">x{item.qty}</span>
                          </div>
                      </td>
                      <td className="p-3 text-left font-mono font-medium text-gray-900">{formatCurrency(item.price * item.qty)}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Details Compact */}
        <div className="space-y-3 text-xs">
          <div className="flex justify-between text-gray-500 font-bold px-2">
            <span>المجموع الفرعي</span>
            <span className="font-mono">{formatCurrency(totalSubWithItems)}</span>
          </div>
          
          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 font-bold px-2">
                <span>خصم {booking.applied_coupon ? `(${booking.applied_coupon})` : ''}</span>
                <span className="font-mono">- {formatCurrency(discountAmount)}</span>
            </div>
          )}

          {!isConsultation && (
            <div className="flex justify-between text-gray-500 font-bold px-2">
                <span>الضريبة (15%)</span>
                <span className="font-mono">{formatCurrency(vatAmount)}</span>
            </div>
          )}
          
          <div className="bg-gray-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg mt-2">
            <span className="font-black text-sm">الإجمالي النهائي</span>
            <span className="font-mono font-black text-lg">{formatCurrency(booking.total_amount)}</span>
          </div>

          {!isConsultation && (
            <div className="pt-4 grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-emerald-600 font-bold mb-1">المدفوع</span>
                    <span className="font-mono font-black text-emerald-700">{formatCurrency(paidAmount)}</span>
                </div>
                {remainingAmount > 0 ? (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl text-center">
                        <span className="block text-[10px] text-red-500 font-bold mb-1">المتبقي</span>
                        <span className="font-mono font-black text-red-600">{formatCurrency(remainingAmount)}</span>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl text-center">
                        <span className="block text-[10px] text-gray-400 font-bold mb-1">المتبقي</span>
                        <span className="font-mono font-black text-gray-400">0.00</span>
                    </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons (Visible only on screen) */}
      <div className="p-4 bg-gray-50 border-t border-gray-100 no-print space-y-3">
        <div className="grid grid-cols-2 gap-3">
            <Button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPdf} 
                className="h-12 rounded-xl font-black gap-2 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                تحميل PDF
            </Button>
            <Button 
                onClick={() => window.print()} 
                variant="outline" 
                className="h-12 rounded-xl font-bold gap-2 border-2 border-gray-200 hover:border-gray-300 bg-white"
            >
                <Printer className="w-4 h-4" /> طباعة
            </Button>
        </div>
        <Button 
            onClick={handleShare} 
            variant="secondary" 
            className="w-full h-12 rounded-xl font-bold gap-2 bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/20"
        >
            <Share2 className="w-4 h-4" /> إرسال عبر واتساب / مشاركة
        </Button>
      </div>

      <style>{`
        @media print { 
            body * { visibility: hidden; } 
            #printable-invoice, #printable-invoice * { visibility: visible; } 
            #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white; } 
            .no-print { display: none !important; } 
            /* Fix chart/background colors in print */
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </Modal>
  );
};
