/**
 * Infinito SMS API Service
 * Send OTP via SMS using Infinito API
 */

const SMS_CONFIG = {
  baseURL: 'https://api.goinfinito.me',
  clientId: 'SAhallrbd7ghczyv2lk9uzjh',
  password: '3xq4jb1c6iounhmoedrxk34fm4me5til',
  token: 'eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJJbmZpbml0byIsImlhdCI6MTc3MTcwMzQ5NSwic3ViIjoiU0FoYWxscmJkN2doY3p5djJsazl1empoIn0.7JanoZXS1LatQfs98zqRoN7n6RgmAJDdalZ_wwWZjzU',
  from: 'SAhall' // Sender ID
};

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send OTP via SMS
 * @param phone - Phone number in international format (e.g., 966500000000)
 * @param otp - OTP code to send
 * @returns Promise<SendSMSResponse>
 */
export const sendSMSOTP = async (phone: string, otp: string): Promise<SendSMSResponse> => {
  try {
    // Format phone number (remove leading 0, add country code)
    const formattedPhone = phone.startsWith('966') ? phone : `966${phone.substring(1)}`;

    const message = `رمز التحقق الخاص بك هو: ${otp}\nصالح لمدة 5 دقائق`;

    const requestBody = {
      apiver: "1.0",
      sms: {
        ver: "2.0",
        dlr: {
          url: ""
        },
        messages: [
          {
            udh: "0",
            coding: 1,
            text: message,
            property: 0,
            id: Date.now().toString(),
            addresses: [
              {
                from: SMS_CONFIG.from,
                to: formattedPhone,
                seq: "1",
                tag: "OTP"
              }
            ]
          }
        ]
      }
    };

    const response = await fetch(`${SMS_CONFIG.baseURL}/unified/v2/send`, {
      method: 'POST',
      headers: {
        'Authorization': SMS_CONFIG.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok && data.status === 'success') {
      return {
        success: true,
        messageId: data.message_id || data.id
      };
    } else {
      return {
        success: false,
        error: data.message || 'فشل إرسال الرسالة'
      };
    }
  } catch (error: any) {
    console.error('SMS API Error:', error);
    return {
      success: false,
      error: error.message || 'خطأ في الاتصال بخدمة الرسائل'
    };
  }
};

/**
 * Generate random OTP code
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
 * Store OTP in localStorage with expiry
 * @param phone - Phone number
 * @param otp - OTP code
 * @param expiryMinutes - Expiry time in minutes (default: 5)
 */
export const storeOTP = (phone: string, otp: string, expiryMinutes: number = 5): void => {
  const expiry = Date.now() + (expiryMinutes * 60 * 1000);
  localStorage.setItem(`otp_${phone}`, JSON.stringify({ otp, expiry }));
};

/**
 * Verify stored OTP
 * @param phone - Phone number
 * @param otp - OTP to verify
 * @returns boolean - true if valid and not expired
 */
export const verifyOTP = (phone: string, otp: string): boolean => {
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
