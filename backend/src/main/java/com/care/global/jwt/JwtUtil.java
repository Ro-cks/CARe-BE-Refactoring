package com.care.global.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    private Key key;

    @PostConstruct
    public void init() {
        byte[] keyBytes = Base64.getDecoder().decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    // 사용자 ID와 역할을 받아 Access Token을 생성 (15분)
    public String generateAccessToken(String userId, String role) {
        return buildToken(userId, role, accessTokenExpiration);
    }

    // 사용자 ID와 역할을 받아 Refresh Token을 생성 (7일)
    public String generateRefreshToken(String userId, String role) {
        return buildToken(userId, role, refreshTokenExpiration);
    }

    // 실제 JWT 토큰 조립
    private String buildToken(String userId, String role, long expiration) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(userId)
                .claim("role", role)
                .setId(UUID.randomUUID().toString())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expiration))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // 토큰을 열어 안에 들어 있는 정보(Claim) 확인
    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // 토큰 유효성 검사
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }


    public String getUserId(String token) {
        return parseClaims(token).getSubject();
    }

    // 토큰 고유 식별자 추출 (블랙리스트에서 사용)
    public String getJti(String token) {
        return parseClaims(token).getId();
    }

    public long getExpiration(String token) {
        return parseClaims(token).getExpiration().getTime();
    }
}
