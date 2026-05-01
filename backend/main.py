import os
import re
import asyncio
import time
import json
import hmac
import hashlib
import ipaddress
import secrets
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel

from pdf_extractor import extract_document_info, validate_tc
from document_verifier import verify_document, verify_document_stream

# ── Uygulama ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="YÖK Belge Doğrulama",
    docs_url=None,   # Swagger UI kapalı — bilgi ifşasını önler
    redoc_url=None,
)

# ── Güvenlik header'ları ──────────────────────────────────────────────────────

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        h = response.headers
        h["X-Content-Type-Options"]  = "nosniff"
        h["X-Frame-Options"]          = "DENY"
        h["X-XSS-Protection"]         = "1; mode=block"
        h["Referrer-Policy"]          = "no-referrer"
        h["Permissions-Policy"]       = "camera=(), microphone=(), geolocation=()"
        h["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        # Sunucu bilgisini gizle
        try:
            del h["server"]
        except KeyError:
            pass
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ── CORS ──────────────────────────────────────────────────────────────────────

_ALLOWED = os.getenv("ALLOWED_ORIGINS", "*")
_ORIGINS  = [o.strip() for o in _ALLOWED.split(",")] if _ALLOWED != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ORIGINS,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# ── Rate limiter (in-process sliding window) ──────────────────────────────────
# HF Spaces tek process çalıştırdığı için yeterli; production'da Redis kullanın.

_RL_WINDOW  = 60       # saniye
_RL_MAX     = 5        # dakikada maks 5 /verify/stream isteği
_rl_store: dict[str, list[float]] = defaultdict(list)
_TRUSTED_PROXY_NETWORKS = tuple(
    ipaddress.ip_network(item.strip(), strict=False)
    for item in os.getenv("TRUSTED_PROXY_IPS", "").split(",")
    if item.strip()
)


def _parse_ip(value: Optional[str]) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
    if not value:
        return None
    try:
        return ipaddress.ip_address(value.strip())
    except ValueError:
        return None


def _is_trusted_proxy(host: Optional[str]) -> bool:
    ip = _parse_ip(host)
    return bool(ip and any(ip in network for network in _TRUSTED_PROXY_NETWORKS))


def _get_client_ip(request: Request) -> str:
    peer_host = request.client.host if request.client else None

    if _is_trusted_proxy(peer_host):
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            first_forwarded_ip = _parse_ip(forwarded.split(",")[0])
            if first_forwarded_ip:
                return str(first_forwarded_ip)

        real_ip = _parse_ip(
            request.headers.get("CF-Connecting-IP")
            or request.headers.get("X-Real-IP")
        )
        if real_ip:
            return str(real_ip)

    return peer_host or "unknown"


def _check_rate_limit(ip: str) -> bool:
    now   = time.monotonic()
    times = _rl_store[ip]
    _rl_store[ip] = [t for t in times if now - t < _RL_WINDOW]
    if len(_rl_store[ip]) >= _RL_MAX:
        return False
    _rl_store[ip].append(now)
    return True


# ── Input doğrulama ───────────────────────────────────────────────────────────

_RE_PHONE_SAFE = re.compile(r"^\+?[0-9]{10,15}$")

_DB_PATH = Path(os.getenv("STUDENT_DB_PATH", "/tmp/dentel_students.sqlite3"))
_PASSWORD_ITERATIONS = 210_000
_SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
_SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_ANON_KEY")
    or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    or os.getenv("EXPO_PUBLIC_SUPABASE_KEY")
)
_SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


class LoginPayload(BaseModel):
    email: str
    password: str


def _require_supabase_config() -> tuple[str, str, str]:
    if not _SUPABASE_URL or not _SUPABASE_ANON_KEY or not _SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase sunucu ayarları eksik.")
    return _SUPABASE_URL, _SUPABASE_ANON_KEY, _SUPABASE_SERVICE_ROLE_KEY


def _json_http_request(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: Optional[dict] = None,
) -> dict:
    body = None
    request_headers = dict(headers)
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        url,
        data=body,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {"message": raw}

        message = (
            data.get("msg")
            or data.get("message")
            or data.get("error_description")
            or data.get("error")
            or "Supabase isteği başarısız oldu."
        )
        status_code = exc.code if exc.code in {400, 401, 403, 409, 422, 429} else 502
        raise HTTPException(status_code=status_code, detail=str(message))
    except urllib.error.URLError:
        raise HTTPException(status_code=502, detail="Supabase servisine ulaşılamadı.")

    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Supabase yanıtı okunamadı.")


def _supabase_signup(
    *,
    email: str,
    password: str,
    metadata: dict,
    email_redirect_to: Optional[str],
) -> dict:
    supabase_url, anon_key, _ = _require_supabase_config()
    url = f"{supabase_url}/auth/v1/signup"
    if email_redirect_to:
        url = f"{url}?redirect_to={urllib.parse.quote(email_redirect_to, safe='')}"

    return _json_http_request(
        "POST",
        url,
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {anon_key}",
        },
        payload={
            "email": email,
            "password": password,
            "data": metadata,
        },
    )


def _supabase_mark_profile_verified(
    *,
    user_id: str,
    full_name: str,
    university_year: str,
    whatsapp: str,
    barcode: str,
    tc_masked: Optional[str],
) -> dict:
    supabase_url, _, service_role_key = _require_supabase_config()
    url = f"{supabase_url}/rest/v1/profiles?id=eq.{urllib.parse.quote(user_id)}"
    verified_at = datetime.now(timezone.utc).isoformat()

    data = _json_http_request(
        "PATCH",
        url,
        headers={
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Prefer": "return=representation",
        },
        payload={
            "full_name": full_name,
            "university_year": university_year,
            "whatsapp": whatsapp,
            "student_document_verified": True,
            "student_document_verified_at": verified_at,
            "student_document_barcode": barcode,
            "student_document_tc_masked": tc_masked,
        },
    )

    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        return data
    raise HTTPException(status_code=502, detail="Profil doğrulaması kaydedilemedi.")


def _connect_db() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    with _connect_db() as conn:
      conn.execute(
          """
          create table if not exists verified_students (
            id integer primary key autoincrement,
            full_name text not null,
            email text not null unique,
            phone text not null unique,
            university text not null,
            department text not null,
            class_level text not null,
            password_hash text not null,
            tc_masked text,
            document_barcode_hash text not null,
            verified_at text not null,
            created_at text not null default current_timestamp,
            updated_at text not null default current_timestamp
          )
          """
      )
      conn.execute(
          "create index if not exists idx_verified_students_email on verified_students(email)"
      )
      conn.execute(
          "update verified_students set phone = replace(phone, ' ', '') where phone like '% %'"
      )
      try:
          conn.execute(
              "create unique index if not exists idx_verified_students_phone on verified_students(phone)"
          )
      except sqlite3.IntegrityError:
          # Eski veride yinelenen telefon varsa uygulama açılmaya devam etsin;
          # yeni kayıtlar yine uygulama kontrolünden geçer.
          pass


_init_db()


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _validate_text_field(value: Optional[str], label: str, min_len: int = 2, max_len: int = 120) -> str:
    cleaned = re.sub(r"\s+", " ", (value or "").strip())
    if len(cleaned) < min_len:
        raise HTTPException(status_code=422, detail=f"{label} alanı zorunludur.")
    if len(cleaned) > max_len:
        raise HTTPException(status_code=422, detail=f"{label} çok uzun.")
    return cleaned


def _validate_email(value: Optional[str]) -> str:
    email = _normalize_email(value or "")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=422, detail="Geçerli bir e-posta adresi girin.")
    return email


def _validate_phone(value: Optional[str]) -> str:
    cleaned = re.sub(r"\s+", "", (value or "").strip())
    if not _RE_PHONE_SAFE.match(cleaned):
        raise HTTPException(status_code=422, detail="Geçerli bir telefon numarası girin.")
    return cleaned


def _find_existing_student_contact(email: str, phone: str) -> Optional[str]:
    with _connect_db() as conn:
        row = conn.execute(
            """
            select email, phone
            from verified_students
            where email = ?
               or replace(phone, ' ', '') = ?
            limit 1
            """,
            (email, phone),
        ).fetchone()

    if not row:
        return None
    if row["email"] == email:
        return "email"
    return "phone"


def _ensure_student_contact_available(email: str, phone: str) -> None:
    existing = _find_existing_student_contact(email, phone)
    if existing == "email":
        raise HTTPException(status_code=409, detail="Bu e-posta adresiyle zaten kayıt var.")
    if existing == "phone":
        raise HTTPException(status_code=409, detail="Bu telefon numarasıyla zaten kayıt var.")


def _validate_password(value: Optional[str]) -> str:
    password = value or ""
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Şifre en az 8 karakter olmalıdır.")
    return password


def _validate_auth_password(value: Optional[str]) -> str:
    password = value or ""
    if len(password) < 6:
        raise HTTPException(status_code=422, detail="Şifre en az 6 karakter olmalıdır.")
    return password


def _hash_secret(value: str, salt: Optional[bytes] = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        value.encode("utf-8"),
        salt,
        _PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${_PASSWORD_ITERATIONS}${salt.hex()}${digest.hex()}"


def _verify_secret(value: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_hex, digest_hex = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            value.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iterations),
        )
        return hmac.compare_digest(digest.hex(), digest_hex)
    except Exception:
        return False


def _hash_barcode(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _save_verified_student(
    *,
    full_name: str,
    email: str,
    phone: str,
    university: str,
    department: str,
    class_level: str,
    password: str,
    tc_masked: Optional[str],
    barcode: str,
) -> dict:
    verified_at = datetime.now(timezone.utc).isoformat()
    password_hash = _hash_secret(password)
    barcode_hash = _hash_barcode(barcode)

    with _connect_db() as conn:
        try:
            conn.execute(
                """
                insert into verified_students (
                  full_name,
                  email,
                  phone,
                  university,
                  department,
                  class_level,
                  password_hash,
                  tc_masked,
                  document_barcode_hash,
                  verified_at
                )
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    full_name,
                    email,
                    phone,
                    university,
                    department,
                    class_level,
                    password_hash,
                    tc_masked,
                    barcode_hash,
                    verified_at,
                ),
            )
        except sqlite3.IntegrityError:
            _ensure_student_contact_available(email, phone)
            raise HTTPException(status_code=409, detail="Bu bilgilerle zaten kayıt var.")

        row = conn.execute(
            """
            select id, full_name, email, phone, university, department, class_level, tc_masked, verified_at
            from verified_students
            where email = ?
            """,
            (email,),
        ).fetchone()

    return dict(row)


def _public_student(row: sqlite3.Row | dict) -> dict:
    return {
        "id": row["id"],
        "full_name": row["full_name"],
        "email": row["email"],
        "phone": row["phone"],
        "university": row["university"],
        "department": row["department"],
        "class_level": row["class_level"],
        "tc_masked": row["tc_masked"],
        "verified_at": row["verified_at"],
    }


def _validate_tc_override(value: str) -> str:
    cleaned = re.sub(r"\D", "", value)
    if len(cleaned) != 11:
        raise HTTPException(status_code=422, detail="TC Kimlik No 11 haneli olmalıdır.")
    if not validate_tc(cleaned):
        raise HTTPException(status_code=422, detail="TC Kimlik No geçersiz.")
    return cleaned


def _mask_tc(tc: str) -> str:
    return f"{tc[:2]}{'*' * 7}{tc[-2:]}"


async def _extract_pdf_info(file: UploadFile) -> dict:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyası yüklenebilir.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya 20 MB'dan büyük olamaz.")

    try:
        info = extract_document_info(content)
    except ValueError:
        raise HTTPException(status_code=422, detail="Geçersiz veya bozuk PDF dosyası.")
    except Exception:
        raise HTTPException(status_code=422, detail="PDF işlenemedi.")
    finally:
        del content

    if not info.get("department_allowed"):
        raise HTTPException(
            status_code=422,
            detail="Belgede Diş Hekimliği veya Diş Protez Teknolojisi bölümü bulunmalıdır.",
        )

    return info


def _resolve_document_fields(
    info: dict,
    tc_override: Optional[str],
    barcode_override: Optional[str],
) -> tuple[Optional[str], str]:
    tc_number: Optional[str] = None
    if tc_override and tc_override.strip():
        tc_number = _validate_tc_override(tc_override.strip())
    elif info.get("tc_number"):
        tc_number = info["tc_number"]

    barcode: Optional[str] = None
    if barcode_override and barcode_override.strip():
        raise HTTPException(
            status_code=422,
            detail="Barkod manuel girilemez. Lütfen barkod içeren YÖK öğrenci belgesi PDF'i yükleyin.",
        )
    if info.get("barcode"):
        barcode = info["barcode"]

    if not barcode:
        raise HTTPException(
            status_code=422,
            detail="Barkod bulunamadı. Lütfen barkod içeren YÖK öğrenci belgesi PDF'i yükleyin.",
        )

    return tc_number, barcode


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


# ── Endpoint'ler ──────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/verify")
async def verify_json(
    request: Request,
    file: UploadFile = File(...),
    tc_override: Optional[str] = Form(None),
    barcode_override: Optional[str] = Form(None),
):
    ip = _get_client_ip(request)
    if not _check_rate_limit(f"verify-json:{ip}"):
        raise HTTPException(status_code=429, detail="Çok fazla istek. Lütfen bir dakika bekleyin.")

    info = await _extract_pdf_info(file)
    tc_number, barcode = _resolve_document_fields(info, tc_override, barcode_override)
    result = await verify_document(tc_number, barcode)

    return {
        "tc_masked": _mask_tc(tc_number) if tc_number else None,
        "barcode": barcode,
        "result": result,
    }


@app.post("/auth/register")
async def register_supabase_user(
    request: Request,
    file: UploadFile = File(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    university_year: str = Form(...),
    password: str = Form(...),
    email_redirect_to: Optional[str] = Form(None),
    tc_override: Optional[str] = Form(None),
):
    ip = _get_client_ip(request)
    if not _check_rate_limit(f"auth-register:{ip}"):
        raise HTTPException(status_code=429, detail="Çok fazla kayıt denemesi. Lütfen bir dakika bekleyin.")

    student_input = {
        "full_name": _validate_text_field(full_name, "Ad soyad"),
        "email": _validate_email(email),
        "phone": _validate_phone(phone),
        "university_year": _validate_text_field(university_year, "Sınıf", min_len=1, max_len=40),
        "password": _validate_auth_password(password),
    }

    info = await _extract_pdf_info(file)
    tc_number, barcode = _resolve_document_fields(info, tc_override, None)
    result = await verify_document(tc_number, barcode)

    if result.get("valid") is not True:
        raise HTTPException(
            status_code=422,
            detail=result.get("error") or "Öğrenci belgesi e-Devlet üzerinde geçerli olarak doğrulanamadı.",
        )

    signup_response = await asyncio.to_thread(
        _supabase_signup,
        email=student_input["email"],
        password=student_input["password"],
        metadata={
            "full_name": student_input["full_name"],
            "university_year": student_input["university_year"],
            "whatsapp": student_input["phone"],
        },
        email_redirect_to=email_redirect_to.strip() if email_redirect_to and email_redirect_to.strip() else None,
    )

    user_payload = signup_response.get("user") if isinstance(signup_response.get("user"), dict) else signup_response
    user_id = user_payload.get("id") if isinstance(user_payload, dict) else None
    if not user_id:
        raise HTTPException(status_code=502, detail="Kullanıcı kaydı oluşturuldu ancak kullanıcı bilgisi alınamadı.")

    tc_masked = _mask_tc(tc_number) if tc_number else None
    profile = await asyncio.to_thread(
        _supabase_mark_profile_verified,
        user_id=user_id,
        full_name=student_input["full_name"],
        university_year=student_input["university_year"],
        whatsapp=student_input["phone"],
        barcode=barcode,
        tc_masked=tc_masked,
    )

    session = signup_response.get("session")
    if not session and signup_response.get("access_token") and signup_response.get("refresh_token"):
        session = {
            "access_token": signup_response.get("access_token"),
            "refresh_token": signup_response.get("refresh_token"),
            "expires_in": signup_response.get("expires_in"),
            "expires_at": signup_response.get("expires_at"),
            "token_type": signup_response.get("token_type"),
            "user": user_payload,
        }

    return {
        "user": user_payload,
        "session": session,
        "profile": profile,
        "verification": {
            "barcode": barcode,
            "tc_masked": tc_masked,
            "valid_label": result.get("valid_label", "GERÇEK"),
        },
    }


@app.post("/students/login")
async def student_login(payload: LoginPayload, request: Request):
    ip = _get_client_ip(request)
    if not _check_rate_limit(f"login:{ip}"):
        raise HTTPException(status_code=429, detail="Çok fazla deneme. Lütfen bir dakika bekleyin.")

    email = _validate_email(payload.email)
    if not payload.password:
        raise HTTPException(status_code=422, detail="Şifre zorunludur.")

    with _connect_db() as conn:
        row = conn.execute(
            """
            select id, full_name, email, phone, university, department, class_level,
                   password_hash, tc_masked, verified_at
            from verified_students
            where email = ?
            """,
            (email,),
        ).fetchone()

    if not row or not _verify_secret(payload.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    return {"student": _public_student(row)}


@app.post("/students/register/stream")
async def student_register_stream(
    request: Request,
    file: UploadFile = File(...),
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    university: str = Form(""),
    department: str = Form("Diş Hekimliği"),
    class_level: str = Form(...),
    password: str = Form(...),
    tc_override: Optional[str] = Form(None),
    barcode_override: Optional[str] = Form(None),
):
    ip = _get_client_ip(request)
    if not _check_rate_limit(f"register:{ip}"):
        raise HTTPException(status_code=429, detail="Çok fazla kayıt denemesi. Lütfen bir dakika bekleyin.")

    student_input = {
        "full_name": _validate_text_field(full_name, "Ad soyad"),
        "email": _validate_email(email),
        "phone": _validate_phone(phone),
        "university": _validate_text_field(university, "Üniversite", max_len=160),
        "department": _validate_text_field(department, "Bölüm", max_len=160),
        "class_level": _validate_text_field(class_level, "Sınıf", min_len=1, max_len=40),
        "password": _validate_password(password),
    }
    _ensure_student_contact_available(student_input["email"], student_input["phone"])

    info = await _extract_pdf_info(file)
    tc_number, barcode = _resolve_document_fields(info, tc_override, barcode_override)

    async def event_stream() -> AsyncGenerator[str, None]:
        import asyncio

        final_result: Optional[dict] = None
        tc_masked = _mask_tc(tc_number) if tc_number else None

        yield _sse({"step": "uploaded", "progress": 10, "message": "Öğrenci belgesi PDF'i yüklendi."})
        await asyncio.sleep(0.1)
        yield _sse({"step": "extracting", "progress": 25, "message": "Belgeden barkod ve kimlik bilgileri okunuyor..."})
        await asyncio.sleep(0.3)

        if tc_number:
            yield _sse({
                "step": "tc_found",
                "progress": 38,
                "message": f"TC Kimlik No bulundu: {tc_masked}",
                "tc_masked": tc_masked,
            })
        else:
            yield _sse({"step": "tc_not_found", "progress": 38, "message": "TC Kimlik No bulunamadı (opsiyonel)."})
        await asyncio.sleep(0.2)

        yield _sse({
            "step": "barcode_found",
            "progress": 50,
            "message": f"Barkod bulundu: {barcode}",
            "barcode": barcode,
        })
        await asyncio.sleep(0.2)

        async for chunk in verify_document_stream(tc_number, barcode):
            yield chunk

            data = chunk.strip()
            if not data.startswith("data:"):
                continue
            try:
                evt = json.loads(data[5:].strip())
            except json.JSONDecodeError:
                continue
            if evt.get("step") == "complete":
                final_result = evt.get("result")

        if not final_result or final_result.get("valid") is not True:
            yield _sse({
                "step": "registration_failed",
                "progress": 100,
                "message": "Kayıt tamamlanamadı. Belge doğrulanmadı.",
                "result": final_result,
            })
            return

        try:
            student = _save_verified_student(
                full_name=student_input["full_name"],
                email=student_input["email"],
                phone=student_input["phone"],
                university=student_input["university"],
                department=student_input["department"],
                class_level=student_input["class_level"],
                password=student_input["password"],
                tc_masked=tc_masked,
                barcode=barcode,
            )
        except HTTPException as exc:
            yield _sse({
                "step": "registration_failed",
                "progress": 100,
                "message": exc.detail,
                "result": final_result,
            })
            return

        yield _sse({
            "step": "registered",
            "progress": 100,
            "message": "Belge doğrulandı ve öğrenci kaydı oluşturuldu.",
            "student": _public_student(student),
            "result": final_result,
        })

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.post("/verify/stream")
async def verify_stream(
    request: Request,
    file: UploadFile = File(...),
    tc_override: Optional[str] = Form(None),
    barcode_override: Optional[str] = Form(None),
):
    # Rate limit
    ip = _get_client_ip(request)
    if not _check_rate_limit(ip):
        raise HTTPException(status_code=429, detail="Çok fazla istek. Lütfen bir dakika bekleyin.")

    info = await _extract_pdf_info(file)
    tc_number, barcode = _resolve_document_fields(info, tc_override, barcode_override)

    async def event_stream():
        import asyncio

        yield _sse({"step": "uploaded",   "progress": 10, "message": "PDF yüklendi."})
        await asyncio.sleep(0.1)
        yield _sse({"step": "extracting", "progress": 25, "message": "Metin çıkarılıyor..."})
        await asyncio.sleep(0.3)

        if tc_number:
            yield _sse({
                "step":      "tc_found",
                "progress":  38,
                "message":   f"TC Kimlik No bulundu: {_mask_tc(tc_number)}",
                "tc_masked": _mask_tc(tc_number),   # tam TC asla wire'a çıkmaz
            })
        else:
            yield _sse({"step": "tc_not_found", "progress": 38, "message": "TC Kimlik No bulunamadı (opsiyonel)."})
        await asyncio.sleep(0.2)

        yield _sse({
            "step":     "barcode_found",
            "progress": 50,
            "message":  f"Barkod bulundu: {barcode}",
            "barcode":  barcode,
        })
        await asyncio.sleep(0.2)

        async for chunk in verify_document_stream(tc_number, barcode):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":          "no-store",
            "Pragma":                 "no-cache",
            "X-Accel-Buffering":      "no",
            "X-Content-Type-Options": "nosniff",
        },
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
