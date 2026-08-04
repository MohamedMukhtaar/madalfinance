-- Normalize legacy USD currency code to the $ display symbol.
UPDATE settings SET currency = '$' WHERE currency IN ('USD', 'US$', 'usd');
