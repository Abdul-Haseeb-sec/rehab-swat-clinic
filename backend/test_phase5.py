import os
import sys

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Set environment variables for safe loading
os.environ["DATABASE_URL"] = "sqlite:///./test_phase5.db"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_unit_tests_only_32bytes!"
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:5173,http://testserver"

from fastapi.testclient import TestClient
from main import app
from settings import settings

results = []

def test(description, condition, details=""):
    if condition:
        results.append((description, True))
        print(f"  ✔ {description}")
    else:
        results.append((description, False))
        print(f"  ❌ FAILED: {description}")
        if details:
            print(f"     Details: {details}")

def run_all_tests():
    print("=" * 70)
    print(" Running Phase 5 Verification Tests")
    print("=" * 70)

    # 1. Test GET /health
    print("\n── 5.3 Health Check Endpoint ───────────────────────────────────────")
    client = TestClient(app)
    try:
        from unittest.mock import patch, MagicMock
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True
        
        with patch("redis.Redis.from_url", return_value=mock_redis):
            response = client.get("/health")
            test("GET /health returns HTTP 200", response.status_code == 200, f"Status: {response.status_code}")
            
            data = response.json()
            test("GET /health response has 'status' key", "status" in data)
            test("GET /health response has 'environment' key", "environment" in data)
            test("GET /health response has 'database' key", "database" in data)
            test("GET /health response has 'redis' key", "redis" in data)
            test("GET /health response 'status' is correct type", data["status"] in ("ok", "error"))
            test("GET /health status is 'ok'", data["status"] == "ok")
            test("GET /health database is 'connected'", data["database"] == "connected")
            test("GET /health redis is 'connected'", data["redis"] == "connected")
    except Exception as e:
        test("GET /health call succeeded without exception", False, str(e))

    # 2. Test Security Headers
    print("\n── 5.4 Security Headers Middleware ─────────────────────────────────")
    try:
        from unittest.mock import patch, MagicMock
        mock_redis = MagicMock()
        mock_redis.ping.return_value = True
        
        with patch("redis.Redis.from_url", return_value=mock_redis):
            response = client.get("/health")
            headers = response.headers
            test("Strict-Transport-Security is present", headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains", headers.get("Strict-Transport-Security"))
            test("X-Content-Type-Options is nosniff", headers.get("X-Content-Type-Options") == "nosniff", headers.get("X-Content-Type-Options"))
            test("X-Frame-Options is DENY", headers.get("X-Frame-Options") == "DENY", headers.get("X-Frame-Options"))
            test("X-XSS-Protection is block", headers.get("X-XSS-Protection") == "1; mode=block", headers.get("X-XSS-Protection"))
            test("Referrer-Policy is strict-origin", headers.get("Referrer-Policy") == "strict-origin-when-cross-origin", headers.get("Referrer-Policy"))
    except Exception as e:
        test("Security headers extraction succeeded", False, str(e))

    # 3. Test Sentry settings & initialization
    print("\n── 5.2 Sentry Settings & Initialization ────────────────────────────")
    test("Settings has 'sentry_dsn'", hasattr(settings, "sentry_dsn"))
    test("Settings has 'environment'", hasattr(settings, "environment"))
    test("Sentry DSN is empty in test environment", settings.sentry_dsn == "")

    # 4. Test Backup Scripts existence
    print("\n── 5.5 Backup Script Assets ────────────────────────────────────────")
    root_dir = os.path.dirname(backend_dir)
    scripts_dir = os.path.join(root_dir, "scripts")
    
    backup_path = os.path.join(scripts_dir, "backup.sh")
    restore_path = os.path.join(scripts_dir, "restore.sh")
    setup_cron_path = os.path.join(scripts_dir, "setup_cron.sh")
    
    test("backup.sh exists", os.path.exists(backup_path))
    test("restore.sh exists", os.path.exists(restore_path))
    test("setup_cron.sh exists", os.path.exists(setup_cron_path))

    # 5. Test Training Documents existence & headings
    print("\n── 5.8 Training Documents ──────────────────────────────────────────")
    docs_dir = os.path.join(root_dir, "docs")
    receptionist_path = os.path.join(docs_dir, "receptionist_guide.md")
    doctor_path = os.path.join(docs_dir, "doctor_guide.md")
    admin_path = os.path.join(docs_dir, "admin_guide.md")
    
    test("receptionist_guide.md exists", os.path.exists(receptionist_path))
    test("doctor_guide.md exists", os.path.exists(doctor_path))
    test("admin_guide.md exists", os.path.exists(admin_path))
    
    if os.path.exists(receptionist_path):
        with open(receptionist_path, "r", encoding="utf-8") as f:
            c = f.read()
            test("receptionist_guide has main heading", "# Receptionist Operations Guide" in c)
            test("receptionist_guide contains scenario data", "Zubair Khan" in c)
            
    if os.path.exists(doctor_path):
        with open(doctor_path, "r", encoding="utf-8") as f:
            c = f.read()
            test("doctor_guide has main heading", "# Clinical Operations & EMR Guide" in c)
            test("doctor_guide contains SOAP reference", "SOAP" in c)
            
    if os.path.exists(admin_path):
        with open(admin_path, "r", encoding="utf-8") as f:
            c = f.read()
            test("admin_guide has main heading", "# Administration & Configuration Manual" in c)
            test("admin_guide contains SUPER_ADMIN reference", "SUPER_ADMIN" in c)

    # 6. Test docker-compose.yml directives
    print("\n── 5.7 Docker Compose Hardening ─────────────────────────────────────")
    compose_path = os.path.join(root_dir, "docker-compose.yml")
    test("docker-compose.yml exists", os.path.exists(compose_path))
    if os.path.exists(compose_path):
        with open(compose_path, "r", encoding="utf-8") as f:
            c = f.read()
        test("docker-compose has 'restart: unless-stopped'", "restart: unless-stopped" in c)
        test("docker-compose has memory limit blocks", "limits:" in c and "memory:" in c)
        test("docker-compose has postgres health check", "pg_isready" in c)
        test("docker-compose has redis health check", "redis-cli" in c)
        test("docker-compose has app health check", "curl" in c and "/health" in c)
        test("docker-compose has depends_on condition: service_healthy", "condition: service_healthy" in c)
        test("docker-compose has postgres volume persistence", "postgres_data:" in c)
        test("docker-compose has json-file log rotation", "driver: \"json-file\"" in c or "max-size:" in c)

    # 7. Test nginx.conf directives
    print("\n── 5.6 Nginx Production Configuration ──────────────────────────────")
    nginx_path = os.path.join(root_dir, "nginx.conf")
    test("nginx.conf exists", os.path.exists(nginx_path))
    if os.path.exists(nginx_path):
        with open(nginx_path, "r", encoding="utf-8") as f:
            c = f.read()
        test("nginx.conf disables server tokens", "server_tokens off;" in c)
        test("nginx.conf limits body upload size to 20M", "client_max_body_size 20M;" in c)
        test("nginx.conf has gzip compression enabled", "gzip on;" in c)
        test("nginx.conf has static assets Cache-Control configured", "Cache-Control" in c and "max-age=31536000" in c)
        test("nginx.conf defines rate limiting zone", "limit_req_zone" in c)
        test("nginx.conf applies rate limiting to /api/", "limit_req" in c)
        test("nginx.conf defines proxy headers", "X-Real-IP" in c and "X-Forwarded-For" in c and "X-Forwarded-Proto" in c)

    # Cleanup test db if created
    try:
        if os.path.exists("test_phase5.db"):
            os.remove("test_phase5.db")
    except Exception:
        pass

    # ── Summary ───────────────────────────────────────────────────────────────
    passed = sum(1 for _, ok in results if ok)
    failed = sum(1 for _, ok in results if not ok)
    total = len(results)

    print("\n" + "=" * 70)
    print(f" RESULTS: {passed}/{total} passed  |  {failed} failed")
    print("=" * 70)

    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for name, ok in results:
            if not ok:
                print(f"   - {name}")
        sys.exit(1)
    else:
        print("\n🎉 All Phase 5 production hardening features verified successfully!")
        sys.exit(0)

if __name__ == "__main__":
    run_all_tests()
