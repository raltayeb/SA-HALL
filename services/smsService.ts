/**
 * Supabase OTP Service
 * Send and verify OTP using Supabase Auth
 */

import { supabase } from '../supabaseClient';

export interface SendOTPResponse {
  success: boolean;
  error?: string;
}

/**
 * Send OTP via SMS using Supabase Auth
 * @param phone - Phone number in international format (e.g., 966500000000)
 * @returns Promise<SendOTPResponse>
 */
export const sendSMSOTP = async (phone: string): Promise<SendOTPResponse> => {
  try {
    // Format phone number (remove leading 0, add country code)
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '966' + phone.substring(1);
    } else if (!phone.startsWith('966')) {
      formattedPhone = '966' + phone;
    }

    console.log('📱 Sending Supabase OTP to:', formattedPhone);

    // Use Supabase's built-in phone OTP
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
      options: {
        channel: 'sms'
      }
    });

    if (error) {
      console.error('❌ Supabase OTP Error:', error);
      return {
        success: false,
        error: error.message || 'فشل إرسال الرسالة'
      };
    }

    console.log('✅ OTP sent successfully');
    return {
      success: true
    };
  } catch (error: any) {
    console.error('❌ SMS API Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);

    return {
      success: false,
      error: error.message || 'خطأ في الاتصال بخدمة الرسائل'
    };
  }
};

/**
 * Verify OTP using Supabase Auth
 * @param phone - Phone number
 * @param otp - OTP code to verify
 * @returns Promise<{ success: boolean; error?: string }>
 */
export const verifySMSOTP = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      formattedPhone = '966' + phone.substring(1);
    } else if (!phone.startsWith('966')) {
      formattedPhone = '966' + phone;
    }

    console.log('🔍 Verifying OTP for:', formattedPhone);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms'
    });

    if (error) {
      console.error('❌ OTP Verification Error:', error);
      return {
        success: false,
        error: error.message || 'رمز غير صحيح'
      };
    }

    console.log('✅ OTP verified successfully', data);
    return {
      success: true
    };
  } catch (error: any) {
    console.error('❌ OTP Verification Error:', error);
    return {
      success: false,
      error: error.message || 'خطأ في التحقق'
    };
  }
};

/**
 * Generate random OTP code (for fallback/testing)
 * @param length - Length of OTP (default: 6)
 * @returns string - OTP code
 */
export const generateOTP = (length: number = 6): string => {
  const chars = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += chars[Math.floor(Math.random() * chars.length)];
  }
  return otp;
};

/**
 * Store OTP in localStorage with expiry (for fallback)
 * @param phone - Phone number
 * @param otp - OTP code
 * @param expiryMinutes - Expiry time in minutes (default: 5)
 */
export const storeOTP = (phone: string, otp: string, expiryMinutes: number = 5): void => {
  const expiry = Date.now() + (expiryMinutes * 60 * 1000);
  localStorage.setItem(`otp_${phone}`, JSON.stringify({ otp, expiry }));
};

/**
 * Verify stored OTP (for fallback)
 * @param phone - Phone number
 * @param otp - OTP to verify
 * @returns boolean - true if valid and not expired
 */
export const verifyStoredOTP = (phone: string, otp: string): boolean => {
  const stored = localStorage.getItem(`otp_${phone}`);
  if (!stored) return false;

  try {
    const { otp: storedOtp, expiry } = JSON.parse(stored);

    // Check if expired
    if (Date.now() > expiry) {
      localStorage.removeItem(`otp_${phone}`);
      return false;
    }

    return storedOtp === otp;
  } catch {
    return false;
  }
};

/**
 * Clear stored OTP
 * @param phone - Phone number
 */
export const clearOTP = (phone: string): void => {
  localStorage.removeItem(`otp_${phone}`);
};
