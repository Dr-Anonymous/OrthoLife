-- Rename is_legacy_handler to handles_general_notifications
ALTER TABLE consultants RENAME COLUMN is_legacy_handler TO handles_general_notifications;

-- Add general_notifications_phone to hospitals
-- Wait, the settings is a JSONB column in hospitals. So we don't need a schema migration for it, but just in case, we can update existing settings.
