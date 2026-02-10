
import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface HyperPayFormProps {
  checkoutId: string;
  baseUrl: string;
  redirectUrl: string; // The URL to return to after payment
}

export const HyperPayForm: React.FC<HyperPayFormProps> = ({ checkoutId, baseUrl, redirectUrl }) => {
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!checkoutId) return;

    // Clean up previous scripts if any
    const existingScript = document.getElementById('hyperpay-script');
    if (existingScript) existingScript.remove();

    const script = document.createElement('script');
    script.id = 'hyperpay-script';
    // Ensure URL ends with /v1/paymentWidgets.js
    script.src = `${baseUrl}/v1/paymentWidgets.js?checkoutId=${checkoutId}`;
    script.async = true;
    
    document.body.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
    };
  }, [checkoutId, baseUrl]);

  return (
    <div className="w-full bg-white rounded-xl p-4 min-h-[300px] flex flex-col items-center justify-center">
      {/* The form class must be 'paymentWidgets' as per HyperPay docs */}
      <form 
        action={redirectUrl} 
        className="paymentWidgets" 
        data-brands="VISA MASTER MADA APPLEPAY"
      >
        {/* Fallback content while widget loads */}
        <div className="flex flex-col items-center gap-4 text-gray-400 py-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-sm font-bold">جاري تحميل بوابة الدفع الآمن...</span>
        </div>
      </form>
    </div>
  );
};
