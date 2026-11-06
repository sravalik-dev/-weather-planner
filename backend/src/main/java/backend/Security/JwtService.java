
package backend.Security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

    private final SecretKey key;

    private final long expirationTime;

    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationTime) {

        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must contain at least 32 bytes for HS256"
            );
        }

        this.key = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );

        this.expirationTime = expirationTime;
    }

    // Generate JWT using the user's ID and email
    public String generateToken(Integer userId, String email) {

        if (userId == null || userId <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }

        Date now = new Date();

        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(now)
                .expiration(
                        new Date(now.getTime() + expirationTime)
                )
                .signWith(key)
                .compact();
    }

    // Extract user ID from JWT
    public Integer extractUserId(String token) {

        Claims claims = extractAllClaims(token);

        return Integer.valueOf(claims.getSubject());
    }

    // Extract email from JWT
    public String extractEmail(String token) {

        Claims claims = extractAllClaims(token);

        return claims.get("email", String.class);
    }

    // Validate JWT
    public boolean isTokenValid(String token) {

        try {
            Claims claims = extractAllClaims(token);

            return claims.getSubject() != null
                    && !claims.getSubject().isBlank()
                    && Integer.parseInt(claims.getSubject()) > 0;

        } catch (Exception e) {
            return false;
        }
    }

    // Parse and verify JWT claims
    private Claims extractAllClaims(String token) {

        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
