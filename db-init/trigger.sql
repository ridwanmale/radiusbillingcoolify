-- Unified Trigger for Expiration and MAC Locking
DROP TRIGGER IF EXISTS after_radacct_insert;
DROP TRIGGER IF EXISTS set_expiration_on_first_login;
DROP TRIGGER IF EXISTS update_voucher_status_on_login;

DELIMITER //

CREATE TRIGGER after_radacct_insert 
AFTER INSERT ON radacct 
FOR EACH ROW 
BEGIN 
    DECLARE v_timeout INT;
    DECLARE v_group VARCHAR(64);
    
    -- Detect START record (acctstoptime is null and sessiontime is 0 or null)
    IF NEW.acctstarttime IS NOT NULL AND NEW.acctstoptime IS NULL AND (NEW.acctsessiontime IS NULL OR NEW.acctsessiontime = 0) THEN
        
        -- 1. HANDLE EXPIRATION (Only on first login)
        IF NOT EXISTS (SELECT 1 FROM radreply WHERE username = NEW.username AND attribute = 'Expiration') THEN
            -- Find the primary profile group
            SELECT groupname INTO v_group FROM radusergroup WHERE username = NEW.username AND groupname != 'MAC_LOCK_ENABLED' ORDER BY priority ASC LIMIT 1;
            
            -- Get timeout from profile metadata
            SELECT (pm.masa_aktif * 
                CASE 
                    WHEN pm.satuan = 'Hari' THEN 86400 
                    WHEN pm.satuan = 'Jam' THEN 3600 
                    WHEN pm.satuan = 'Menit' THEN 60 
                    ELSE 3600 -- Default to Jam if unknown
                END) INTO v_timeout
            FROM profiles_metadata pm
            WHERE pm.groupname = v_group
            LIMIT 1;

            IF v_timeout IS NOT NULL THEN
                -- Update status and expiration in metadata
                UPDATE rincian_transaksi_voucher 
                SET status = 'Terjual', 
                    sold_at = NOW(),
                    expiration_date = DATE_ADD(NEW.acctstarttime, INTERVAL v_timeout SECOND)
                WHERE username = NEW.username AND (status = 'Aktif' OR status IS NULL);
            END IF;
        END IF;

        -- 2. HANDLE MAC LOCKING
        -- If Mac-Lock flag exists in radreply, and Calling-Station-Id is NOT YET set in radcheck, lock it now
        IF EXISTS (SELECT 1 FROM radreply WHERE username = NEW.username AND value = 'MAC_LOCK_ENABLED') THEN
            IF NOT EXISTS (SELECT 1 FROM radcheck WHERE username = NEW.username AND attribute = 'Calling-Station-Id') THEN
                INSERT INTO radcheck (username, attribute, op, value)
                VALUES (NEW.username, 'Calling-Station-Id', '==', NEW.callingstationid);
            END IF;
        END IF;

    END IF;
END
 //

DELIMITER ;
