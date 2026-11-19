-- =====================================================================
-- Weather Planner: 24-hour itinerary migration
-- Database : itinerary_planner   (MySQL 8.x)
-- Table    : itinerary_activities
--
-- Safe to run more than once. Each column is added only if missing, so it
-- also works if spring.jpa.hibernate.ddl-auto=update already created them.
--
-- WHAT CHANGES
--   end_date       the date an activity ENDS on. LocalTime alone cannot say
--                  "ends at 00:20 the next day"; activity_date + start_time is
--                  the start, end_date + end_time is the end. NULL = same day,
--                  so every existing row stays valid without changes.
--   activity_type  TRAVEL | RETURN | VISIT | MEAL | REST | FREE_TIME |
--                  ACCOMMODATION | CUSTOM
--   distance_km    road distance of a travel activity
--   route_source   OSRM, or ESTIMATE when routing was unavailable
--   is_estimated   travel time / visit duration is an estimate
--   is_generated   1 = created by the generator, 0 = created/edited by the
--                  user. Regeneration replaces only unlocked GENERATED rows.
-- =====================================================================

USE itinerary_planner;

DELIMITER //

DROP PROCEDURE IF EXISTS add_column_if_missing//
CREATE PROCEDURE add_column_if_missing(IN p_column VARCHAR(64), IN p_definition VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'itinerary_activities'
          AND COLUMN_NAME  = p_column
    ) THEN
        SET @ddl = CONCAT('ALTER TABLE itinerary_activities ADD COLUMN `', p_column, '` ', p_definition);
        PREPARE stmt FROM @ddl;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END//

DELIMITER ;

CALL add_column_if_missing('end_date',      'DATE NULL AFTER `end_time`');
CALL add_column_if_missing('activity_type', 'VARCHAR(30) NULL');
CALL add_column_if_missing('distance_km',   'DOUBLE NULL');
CALL add_column_if_missing('route_source',  'VARCHAR(20) NULL');
CALL add_column_if_missing('is_estimated',  'TINYINT(1) NULL');
CALL add_column_if_missing('is_generated',  'TINYINT(1) NULL');

DROP PROCEDURE add_column_if_missing;

-- ---------------------------------------------------------------------
-- Back-fill existing rows.
-- (The application also copes with NULLs, so this is for tidiness and for
--  correct "generated vs manual" behaviour on trips created earlier.)
-- ---------------------------------------------------------------------

-- Old rows all finished on their own day.
UPDATE itinerary_activities
   SET end_date = activity_date
 WHERE end_date IS NULL
   AND end_time IS NOT NULL;

-- What the old generator produced: travel/meal/break rows and rows linked to a
-- destination. Manual "Custom" activities (for example "beach") stay manual.
UPDATE itinerary_activities
   SET is_generated = CASE
           WHEN UPPER(COALESCE(category, '')) IN ('TRAVEL', 'MEAL', 'BREAK') THEN 1
           WHEN destination_id IS NOT NULL THEN 1
           ELSE 0
       END
 WHERE is_generated IS NULL;

UPDATE itinerary_activities
   SET activity_type = CASE
           WHEN UPPER(COALESCE(category, '')) = 'TRAVEL' THEN 'TRAVEL'
           WHEN UPPER(COALESCE(category, '')) = 'MEAL'   THEN 'MEAL'
           WHEN UPPER(COALESCE(category, '')) = 'BREAK'  THEN 'REST'
           WHEN destination_id IS NOT NULL               THEN 'VISIT'
           ELSE 'CUSTOM'
       END
 WHERE activity_type IS NULL;

UPDATE itinerary_activities SET is_estimated = 0 WHERE is_estimated IS NULL;

-- ---------------------------------------------------------------------
-- Helpful index for "all activities of a trip in time order".
-- ---------------------------------------------------------------------
SET @idx := (SELECT COUNT(*) FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'itinerary_activities'
                AND INDEX_NAME = 'idx_itin_trip_date_start');
SET @ddl := IF(@idx = 0,
    'CREATE INDEX idx_itin_trip_date_start ON itinerary_activities (trip_id, activity_date, start_time)',
    'SELECT ''index already exists''');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
-- Check
-- ---------------------------------------------------------------------
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'itinerary_activities'
   AND COLUMN_NAME IN ('end_date','activity_type','distance_km','route_source','is_estimated','is_generated');

-- ---------------------------------------------------------------------
-- Optional: clear Trip 56 and start fresh (keeps nothing - uncomment to use)
-- DELETE FROM itinerary_activities WHERE trip_id = 56;
-- ---------------------------------------------------------------------
