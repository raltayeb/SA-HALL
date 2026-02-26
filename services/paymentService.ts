
import { supabase } from '../supabaseClient';

export interface PaymentConfig {
  entityId: string;
  accessToken: string;
  baseUrl: string;
  currency: string;
}

export interface CheckoutParams {
  amount: number;
  merchantTransactionId?: string;
  customerEmail?: string;
  billingStreet1?: string;
  billingCity?: string;
  billingPostcode?: string;
  billingCountry?: string;
  givenName?: string;
  surname?: string;
}

/**
 * Prepare HyperPay checkout using Supabase Edge Function
 * This avoids CORS issues by making the request from the server side
 */
export const prepareCheckout = async (params: CheckoutParams): Promise<{ checkoutId: string, url: string } | null> => {
  try {
    // Get Supabase URL from environment variable or construct from client
    // @ts-ignore - Accessing protected property for Edge Function URL
    const supabaseUrl = supabase.supabaseUrl || 
                        import.meta.env.VITE_SUPABASE_URL || 
                        window.location.origin.replace('5173', '54321'); // For local dev
    
    if (!supabaseUrl || typeof supabaseUrl !== 'string' || !supabaseUrl.includes('supabase')) {
      // Fallback: try to get from localStorage or use default pattern
      const fallbackUrl = localStorage.getItem('supabaseUrl') || 'https://placeholder.supabase.co';
      throw new Error(`Invalid Supabase URL. Please configure Edge Function. URL attempted: ${fallbackUrl}`);
    }

    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/hyperpay-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Edge Function Error:', errorData);
      throw new Error(errorData.error || 'Failed to prepare checkout');
    }

    const data = await response.json();
    
    if (data.success) {
      return { checkoutId: data.checkoutId, url: data.url };
    } else {
      throw new Error(data.error || 'Failed to prepare checkout');
    }

  } catch (error: any) {
    console.error('Payment Preparation Failed:', error.message || error);
    
    // Fallback to direct method if Edge Function fails (for development)
    console.warn('Falling back to direct method...');
    return prepareCheckoutDirect(params);
  }
};

/**
 * Legacy method - kept for backward compatibility
 * Direct API call (may have CORS issues in browser)
 */
const prepareCheckoutDirect = async (params: CheckoutParams): Promise<{ checkoutId: string, url: string } | null> => {
  try {
    const config = await getPaymentConfig();
    if (!config) throw new Error('Payment gateway not configured');

    const path = '/v1/checkouts';
    const bodyParams = new URLSearchParams();

    // Mandatory Parameters
    bodyParams.append('entityId', config.entityId);
    bodyParams.append('amount', params.amount.toFixed(2));
    bodyParams.append('currency', config.currency);
    bodyParams.append('paymentType', 'DB'); // Debit (Immediate Charge)

    // Optional / Fraud Protection Parameters (As per HyperPay Docs)
    if (params.merchantTransactionId) bodyParams.append('merchantTransactionId', params.merchantTransactionId);
    if (params.customerEmail) bodyParams.append('customer.email', params.customerEmail);
    if (params.givenName) bodyParams.append('customer.givenName', params.givenName);
    if (params.surname) bodyParams.append('customer.surname', params.surname);
    if (params.billingStreet1) bodyParams.append('billing.street1', params.billingStreet1);
    if (params.billingCity) bodyParams.append('billing.city', params.billingCity);
    if (params.billingPostcode) bodyParams.append('billing.postcode', params.billingPostcode);
    if (params.billingCountry) bodyParams.append('billing.country', params.billingCountry || 'SA');

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${config.accessToken}`
      },
      body: bodyParams
    });

    const data = await response.json();
    if (data.result.code === '000.200.100') {
      return { checkoutId: data.id, url: config.baseUrl };
    } else {
      console.error('HyperPay Error:', data.result.description);
      throw new Error(data.result.description);
    }
  } catch (error) {
    console.error('Payment Preparation Failed:', error);
    return null;
  }
};

const getPaymentConfig = async (): Promise<PaymentConfig | null> => {
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
  if (!data?.value?.payment_gateways?.hyperpay_enabled) return null;

  const gw = data.value.payment_gateways;
  const isTest = gw.hyperpay_mode === 'test';

  const baseUrl = gw.hyperpay_base_url || (isTest ? 'https://eu-test.oppwa.com' : 'https://oppwa.com');

  return {
    entityId: gw.hyperpay_entity_id,
    accessToken: gw.hyperpay_access_token,
    baseUrl: baseUrl,
    currency: 'SAR'
  };
};

export const verifyPaymentStatus = async (resourcePath: string): Promise<{ success: boolean, id?: string }> => {
  try {
    const config = await getPaymentConfig();
    if (!config) return { success: false };

    const url = `${config.baseUrl}${resourcePath}`;
    const urlWithEntity = `${url}?entityId=${config.entityId}`;

    const response = await fetch(urlWithEntity, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    const data = await response.json();
    // Codes starting with 000.000. or 000.100. are successful transactions
    // Regex covers success codes based on Oppwa docs
    const code = data.result.code;
    const isSuccess = /^(000\.000\.|000\.100\.1|000\.[36])/.test(code);
    
    return { success: isSuccess, id: data.id };
  } catch (error) {
    console.error('Payment Verification Failed:', error);
    return { success: false };
  }
};
