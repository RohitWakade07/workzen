-- Clean up old payrun records
-- This will delete all existing payruns and start fresh
-- Run this in your PostgreSQL database

-- Option 1: Delete ALL payruns (fresh start)
DELETE FROM payruns;

-- Option 2: Delete only payruns with old data (those with employee counts and amounts)
-- DELETE FROM payruns WHERE total_employees > 0 OR total_amount != 0;

-- Option 3: Reset employee counts and amounts to 0 for existing payruns
-- UPDATE payruns SET total_employees = 0, total_amount = 0;

-- Verify the cleanup
SELECT * FROM payruns ORDER BY created_at DESC;
