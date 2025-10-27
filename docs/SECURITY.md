# LumaDesk Security Guide

This document outlines security best practices and considerations for deploying LumaDesk in production.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Initial Setup](#initial-setup)
3. [Authentication & Authorization](#authentication--authorization)
4. [Network Security](#network-security)
5. [TLS/HTTPS Configuration](#tlshttps-configuration)
6. [Database Security](#database-security)
7. [Container Security](#container-security)
8. [Sunshine Security](#sunshine-security)
9. [PXE Security](#pxe-security)
10. [Monitoring & Auditing](#monitoring--auditing)
11. [Backup & Recovery](#backup--recovery)
12. [Secrets Management](#secrets-management)
13. [Security Checklist](#security-checklist)

## Security Overview

LumaDesk handles sensitive data including user credentials, session tokens, and streaming content. Proper security configuration is essential for production deployments.

### Threat Model

**Assets:**
- User credentials and personal data
- Session tokens and authentication keys
- Streaming video/audio content
- System configuration and secrets

**Threats:**
- Unauthorized access to admin UI
- Man-in-the-middle attacks on streaming
- Session hijacking
- Data breaches
- DDoS attacks
- Privilege escalation

## Initial Setup

### Change Default Credentials

**Immediately after installation:**

1. **Change admin password:**
   ```bash
   # Via Web UI: Settings → Change Password
   # Or via API:
   curl -X PATCH http://localhost:3000/api/users/admin \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"password":"new-secure-password"}'
   ```

2. **Generate secure secrets:**
   ```bash
   # Generate random secrets
   openssl rand -base64 32  # JWT_SECRET
   openssl rand -base64 32  # JWT_REFRESH_SECRET
   openssl rand -base64 32  # POSTGRES_PASSWORD
   ```

3. **Update `.env` file:**
   ```bash
   JWT_SECRET=<generated-secret>
   JWT_REFRESH_SECRET=<generated-secret>
   POSTGRES_PASSWORD=<generated-password>
   ADMIN_PASSWORD=<strong-password>
   ```

4. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### File Permissions

```bash
# Restrict .env file
chmod 600 .env
chown root:root .env

# Restrict backup directory
chmod 700 backups/
```

## Authentication & Authorization

### JWT Configuration

**Token Expiration:**
- Access tokens: Short-lived (15 minutes - 1 hour)
- Refresh tokens: Longer-lived (7 days)
- Session tokens: Very short (5 minutes)

```bash
# In .env
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_TOKEN_EXPIRES_IN=5m
```

### Password Policy

**Enforce strong passwords:**

Minimum requirements (configured in API):
- Length: 8+ characters
- Complexity: Mixed case, numbers, special characters
- No common passwords
- No password reuse

**Implementation in API (api/src/routes/users.ts:18):**
```typescript
password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
```

### Role-Based Access Control

**Roles:**
- `admin`: Full system access
- `user`: Limited to own sessions

**Implementation:**
- All admin routes require `requireAdmin` middleware
- Users can only view/manage their own sessions
- Audit logs track all privileged actions

### Session Management

**Security measures:**
- Sessions tied to device ID
- Automatic timeout after inactivity
- Manual session termination by admin
- Heartbeat-based session validation

## Network Security

### Firewall Configuration

**Server firewall (iptables/ufw):**

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing

# Web UI (restrict to VPN or trusted IPs in production)
ufw allow from 10.0.0.0/8 to any port 8080 proto tcp

# API (internal only)
ufw allow from 192.168.1.0/24 to any port 3000 proto tcp

# Sunshine (LAN only)
ufw allow from 192.168.1.0/24 to any port 47984 proto tcp
ufw allow from 192.168.1.0/24 to any port 47989 proto tcp
ufw allow from 192.168.1.0/24 to any port 48010 proto tcp

# PXE (LAN only)
ufw allow from 192.168.1.0/24 to any port 69 proto udp
ufw allow from 192.168.1.0/24 to any port 8069 proto tcp
ufw allow from 192.168.1.0/24 to any port 67 proto udp

# PostgreSQL (Docker network only - no external access)
# No firewall rule needed - bound to Docker network

ufw enable
```

### Network Segmentation

**Recommended network architecture:**

```
┌─────────────────────────────────────┐
│  Management Network (10.0.0.0/24)  │
│  - Admin workstations               │
│  - Access to Web UI (port 8080)    │
└─────────────────────────────────────┘
              │
┌─────────────────────────────────────┐
│   Server Network (192.168.1.0/24)  │
│   - LumaDesk server                 │
│   - Internal communication          │
└─────────────────────────────────────┘
              │
┌─────────────────────────────────────┐
│   Client Network (192.168.2.0/24)  │
│   - Thin clients                    │
│   - Streaming traffic only          │
└─────────────────────────────────────┘
```

### CORS Configuration

**Restrict allowed origins:**

```bash
# In .env
CORS_ORIGINS=https://lumadesk.yourdomain.com,https://admin.yourdomain.com
```

### Rate Limiting

**Prevent brute force attacks:**

```bash
# In .env (already configured)
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
```

## TLS/HTTPS Configuration

### Reverse Proxy with Caddy

**Recommended: Use Caddy for automatic HTTPS**

Create `Caddyfile`:

```caddy
lumadesk.yourdomain.com {
    reverse_proxy localhost:8080

    header {
        # Security headers
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(), microphone=(), camera=()"
    }

    # Enable compression
    encode gzip

    # Logging
    log {
        output file /var/log/caddy/lumadesk-access.log
    }
}

api.lumadesk.yourdomain.com {
    reverse_proxy localhost:3000

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
    }
}
```

Start Caddy:
```bash
docker run -d \
  --name caddy \
  --network lumadesk_lumadesk-frontend \
  -p 80:80 \
  -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  -v caddy_config:/config \
  caddy:latest
```

### Alternative: Nginx with Let's Encrypt

See `docs/nginx-ssl.md` for detailed Nginx configuration.

## Database Security

### PostgreSQL Hardening

**1. Strong password:**
```bash
# Use generated password in .env
POSTGRES_PASSWORD=$(openssl rand -base64 32)
```

**2. Network isolation:**
```yaml
# In docker-compose.yml - already configured
networks:
  lumadesk-backend:
    driver: bridge
    internal: true  # No external access
```

**3. Connection encryption:**
```bash
# Enable SSL in PostgreSQL
docker-compose exec postgres psql -U lumadesk -d lumadesk \
  -c "ALTER SYSTEM SET ssl = on;"
```

**4. Regular updates:**
```bash
docker-compose pull postgres
docker-compose up -d postgres
```

### Backup Encryption

**Encrypt backups:**

```bash
# Create encrypted backup
./scripts/backup
gpg --symmetric --cipher-algo AES256 \
  backups/lumadesk_backup_*.tar.gz

# Restore encrypted backup
gpg --decrypt backup.tar.gz.gpg | tar xzf -
```

## Container Security

### Run as Non-Root

**All services run as non-root users:**

- API: User `lumadesk` (UID 1001)
- Sunshine: User `sunshine` (UID 1000)
- Client: User `lumadesk` (UID 1000)

**Verify:**
```bash
docker-compose exec api whoami  # Should be 'lumadesk', not 'root'
```

### Minimal Privileges

**Use capabilities instead of privileged mode:**

```yaml
# In docker-compose.yml
sunshine:
  privileged: false  # Avoid privileged mode
  cap_add:
    - SYS_ADMIN  # Only for GPU access
  security_opt:
    - apparmor=unconfined
```

### Image Scanning

**Scan for vulnerabilities:**

```bash
# Install Trivy
wget https://github.com/aquasecurity/trivy/releases/download/v0.48.0/trivy_0.48.0_Linux-64bit.deb
sudo dpkg -i trivy_0.48.0_Linux-64bit.deb

# Scan images
trivy image lumadesk/api:latest
trivy image lumadesk/web:latest
trivy image lumadesk/sunshine:latest
```

### Resource Limits

**Prevent resource exhaustion:**

```yaml
# Add to docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Sunshine Security

### Pairing Security

**Use API-managed pairing:**

1. Admin generates pairing token via UI
2. Token valid for limited time (5 minutes)
3. One-time use only
4. Stored securely in database

**Never expose Sunshine web UI to internet:**

```bash
# Bind only to localhost or LAN
# In docker-compose.yml, Sunshine already configured for LAN-only access
```

### GPU Access

**Minimum required permissions:**

```yaml
sunshine:
  devices:
    - /dev/dri:/dev/dri  # Intel/AMD GPU
  cap_add:
    - SYS_ADMIN  # For GPU access only
```

**Do not use:**
```yaml
privileged: true  # Avoid this in production
```

## PXE Security

### DHCP Security

**Option 1: Isolated DHCP**
- Use LumaDesk DHCP only on isolated network
- Prevent rogue DHCP servers

**Option 2: Secure existing DHCP**
- Use DHCP snooping on switches
- Whitelist PXE server MAC address

### Boot Image Integrity

**Sign boot images (production):**

```bash
# Generate signing key
openssl genrsa -out boot-sign-key.pem 2048

# Sign kernel
openssl dgst -sha256 -sign boot-sign-key.pem \
  -out vmlinuz.sig vmlinuz

# Verify on boot
openssl dgst -sha256 -verify boot-sign-key.pub \
  -signature vmlinuz.sig vmlinuz
```

### TFTP Security

**Restrict TFTP access:**

```bash
# In dnsmasq.conf
interface=eth1  # Specific interface only
bind-interfaces
```

## Monitoring & Auditing

### Audit Logs

**All administrative actions are logged:**

- User creation/deletion
- Session management
- Device pairing/deprovisioning
- Login attempts (success/failure)

**Review logs regularly:**

```bash
# Via API
curl http://localhost:3000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"

# Via database
docker-compose exec postgres psql -U lumadesk -d lumadesk \
  -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;"
```

### System Monitoring

**Monitor for suspicious activity:**

```bash
# Failed login attempts
docker-compose logs api | grep "login_failed"

# Unusual session patterns
docker-compose logs api | grep "session"

# Container resource usage
docker stats
```

### Intrusion Detection

**Install fail2ban:**

```bash
# Install fail2ban
apt-get install fail2ban

# Configure for LumaDesk
cat > /etc/fail2ban/filter.d/lumadesk.conf <<EOF
[Definition]
failregex = .*"login_failed".*"ip_address":"<HOST>"
ignoreregex =
EOF

cat > /etc/fail2ban/jail.d/lumadesk.conf <<EOF
[lumadesk]
enabled = true
port = 3000,8080
filter = lumadesk
logpath = /var/lib/docker/containers/*/*.log
maxretry = 5
bantime = 3600
EOF

# Restart fail2ban
systemctl restart fail2ban
```

## Backup & Recovery

### Backup Strategy

**3-2-1 Rule:**
- 3 copies of data
- 2 different storage types
- 1 offsite copy

**Automated backups:**

```bash
# Daily backup cron job
0 2 * * * /opt/lumadesk/scripts/backup && \
  rsync -avz /opt/lumadesk/backups/ backup-server:/backups/lumadesk/
```

**Backup encryption:**
```bash
# Encrypt before offsite transfer
gpg --symmetric --cipher-algo AES256 backup.tar.gz
```

**Test restores regularly:**
```bash
# Monthly restore test
./scripts/restore backups/latest.tar.gz
```

## Secrets Management

### Environment Variables

**Never commit `.env` to git:**

```bash
# Already in .gitignore
echo ".env" >> .gitignore
```

### Docker Secrets (Swarm Mode)

**For production, use Docker secrets:**

```yaml
# docker-compose.yml
secrets:
  jwt_secret:
    external: true
  postgres_password:
    external: true

services:
  api:
    secrets:
      - jwt_secret
      - postgres_password
```

```bash
# Create secrets
echo "your-jwt-secret" | docker secret create jwt_secret -
echo "your-db-password" | docker secret create postgres_password -
```

### HashiCorp Vault (Enterprise)

**For large deployments, consider Vault:**

```bash
# Store secrets in Vault
vault kv put secret/lumadesk/jwt secret="xxx"
vault kv put secret/lumadesk/db password="xxx"

# Retrieve in application
vault kv get -field=secret secret/lumadesk/jwt
```

## Security Checklist

### Initial Deployment

- [ ] Changed default admin password
- [ ] Generated strong JWT secrets
- [ ] Set strong database password
- [ ] Restricted `.env` file permissions (600)
- [ ] Configured firewall rules
- [ ] Enabled HTTPS with valid certificate
- [ ] Configured CORS origins
- [ ] Disabled unnecessary services

### Network Security

- [ ] Sunshine ports restricted to LAN
- [ ] PXE server on isolated network
- [ ] Firewall rules configured
- [ ] Network segmentation implemented
- [ ] VPN access for remote admin
- [ ] DDoS protection enabled (if internet-facing)

### Application Security

- [ ] Rate limiting configured
- [ ] Session timeouts set appropriately
- [ ] Password policy enforced
- [ ] JWT expiration configured
- [ ] HTTPS redirect enabled
- [ ] Security headers configured
- [ ] Input validation enabled

### Container Security

- [ ] Images scanned for vulnerabilities
- [ ] Running as non-root user
- [ ] Resource limits set
- [ ] Using minimal base images
- [ ] Regular image updates scheduled
- [ ] Secrets not in environment variables

### Monitoring & Auditing

- [ ] Audit logging enabled
- [ ] Log retention policy defined
- [ ] Intrusion detection configured (fail2ban)
- [ ] Monitoring alerts configured
- [ ] Regular log review scheduled

### Backup & Recovery

- [ ] Automated backups configured
- [ ] Backup encryption enabled
- [ ] Offsite backup configured
- [ ] Restore procedure tested
- [ ] Backup retention policy defined
- [ ] RTO/RPO defined

### Ongoing Maintenance

- [ ] Security updates schedule (monthly)
- [ ] Password rotation policy (90 days)
- [ ] Access review schedule (quarterly)
- [ ] Vulnerability scanning (weekly)
- [ ] Incident response plan documented
- [ ] Security awareness training completed

## Incident Response

### Security Incident Procedure

1. **Detect:**
   - Monitor audit logs
   - Check for unusual activity
   - Review security alerts

2. **Contain:**
   ```bash
   # Immediately stop services if compromised
   docker-compose down

   # Block suspicious IPs
   ufw deny from <suspicious-ip>
   ```

3. **Investigate:**
   ```bash
   # Review audit logs
   docker-compose exec postgres psql -U lumadesk -d lumadesk \
     -c "SELECT * FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours';"

   # Check container logs
   docker-compose logs --since 24h
   ```

4. **Recover:**
   ```bash
   # Restore from clean backup
   ./scripts/restore backups/last-known-good.tar.gz

   # Reset credentials
   # Update .env with new secrets
   docker-compose up -d
   ```

5. **Post-Incident:**
   - Document incident
   - Update security measures
   - Notify affected users
   - Review and improve procedures

## Security Updates

### Update Schedule

**Critical updates:** Immediately
**Security patches:** Within 7 days
**Regular updates:** Monthly

**Update procedure:**

```bash
# 1. Backup current system
./scripts/backup

# 2. Pull latest images
docker-compose pull

# 3. Rebuild custom images
make build

# 4. Test in staging environment
docker-compose -f docker-compose.staging.yml up -d

# 5. Deploy to production (during maintenance window)
docker-compose down
docker-compose up -d

# 6. Verify services
docker-compose ps
curl http://localhost:8080/health
```

## Compliance Considerations

### GDPR

- User data stored in PostgreSQL
- Right to erasure: Use user deletion endpoint
- Data portability: Export user data via API
- Audit logs track data access

### HIPAA (if handling PHI)

- Enable encryption at rest and in transit
- Implement access controls (RBAC)
- Audit logs with retention policy
- Regular security assessments

### PCI DSS (if handling payment data)

- Network segmentation
- Encrypted connections
- Regular vulnerability scans
- Access logging and monitoring

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)

## Security Contact

Report security vulnerabilities to: security@yourdomain.com

**Do not** open public issues for security vulnerabilities.
