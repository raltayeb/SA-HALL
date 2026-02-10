
import { supabase } from '../supabaseClient';

export interface PaymentConfig {
  entityId: string;
  accessToken: string;
  baseUrl: string;
  currency: string;
}

const getPaymentConfig = async (): Promise<PaymentConfig | null> => {
  const { data } = await supabase.from('system_settings').select('value').eq('key', 'platform_config').maybeSingle();
  if (!data?.value?.payment_gateways?.hyperpay_enabled) return null;

  const gw = data.value.payment_gateways;
  const isTest = gw.hyperpay_mode === 'test';
  
  // Base URL defaults if not set
  const baseUrl = gw.hyperpay_base_url || (isTest ? 'https://eu-test.oppwa.com' : 'https://oppwa.com');

  return {
    entityId: gw.hyperpay_entity_id,
    accessToken: gw.hyperpay_access_token,
    baseUrl: baseUrl,
    currency: 'SAR'
  };
};

export const prepareCheckout = async (amount: number): Promise<{ checkoutId: string, url: string } | null> => {
  try {
    const config = await getPaymentConfig();
    if (!config) throw new Error('Payment gateway not configured');

    const path = '/v1/checkouts';
    const params = new URLSearchParams();
    params.append('entityId', config.entityId);
    params.append('amount', amount.toFixed(2));
    params.append('currency', config.currency);
    params.append('paymentType', 'DB'); // Debit/Credit
    // Note: 'integrity' parameter logic requires handling secrets, often handled by server. 
    // For SAQ-A copyandpay simple integration, we proceed with basic setup.

    const response = await fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${config.accessToken}`
      },
      body: params
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

export const verifyPaymentStatus = async (resourcePath: string): Promise<boolean> => {
  try {
    const config = await getPaymentConfig();
    if (!config) return false;

    // resourcePath usually comes as "/v1/checkouts/{id}/payment"
    const url = `${config.baseUrl}${resourcePath}`;
    const urlWithEntity = `${url}?entityId=${config.entityId}`;

    const response = await fetch(urlWithEntity, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    const data = await response.json();
    // Codes starting with 000.000. or 000.100. are successful
    const code = data.result.code;
    return /^(000\.000\.|000\.100\.1|000\.[36])/.test(code);
  } catch (error) {
    console.error('Payment Verification Failed:', error);
    return false;
  }
};
