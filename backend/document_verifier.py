import os
import re
import sys
import time
import asyncio
import json
import unicodedata
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
_HEADLESS = os.getenv("SELENIUM_HEADLESS", "true").lower() not in {"0", "false", "no", "off"}

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


def _normalize_page_text(value: str) -> str:
    value = value.casefold().replace("ı", "i")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", value).strip()


def _has_any_marker(normalized_text: str, markers: list[str]) -> bool:
    return any(_normalize_page_text(marker) in normalized_text for marker in markers)


def _is_final_document_page(driver: webdriver.Chrome, normalized_text: str) -> bool:
    if _has_any_marker(normalized_text, _FINAL_SUCCESS_MARKERS):
        return True

    selectors = [
        ".contentToolbar a.download[href*='belge=goster']",
        ".contentToolbar a.download",
        ".reminderContainer",
    ]
    for selector in selectors:
        for el in driver.find_elements(By.CSS_SELECTOR, selector):
            try:
                if el.is_displayed():
                    return True
            except Exception:
                continue

    source = _normalize_page_text(driver.page_source)
    if "belge=goster" in source and (
        "contenttoolbar" in source
        or "download" in source
        or "dosyayi indir" in source
    ):
        return True
    if "remindercontainer" in source and _has_any_marker(source, _FINAL_SUCCESS_MARKERS):
        return True

    return False


_FINAL_SUCCESS_MARKERS = [
    "dosyayı indir",
    "doğrudan yazdırmayınız",
    "bu sayfayı doğrudan yazdırmayınız",
    "belgenin çıktısını almak için",
]
_SUCCESS_MARKERS = [
    *_FINAL_SUCCESS_MARKERS,
    "belge onaylı",
    "doğrulandı",
]
_INVALID_MARKERS = [
    "kayıt bulunmadı",
    "kayıt yok",
    "geçersiz",
    "bulunamadı",
    "bulunmadı",
    "hatalı",
    "doğrulanamadı",
]
_RESULT_STOP_MARKERS = [
    *_SUCCESS_MARKERS,
    *_INVALID_MARKERS,
]


def _visible_enabled(driver: webdriver.Chrome, by: By, selector: str):
    for el in driver.find_elements(by, selector):
        try:
            if el.is_displayed() and el.is_enabled():
                return el
        except Exception:
            continue
    return None


def _fill_input(driver: webdriver.Chrome, wait: WebDriverWait, selectors: list[tuple[By, str]], value: str):
    el = None
    deadline = time.time() + 8
    while time.time() < deadline and el is None:
        for by, selector in selectors:
            el = _visible_enabled(driver, by, selector)
            if el is not None:
                break
        if el is None:
            time.sleep(0.2)

    if el is None:
        return False

    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
    time.sleep(0.2)
    try:
        el.click()
        el.clear()
        el.send_keys(value)
        driver.execute_script(
            """
            const input = arguments[0];
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            """,
            el,
        )
    except Exception:
        driver.execute_script(
            """
            const input = arguments[0];
            const value = arguments[1];
            input.focus();
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.blur();
            """,
            el,
            value,
        )
    return True


def _click_submit(driver: webdriver.Chrome, wait: WebDriverWait) -> bool:
    for by, selector in [
        (By.CSS_SELECTOR, "form.serviceForm input.submitButton"),
        (By.CSS_SELECTOR, "form.serviceForm input[data-submit='true']"),
        (By.CSS_SELECTOR, "form.serviceForm button[type='submit']"),
        (By.XPATH, "//form[contains(@class,'serviceForm')]//*[self::button or self::input][contains(normalize-space(@value),'Devam') or contains(normalize-space(.),'Devam')]"),
        (By.XPATH, "//form[contains(@class,'serviceForm')]//*[self::button or self::input][contains(normalize-space(@value),'Sorgula') or contains(normalize-space(.),'Sorgula') or contains(normalize-space(@value),'Doğrula') or contains(normalize-space(.),'Doğrula')]"),
    ]:
        try:
            wait.until(EC.presence_of_element_located((by, selector)))
        except TimeoutException:
            continue

        el = _visible_enabled(driver, by, selector)
        if el is None:
            continue

        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", el)
        time.sleep(0.2)
        try:
            el.click()
        except Exception:
            driver.execute_script("arguments[0].click();", el)
        return True

    return False


def _accept_agreement(driver: webdriver.Chrome) -> bool:
    accepted = False
    selectors = [
        (By.NAME, "chkOnay"),
        (By.CSS_SELECTOR, "form.serviceForm input[type='checkbox']"),
        (By.CSS_SELECTOR, "form.serviceForm input.radioButton"),
        (By.XPATH, "//label[contains(normalize-space(),'okudum') or contains(normalize-space(),'kabul ediyorum')]//input"),
    ]

    for by, selector in selectors:
        for checkbox in driver.find_elements(by, selector):
            try:
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", checkbox)
                time.sleep(0.1)
                driver.execute_script(
                    """
                    const checkbox = arguments[0];
                    if (!checkbox.checked) {
                      checkbox.click();
                    }
                    checkbox.checked = true;
                    checkbox.dispatchEvent(new Event('input', { bubbles: true }));
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    """,
                    checkbox,
                )
                accepted = True
            except Exception:
                continue

    if accepted:
        return True

    for label in driver.find_elements(
        By.XPATH,
        "//label[contains(normalize-space(),'okudum') or contains(normalize-space(),'kabul ediyorum')]",
    ):
        try:
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", label)
            time.sleep(0.1)
            label.click()
            return True
        except Exception:
            continue

    return False


def _build_driver() -> webdriver.Chrome:
    options = Options()
    if _HEADLESS:
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

        barcode_filled = _fill_input(driver, wait, [
            (By.ID, "sorgulananBarkod"),
            (By.NAME, "sorgulananBarkod"),
            (By.CSS_SELECTOR, "form.serviceForm input[edl-mob='barkodInput']"),
            (By.CSS_SELECTOR, "form.serviceForm input[name*='Barkod' i]"),
            (By.XPATH, "//label[contains(normalize-space(),'Barkod')]/following::input[1]"),
            (By.CSS_SELECTOR, "form.serviceForm input.text"),
        ], safe_barcode)

        if not barcode_filled:
            return {"valid": False, "details": "", "error": "Barkod giriş alanı bulunamadı."}
        time.sleep(0.4)

        if not _click_submit(driver, wait):
            return {"valid": False, "details": "", "error": "Devam butonu bulunamadı."}

        time.sleep(1.5)

        # ── Sonraki adımlar: TC alanı ve olası onay ekranları ────────────────
        for _ in range(3):
            body_text = _normalize_page_text(driver.find_element(By.TAG_NAME, "body").text)
            if _is_final_document_page(driver, body_text):
                break
            if _has_any_marker(body_text, _RESULT_STOP_MARKERS):
                break

            advanced = False
            if safe_tc and any(k in body_text for k in ["kimlik", "t.c", "tc"]):
                advanced = _fill_input(driver, wait, [
                    (By.ID, "ikinciAlan"),
                    (By.NAME, "ikinciAlan"),
                    (By.CSS_SELECTOR, "form.serviceForm input[data-type-id='6']"),
                    (By.CSS_SELECTOR, "form.serviceForm input[pattern='^[0-9]{11}$']"),
                    (By.CSS_SELECTOR, "form.serviceForm input[placeholder*='11111111117']"),
                    (By.ID, "sorgulananTCKimlikNo"),
                    (By.ID, "tcKimlikNo"),
                    (By.NAME, "sorgulananTCKimlikNo"),
                    (By.NAME, "tcKimlikNo"),
                    (By.CSS_SELECTOR, "form.serviceForm input[name*='Kimlik' i]"),
                    (By.CSS_SELECTOR, "form.serviceForm input[id*='Kimlik' i]"),
                    (By.XPATH, "//label[contains(normalize-space(),'Kimlik') or contains(normalize-space(),'T.C') or contains(normalize-space(),'TC')]/following::input[1]"),
                ], safe_tc)
                time.sleep(0.3)

            if any(k in body_text for k in ["okudum", "kabul ediyorum", "bilgilendirme ve onay", "chkOnay".lower()]):
                if _accept_agreement(driver):
                    advanced = True
                    time.sleep(0.3)

            if _click_submit(driver, wait):
                advanced = True
                time.sleep(2)

            if not advanced:
                break

        # ── Sonuç ─────────────────────────────────────────────────────────────
        page_text = _normalize_page_text(driver.find_element(By.TAG_NAME, "body").text)

        has_final_success = _is_final_document_page(driver, page_text)
        is_valid = has_final_success or _has_any_marker(page_text, _SUCCESS_MARKERS)
        is_invalid = _has_any_marker(page_text, _INVALID_MARKERS)

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

        if has_final_success or (is_valid and not is_invalid):
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
