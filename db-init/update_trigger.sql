DROP TRIGGER IF EXISTS after_radacct_insert;
DELIMITER //
CREATE TRIGGER after_radacct_insert 
AFTER INSERT ON radacct 
FOR EACH ROW 
BEGIN 
    DECLARE v_timeout INT;
    DECLARE v_group VARCHAR(64);
    
    -- Detect START record
    IF NEW.acctstarttime IS NOT NULL AND NEW.acctstoptime IS NULL AND (NEW.acctsessiontime IS NULL OR NEW.acctsessiontime = 0) THEN
        
            -- 1. UPDATE METADATA (Only on first login)
            IF NOT EXISTS (SELECT 1 FROM rincian_transaksi_voucher WHERE username = NEW.username AND expiration_date IS NOT NULL) THEN
                
                -- Find profile
                SELECT groupname INTO v_group FROM radusergroup WHERE username = NEW.username AND groupname != 'MAC_LOCK_ENABLED' ORDER BY priority ASC LIMIT 1;
                
                -- Get timeout duration
                SELECT (pm.masa_aktif * 
                    CASE 
                        WHEN pm.satuan = 'Hari' THEN 86400 
                        WHEN pm.satuan = 'Jam' THEN 3600 
                        WHEN pm.satuan = 'Menit' THEN 60 
                        ELSE 1 
                    END) INTO v_timeout
                FROM profiles_metadata pm
                WHERE pm.groupname = v_group
                LIMIT 1;

                IF v_timeout IS NOT NULL THEN
                    -- Update Metadata
                    UPDATE rincian_transaksi_voucher 
                    SET status = 'Terjual', 
                        sold_at = NOW(),
                        expiration_date = DATE_ADD(NEW.acctstarttime, INTERVAL v_timeout SECOND)
                    WHERE username = NEW.username AND (status = 'Aktif' OR status IS NULL);
                END IF;
            END IF;

        -- 2. HANDLE MAC LOCKING
        IF EXISTS (SELECT 1 FROM radreply WHERE username = NEW.username AND value = 'MAC_LOCK_ENABLED') THEN
            IF NOT EXISTS (SELECT 1 FROM radcheck WHERE username = NEW.username AND attribute = 'Calling-Station-Id') THEN
                INSERT INTO radcheck (username, attribute, op, value)
                VALUES (NEW.username, 'Calling-Station-Id', '==', NEW.callingstationid);
            END IF;
        END IF;
    END IF;
END //
DELIMITER ;
