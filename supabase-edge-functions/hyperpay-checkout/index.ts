// Supabase Edge Function to handle HyperPay checkout
// Path: supabase/functions/hyperpay-checkout/index.ts
// Run: npx supabase functions new hyperpay-checkout

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CheckoutRequest {
  amount: number
  merchantTransactionId?: string
  customerEmail?: string
  billingCity?: string
  billingCountry?: string
  givenName?: string
  surname?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    // Parse request body
    const checkoutData: CheckoutRequest = await req.json()
    console.log('Checkout request:', checkoutData)

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get HyperPay configuration from system_settings
    const { data: settingsData } = await supabaseClient
      .from('system_settings')
      .select('value')
      .eq('key', 'payment_gateways')
      .maybeSingle()

    if (!settingsData?.value) {
      throw new Error('Payment gateway not configured')
    }

    const paymentGateways = settingsData.value
    if (!paymentGateways.hyperpay_enabled) {
      throw new Error('HyperPay is not enabled')
    }

    const isTest = paymentGateways.hyperpay_mode === 'test'
    const baseUrl = paymentGateways.hyperpay_base_url || 
                    (isTest ? 'https://eu-test.oppwa.com' : 'https://oppwa.com')
    const entityId = paymentGateways.hyperpay_entity_id
    const accessToken = paymentGateways.hyperpay_access_token

    if (!entityId || !accessToken) {
      throw new Error('HyperPay credentials not configured')
    }

    // Prepare HyperPay checkout request
    const path = '/v1/checkouts'
    const bodyParams = new URLSearchParams()

    // Mandatory parameters
    bodyParams.append('entityId', entityId)
    bodyParams.append('amount', checkoutData.amount.toFixed(2))
    bodyParams.append('currency', 'SAR')
    bodyParams.append('paymentType', 'DB') // Debit (Immediate Charge)

    // Optional parameters
    if (checkoutData.merchantTransactionId) {
      bodyParams.append('merchantTransactionId', checkoutData.merchantTransactionId)
    }
    if (checkoutData.customerEmail) {
      bodyParams.append('customer.email', checkoutData.customerEmail)
    }
    if (checkoutData.givenName) {
      bodyParams.append('customer.givenName', checkoutData.givenName)
    }
    if (checkoutData.surname) {
      bodyParams.append('customer.surname', checkoutData.surname)
    }
    if (checkoutData.billingCity) {
      bodyParams.append('billing.city', checkoutData.billingCity)
    }
    if (checkoutData.billingCountry) {
      bodyParams.append('billing.country', checkoutData.billingCountry || 'SA')
    }

    // Make request to HyperPay API
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${accessToken}`
      },
      body: bodyParams
    })

    const result = await response.json()
    console.log('HyperPay response:', result)

    if (result.result.code === '000.200.100') {
      // Success - return checkout ID
      return new Response(
        JSON.stringify({
          success: true,
          checkoutId: result.id,
          url: baseUrl
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Error from HyperPay
      console.error('HyperPay Error:', result.result.description)
      return new Response(
        JSON.stringify({
          success: false,
          error: result.result.description,
          code: result.result.code
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

  } catch (error) {
    console.error('Error in hyperpay-checkout function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process payment'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
