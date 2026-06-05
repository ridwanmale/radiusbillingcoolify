import mysql.connector
import os

try:
    connection = mysql.connector.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        user=os.environ.get('DB_USER', 'radius'),
        password=os.environ.get('DB_PASSWORD', 'radius'),
        database=os.environ.get('DB_NAME', 'radius')
    )
    cursor = connection.cursor()

    try:
        cursor.execute("ALTER TABLE portal_settings ADD COLUMN history_auto_delete_enabled BOOLEAN DEFAULT FALSE")
        print("Added history_auto_delete_enabled column")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("history_auto_delete_enabled already exists")
        else:
            print("Error:", e)

    try:
        cursor.execute("ALTER TABLE portal_settings ADD COLUMN history_auto_delete_days INT DEFAULT 30")
        print("Added history_auto_delete_days column")
    except Exception as e:
        if "Duplicate column name" in str(e):
            print("history_auto_delete_days already exists")
        else:
            print("Error:", e)

    connection.commit()
    cursor.close()
    connection.close()
    print("Database updated successfully!")
except Exception as e:
    print(f"Failed to connect or update DB: {e}")
