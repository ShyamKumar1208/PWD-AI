from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import joblib
import math
import os
import pandas as pd

from security_layer import *

app = Flask(__name__)
CORS(app)

# ================================
# LOAD MODEL
# ================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(BASE_DIR, "advanced_phishing_model.sav")

try:
    model = joblib.load(model_path)
except:
    model = None
    print("⚠️ Model not loaded")

# ================================
# FEATURE FUNCTIONS
# ================================
def entropy(text):
    if len(text) == 0:
        return 0
    prob = [text.count(c)/len(text) for c in set(text)]
    return -sum([p * math.log2(p) for p in prob])


def extract_features(url):
    return [
        len(url),
        url.count('.'),
        url.count('-'),
        url.count('@'),
        int("https" in url),
        sum(c.isdigit() for c in url),
        entropy(url)
    ]

# ================================
# 🔥 URL HIGHLIGHT FUNCTION
# ================================
def highlight_url(url):
    highlighted = ""
    i = 0
    suspicious_words = ["login", "secure", "verify", "update"]

    while i < len(url):
        c = url[i]

        if c.isdigit():
            highlighted += f"<span style='color:red'>{c}</span>"
            i += 1
            continue

        if c in ["@", "-"]:
            highlighted += f"<span style='color:red;font-weight:bold'>{c}</span>"
            i += 1
            continue

        matched = False
        for word in suspicious_words:
            if url[i:i+len(word)].lower() == word:
                highlighted += f"<span style='color:red;font-weight:bold'>{url[i:i+len(word)]}</span>"
                i += len(word)
                matched = True
                break

        if matched:
            continue

        highlighted += c
        i += 1

    return highlighted

# ================================
# ROUTES
# ================================
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/predict", methods=["POST"])
def predict():
    try:
        url = request.form.get("url", "").strip()

        if not url:
            return render_template("index.html", prediction_text="⚠️ Please enter a URL")

        if not url.startswith("http"):
            url = "https://" + url

        domain = extract_domain(url)

        # ================================
        # ML
        # ================================
        feature_names = ["length", "dots", "hyphens", "at", "https", "digits", "entropy"]
        features = extract_features(url)
        features_df = pd.DataFrame([features], columns=feature_names)

        ml_prob = 0.5
        ml_pred = 0

        if model:
            try:
                ml_prob = model.predict_proba(features_df)[0][1]
                ml_pred = model.predict(features_df)[0]
            except Exception as e:
                print("ML error:", e)

        # ================================
        # DNS + SSL
        # ================================
        dns = check_dns(domain)
        ssl_status = check_ssl(url)

        # ================================
        # DECISION
        # ================================
        reasons = []

        if is_invalid_domain(domain):
            prediction = "⚠️ Invalid URL"
            risk_score = 30
            reasons.append("Invalid domain format")

        elif has_credentials(url):
            prediction = "🚨 Credential Injection Attack"
            risk_score = 95
            reasons.append("Contains '@' symbol")

        elif is_trusted_domain(domain):
            prediction = "🟢 Legitimate Website"
            risk_score = 5
            reasons.append("Trusted domain")

        elif is_brand_attack(domain):
            prediction = "🚨 Brand Impersonation"
            risk_score = 98
            reasons.append("Looks like a known brand")

        elif is_suspicious_domain(domain):
            prediction = "⚠️ Suspicious Website"
            risk_score = 70
            reasons.append("Suspicious keywords found")

        else:
            if ml_pred == 1:
                prediction = "🚨 Phishing Website (ML)"
                risk_score = round(ml_prob * 100, 2)
                reasons.append("ML model detected phishing pattern")
            else:
                prediction = "🟢 Legitimate Website"
                risk_score = round((1 - ml_prob) * 20, 2)
                reasons.append("ML classified safe")

        highlighted_url = highlight_url(url)

        screenshot = None
        try:
            if not is_invalid_domain(domain) and dns:
                screenshot = get_screenshot_url(url)
        except:
            screenshot = None

        return render_template(
            "index.html",
            prediction_text=prediction,
            url=url,
            highlighted_url=highlighted_url,
            confidence=risk_score,
            reasons=reasons,
            dns=dns,
            ssl=ssl_status,
            screenshot=screenshot
        )

    except Exception as e:
        print("ERROR:", e)
        return render_template(
            "index.html",
            prediction_text="❌ Internal Server Error"
        )


# ================================
# 🔥 NEW API FOR CHROME EXTENSION
# ================================
@app.route("/api/check", methods=["POST"])
def api_check():
    try:
        data = request.get_json()
        url = data.get("url", "").strip()

        if not url:
            return jsonify({"result": 0})

        if not url.startswith("http"):
            url = "https://" + url

        domain = extract_domain(url)

        # 🔥 SAME LOGIC (LIGHTWEIGHT)
        if is_invalid_domain(domain):
            return jsonify({"result": 1})

        if has_credentials(url):
            return jsonify({"result": 1})

        if is_brand_attack(domain):
            return jsonify({"result": 1})

        if is_suspicious_domain(domain):
            return jsonify({"result": 1})

        return jsonify({"result": 0})

    except Exception as e:
        print("API ERROR:", e)
        return jsonify({"result": 0})


# ================================
# RUN
# ================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)