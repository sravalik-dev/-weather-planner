import mysql.connector
import bcrypt

conn = mysql.connector.connect(
    host='localhost',
    port=3306,
    user='root',
    password='Keerthu9095',
    database='itinerary_planner'
)

cur = conn.cursor()

# Normalize known demo rows for the backend's verification gate.
verified_users = [
    ('gamingpro7223@gmail.com', 'Qwerty@123'),
    ('testuser@example.com', 'abc123'),
]

for email, password in verified_users:
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
    cur.execute(
        """
        UPDATE users
        SET email_verified = 1,
            otp_code = NULL,
            otp_expiry = NULL,
            password = %s
        WHERE email = %s
        """,
        (hashed, email)
    )

conn.commit()
cur.execute("SELECT email, email_verified, otp_code, otp_expiry FROM users WHERE email IN (%s, %s)", ('gamingpro7223@gmail.com', 'testuser@example.com'))
print(cur.fetchall())

conn.close()
