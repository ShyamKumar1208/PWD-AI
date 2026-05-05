const API_URL = "https://pwd-ai.onrender.com/api/check";

// 🔥 Known trusted domains (for typo detection)
const TRUSTED_DOMAINS = [
    "google.com",
    "facebook.com",
    "amazon.com",
    "paypal.com",
    "microsoft.com",
    "apple.com",
    "yahoo.com",
    "bing.com"
];

// 🔥 Detect invalid / search URLs
function isRealWebsite(url) {
    try {
        const u = new URL(url);
        const hostname = u.hostname;

        // ❌ Detect search queries
        if (url.includes("google.com/search") || url.includes("?q=")) {
            return false;
        }

        // ❌ No dot = invalid
        if (!hostname.includes(".")) return false;

        const parts = hostname.split(".");
        const tld = parts[parts.length - 1];

        // ❌ Invalid TLD
        if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

        // ❌ Too short
        if (parts.length < 2) return false;

        return true;

    } catch {
        return false;
    }
}

// 🔥 Detect typo domains (FAST local detection)
function isTypoDomain(hostname) {
    hostname = hostname.toLowerCase();

    return TRUSTED_DOMAINS.some(domain => {
        // Example: yah00.com vs yahoo.com
        const clean = hostname.replace(/0/g, "o").replace(/1/g, "l");

        return clean.includes(domain) && hostname !== domain;
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.status === "complete" && tab.url) {

        // Ignore browser internal pages
        if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:") ||
            tab.url.startsWith("file://")
        ) {
            return;
        }

        const url = tab.url;
        let hostname = "";

        try {
            hostname = new URL(url).hostname;
        } catch {
            hostname = "";
        }

        // 🔵 INVALID URL
        if (!isRealWebsite(url)) {

            chrome.storage.local.set({ status: "invalid" });

            chrome.action.setIcon({
                path: {
                    "16": "icons/invalid.png",
                    "48": "icons/invalid.png",
                    "128": "icons/invalid.png"
                }
            });

            return;
        }

        // 🔴 FAST TYPO DETECTION (no API call)
        if (isTypoDomain(hostname)) {

            chrome.storage.local.set({ status: 1 });

            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/danger.png",
                title: "⚠️ Suspicious Domain",
                message: "This looks like a fake version of a trusted website!"
            });

            chrome.action.setIcon({
                path: {
                    "16": "icons/danger.png",
                    "48": "icons/danger.png",
                    "128": "icons/danger.png"
                }
            });

            return;
        }

        // 🔥 API CALL (FINAL CHECK)
        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: url })
        })

        .then(res => {
            if (!res.ok) {
                throw new Error("Server not reachable");
            }
            return res.json();
        })

        .then(data => {

            chrome.storage.local.set({ status: data.result });

            // 🚨 PHISHING
            if (data.result === 1) {

                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/danger.png",
                    title: "⚠️ Phishing Alert",
                    message: "This website may be dangerous!"
                });

                chrome.action.setIcon({
                    path: {
                        "16": "icons/danger.png",
                        "48": "icons/danger.png",
                        "128": "icons/danger.png"
                    }
                });

            } 
            // ✅ SAFE
            else {

                chrome.action.setIcon({
                    path: {
                        "16": "icons/safe.png",
                        "48": "icons/safe.png",
                        "128": "icons/safe.png"
                    }
                });
            }
        })

        .catch(err => {

            console.log("API ERROR:", err);

            // fallback (optional)
            chrome.action.setIcon({
                path: {
                    "16": "icons/invalid.png",
                    "48": "icons/invalid.png",
                    "128": "icons/invalid.png"
                }
            });
        });
    }
});
