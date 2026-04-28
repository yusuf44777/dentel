import os
import re
import sys
import time
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import AsyncGenerator, Optional

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

VERIFY_URL = "https://www.turkiye.gov.tr/belge-dogrulama"

_IS_LINUX        = sys.platform == "linux"
_CHROMIUM_BIN    = "/usr/bin/chromium"
_CHROMEDRIVER_BIN = "/usr/bin/chromedriver"

# En fazla 2 eş zamanlı Chrome oturumu — kaynak tükenmesi önlenir
_EXECUTOR = ThreadPoolExecutor(max_workers=2, thread_name_prefix="selenium")

# Güvenli karakter seti — send_keys öncesi sanitizasyon için
_SAFE_BARCODE = re.compile(r"[^A-Z0-9\-]")
_SAFE_TC      = re.compile(r"[^0-9]")


def _sanitize_barcode(value: str) -> str:
    """Barkodu send_keys için güvenli hale getir."""
    return _SAFE_BARCODE.sub("", value.upper())[:30]


def _sanitize_tc(value: str) -> str:
    """TC'yi send_keys için güvenli hale getir."""
    return _SAFE_TC.sub("", value)[:11]


def _build_driver() -> webdriver.Chrome:
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-setuid-sandbox")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1280,800")
    options.add_argument("--lang=tr-TR,tr")
    options.add_argument(
        "--user-agent=Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)

    if _IS_LINUX and os.path.exists(_CHROMIUM_BIN):
        options.binary_location = _CHROMIUM_BIN
        service = Service(_CHROMEDRIVER_BIN)
    else:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())

    driver = webdriver.Chrome(service=service, options=options)
    driver.set_page_load_timeout(30)   # sayfa yüklenme hard timeout
    driver.set_script_timeout(10)
    driver.execute_cdp_cmd(
        "Page.addScriptToEvaluateOnNewDocument",
        {"source": "Object.defineProperty(navigator,'webdriver',{get:()=>undefined})"},
    )
    return driver


def _run_selenium(tc_number: Optional[str], barcode: str) -> dict:
    # ── Giriş sanitizasyonu — ham değerler asla send_keys'e gitmez ──────────
    safe_barcode = _sanitize_barcode(barcode)
    safe_tc      = _sanitize_tc(tc_number) if tc_number else None

    if not safe_barcode:
        return {"valid": False, "details": "", "error": "Geçersiz barkod formatı."}

    driver = _build_driver()
    wait   = WebDriverWait(driver, 20)

    try:
        driver.get(VERIFY_URL)
        time.sleep(2)

        # ── Barkod alanı ─────────────────────────────────────────────────────
        barcode_input = None
        for by, sel in [
            (By.ID,          "barkod"),
            (By.ID,          "belgeNo"),
            (By.ID,          "belge-no"),
            (By.NAME,        "barkod"),
            (By.NAME,        "belgeNo"),
            (By.CSS_SELECTOR, "input[placeholder*='barkod' i]"),
            (By.CSS_SELECTOR, "input[placeholder*='belge' i]"),
            (By.CSS_SELECTOR, "input[type='text']"),
        ]:
            try:
                barcode_input = wait.until(EC.presence_of_element_located((by, sel)))
                break
            except TimeoutException:
                continue

        if barcode_input is None:
            return {"valid": False, "details": "", "error": "Giriş alanı bulunamadı."}

        barcode_input.clear()
        barcode_input.send_keys(safe_barcode)
        time.sleep(0.4)

        # ── TC alanı (opsiyonel) ──────────────────────────────────────────────
        if safe_tc:
            for by, sel in [
                (By.ID,          "tcKimlikNo"),
                (By.ID,          "tc"),
                (By.NAME,        "tcKimlikNo"),
                (By.CSS_SELECTOR, "input[placeholder*='kimlik' i]"),
                (By.CSS_SELECTOR, "input[placeholder*='TC' i]"),
            ]:
                try:
                    el = driver.find_element(by, sel)
                    el.clear()
                    el.send_keys(safe_tc)
                    break
                except NoSuchElementException:
                    continue

        # ── Submit ────────────────────────────────────────────────────────────
        submitted = False
        for by, sel in [
            (By.CSS_SELECTOR, "button[type='submit']"),
            (By.CSS_SELECTOR, "input[type='submit']"),
            (By.XPATH,        "//button[contains(normalize-space(),'Sorgula')]"),
            (By.XPATH,        "//button[contains(normalize-space(),'Doğrula')]"),
            (By.CSS_SELECTOR, "button.btn"),
        ]:
            try:
                driver.find_element(by, sel).click()
                submitted = True
                break
            except NoSuchElementException:
                continue

        if not submitted:
            return {"valid": False, "details": "", "error": "Doğrula butonu bulunamadı."}

        time.sleep(3)

        # ── Sonuç ─────────────────────────────────────────────────────────────
        page_text = driver.find_element(By.TAG_NAME, "body").text.lower()

        is_valid   = any(k in page_text for k in ["geçerli", "doğrulandı", "belge bilgileri", "belge onaylı", "kayıtlı"])
        is_invalid = any(k in page_text for k in ["geçersiz", "bulunamadı", "hatalı", "doğrulanamadı", "kayıt yok"])

        details = ""
        for by, sel in [
            (By.CSS_SELECTOR, ".belge-detay"),
            (By.CSS_SELECTOR, ".result"),
            (By.CSS_SELECTOR, ".sonuc"),
            (By.CSS_SELECTOR, "table"),
            (By.CSS_SELECTOR, ".alert"),
        ]:
            try:
                el = driver.find_element(by, sel)
                details = el.text.strip()
                if details:
                    break
            except NoSuchElementException:
                continue

        if not details:
            try:
                details = driver.find_element(By.TAG_NAME, "main").text.strip()
            except NoSuchElementException:
                details = page_text[:300]

        # Sonuç detay uzunluğunu sınırla
        details = details[:1000]

        if is_valid:
            return {"valid": True,  "details": details, "error": None}
        if is_invalid:
            return {"valid": False, "details": details, "error": None}
        return {"valid": None, "details": details, "error": "Sonuç yorumlanamadı."}

    except Exception:
        # İç hata detayı client'a sızmaz
        return {"valid": False, "details": "", "error": "Doğrulama sırasında bir hata oluştu."}
    finally:
        try:
            driver.quit()
        except Exception:
            pass


async def verify_document_stream(tc_number: Optional[str], barcode: str) -> AsyncGenerator[str, None]:
    def sse(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    yield sse({"step": "connecting",    "progress": 60, "message": "Doğrulama sitesine bağlanılıyor..."})
    await asyncio.sleep(0.2)
    yield sse({"step": "loading_page",  "progress": 70, "message": "Sayfa yükleniyor..."})
    await asyncio.sleep(0.2)
    yield sse({"step": "entering_code", "progress": 78, "message": "Belge kodu giriliyor..."})
    await asyncio.sleep(0.2)
    yield sse({"step": "submitting",    "progress": 85, "message": "Form gönderiliyor..."})

    loop = asyncio.get_event_loop()
    try:
        # Hard timeout: 90 saniye — askıda kalan Chrome session'ı öldür
        result = await asyncio.wait_for(
            loop.run_in_executor(_EXECUTOR, _run_selenium, tc_number, barcode),
            timeout=90,
        )
    except asyncio.TimeoutError:
        result = {"valid": False, "details": "", "error": "İstek zaman aşımına uğradı."}

    yield sse({"step": "reading_result", "progress": 95, "message": "Sonuç okunuyor..."})
    await asyncio.sleep(0.3)

    valid_label = (
        "GERÇEK"           if result["valid"] is True  else
        "SAHTE / GEÇERSİZ" if result["valid"] is False else
        "BELİRSİZ"
    )
    yield sse({
        "step": "complete",
        "progress": 100,
        "message": f"Tamamlandı — Belge {valid_label}",
        "result": {
            "valid":       result["valid"],
            "valid_label": valid_label,
            "details":     result["details"],
            "error":       result["error"],
        },
    })


async def verify_document(tc_number: Optional[str], barcode: str) -> dict:
    loop = asyncio.get_event_loop()
    try:
        result = await asyncio.wait_for(
            loop.run_in_executor(_EXECUTOR, _run_selenium, tc_number, barcode),
            timeout=90,
        )
    except asyncio.TimeoutError:
        result = {"valid": False, "details": "", "error": "İstek zaman aşımına uğradı."}

    valid_label = (
        "GERÇEK"           if result["valid"] is True  else
        "SAHTE / GEÇERSİZ" if result["valid"] is False else
        "BELİRSİZ"
    )
    return {
        "valid": result["valid"],
        "valid_label": valid_label,
        "details": result["details"],
        "error": result["error"],
    }
