-- SQL Script to configure HyperPay settings in system_settings table
-- Run this in your Supabase SQL Editor
-- تاريخ: 26 فبراير 2026

-- 1. First, check if payment_gateways settings exist
SELECT key, value 
FROM system_settings 
WHERE key = 'payment_gateways';

-- 2. Insert/Update HyperPay configuration
-- Replace the values below with your ACTUAL HyperPay credentials
INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES (
  'payment_gateways',
  '{
    "visa_enabled": true,
    "cash_enabled": true,
    "hyperpay_enabled": true,
    "hyperpay_entity_id": "YOUR_ENTITY_ID_HERE",
    "hyperpay_access_token": "YOUR_ACCESS_TOKEN_HERE",
    "hyperpay_base_url": "https://eu-test.oppwa.com",
    "hyperpay_mode": "test"
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (key) 
DO UPDATE SET 
  value = '{
    "visa_enabled": true,
    "cash_enabled": true,
    "hyperpay_enabled": true,
    "hyperpay_entity_id": "YOUR_ENTITY_ID_HERE",
    "hyperpay_access_token": "YOUR_ACCESS_TOKEN_HERE",
    "hyperpay_base_url": "https://eu-test.oppwa.com",
    "hyperpay_mode": "test"
  }'::jsonb,
  updated_at = NOW();

-- 3. Verify the settings
SELECT key, value->>'hyperpay_enabled' as enabled, 
       value->>'hyperpay_entity_id' as entity_id,
       value->>'hyperpay_mode' as mode
FROM system_settings 
WHERE key = 'payment_gateways';

-- IMPORTANT NOTES:
-- 1. Replace YOUR_ENTITY_ID_HERE with your actual HyperPay Entity ID
-- 2. Replace YOUR_ACCESS_TOKEN_HERE with your actual HyperPay Access Token
-- 3. You can get these credentials from your HyperPay dashboard
-- 4. For production, change hyperpay_mode to "live" and base_url to "https://oppwa.com"
