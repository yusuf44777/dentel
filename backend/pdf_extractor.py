import re
import io
import unicodedata
from typing import Optional

# Derlenmiş regex — güvenli sınırlar, ReDoS imkânsız
_RE_TC_LABELED = re.compile(
    r"T\.?C\.?\s*Kimlik\s*(?:No(?:su)?)?\s*[:\-]?\s*([1-9][0-9]{10})"
    r"|TC\s*[:\-]?\s*([1-9][0-9]{10})"
    r"|Kimlik\s*No\s*[:\-]?\s*([1-9][0-9]{10})"
    r"|T\.C\.\s+([1-9][0-9]{10})",
    re.IGNORECASE,
)
_RE_TC_BARE      = re.compile(r"\b([1-9][0-9]{10})\b")
_RE_YOK          = re.compile(r"(YÖK[A-Z0-9\-]{6,28}|YOK[A-Z0-9\-]{6,28})", re.IGNORECASE)
_RE_BELGE_LABEL  = re.compile(
    r"[Bb]elge\s*(?:No|Kodu|Doğrulama)\s*[:\-]?\s*([A-Z0-9\-]{8,28})"
    r"|[Bb]arkod\s*(?:No|Numarası)?\s*[:\-]?\s*([A-Z0-9\-]{8,28})"
    r"|[Dd]oğrulama\s*[Kk]odu\s*[:\-]?\s*([A-Z0-9\-]{8,28})",
)
# Genel alfanümerik kod — maksimum uzunluk sabitlendi (ReDoS yok)
_RE_CODE_GENERAL = re.compile(r"\b([A-Z]{2,4}[0-9]{6,16}[A-Z0-9]{0,8})\b")

_PDF_MAGIC   = b"%PDF"
_MAX_BYTES   = 20 * 1024 * 1024   # 20 MB yükleme limiti
_MAX_TEXT    = 200 * 1024          # 200 KB metin tarama limiti
_ALLOWED_DEPARTMENTS = ("Diş Hekimliği", "Diş Protez Teknolojisi")


def _normalize_department_text(text: str) -> str:
    normalized = text.casefold().replace("ı", "i")
    normalized = unicodedata.normalize("NFKD", normalized)
    normalized = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


_ALLOWED_DEPARTMENT_TOKENS = tuple(
    (department, _normalize_department_text(department))
    for department in _ALLOWED_DEPARTMENTS
)


def _check_magic(pdf_bytes: bytes) -> None:
    """İlk 8 byte'ta %PDF magic olmazsa reddet."""
    if not pdf_bytes[:8].lstrip().startswith(_PDF_MAGIC):
        raise ValueError("Geçersiz dosya formatı.")


def validate_tc(tc: str) -> bool:
    if len(tc) != 11 or tc[0] == "0":
        return False
    d = [int(c) for c in tc]
    check1 = (sum(d[i] for i in range(0, 9, 2)) * 7 - sum(d[i] for i in range(1, 8, 2))) % 10
    check2 = sum(d[:10]) % 10
    return check1 == d[9] and check2 == d[10]


def _extract_text(pdf_bytes: bytes) -> str:
    import pdfplumber
    text_parts: list[str] = []
    total = 0
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            chunk = page.extract_text() or ""
            if total + len(chunk) > _MAX_TEXT:
                # Limitin üstünü kes — ReDoS / OOM'a karşı
                text_parts.append(chunk[: _MAX_TEXT - total])
                break
            text_parts.append(chunk)
            total += len(chunk)
    return "\n".join(text_parts)


def _find_tc(text: str) -> Optional[str]:
    for m in _RE_TC_LABELED.finditer(text):
        candidate = next(g for g in m.groups() if g)
        if validate_tc(candidate):
            return candidate
    for m in _RE_TC_BARE.finditer(text):
        if validate_tc(m.group(1)):
            return m.group(1)
    return None


def _find_barcode(text: str) -> Optional[str]:
    for pattern in (_RE_YOK, _RE_BELGE_LABEL, _RE_CODE_GENERAL):
        m = pattern.search(text)
        if m:
            code = next(g for g in m.groups() if g).strip().upper()
            if len(code) >= 8 and not code.isalpha():
                return code
    return None


def _find_allowed_department(text: str) -> Optional[str]:
    searchable = f" {_normalize_department_text(text)} "
    for department, token in _ALLOWED_DEPARTMENT_TOKENS:
        if f" {token} " in searchable:
            return department
    return None


def extract_document_info(pdf_bytes: bytes) -> dict:
    """
    PDF'den yalnızca doğrulama için gereken bilgileri bellekte çıkarır.
    Ham metin, önizleme veya kişisel veri asla dışarıya döndürülmez.
    """
    _check_magic(pdf_bytes)
    text = _extract_text(pdf_bytes)
    tc      = _find_tc(text)
    barcode = _find_barcode(text)
    department_allowed = _find_allowed_department(text) is not None
    del text  # ham metin bellekten temizle
    return {
        "tc_number": tc,
        "barcode": barcode,
        "department_allowed": department_allowed,
    }
