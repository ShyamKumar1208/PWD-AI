import socket
import ssl
from urllib.parse import urlparse
from difflib import SequenceMatcher

TRUSTED_DOMAINS = [
    "google.com", "facebook.com", "amazon.com",
    "youtube.com", "yahoo.com", "linkedin.com",
    "dituniversity.edu.in","microsoft.com"
]

KNOWN_BRANDS = [
    "google", "facebook", "amazon",
    "paypal", "microsoft", "apple", "yahoo"
]

def extract_domain(url):
    parsed = urlparse(url)
    netloc = parsed.netloc

    if "@" in netloc:
        netloc = netloc.split("@")[-1]

    return netloc.replace("www.", "")

def is_invalid_domain(domain):
    return "." not in domain

def has_credentials(url):
    return "@" in url

def is_trusted_domain(domain):
    return any(domain == t or domain.endswith("." + t) for t in TRUSTED_DOMAINS)

def normalize(text):
    return text.replace("0", "o").replace("1", "l")

def is_brand_attack(domain):
    name = domain.split(".")[0]
    clean = normalize(name)

    for brand in KNOWN_BRANDS:
        if clean == brand and name != brand:
            return True

        similarity = SequenceMatcher(None, clean, brand).ratio()
        if similarity > 0.85:
            return True

    return False

def is_suspicious_domain(domain):
    words = ["login", "secure", "verify"]
    return any(w in domain for w in words)

# 🔥 DNS CHECK
def check_dns(domain):
    try:
        socket.gethostbyname(domain)
        return True
    except:
        return False

# 🔥 SSL CHECK
def check_ssl(url):
    try:
        if not url.startswith("https"):
            return False

        parsed = urlparse(url)
        hostname = parsed.netloc

        context = ssl.create_default_context()
        with socket.create_connection((hostname, 443), timeout=3) as sock:
            with context.wrap_socket(sock, server_hostname=hostname):
                return True
    except:
        return False

# 🔥 SCREENSHOT
def get_screenshot_url(url):
    return f"https://image.thum.io/get/{url}"
