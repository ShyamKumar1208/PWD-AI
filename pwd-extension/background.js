const API_URL = "https://pwd-ai.onrender.com/api/check";

// ✅ FIXED URL VALIDATION
function isRealWebsite(url) {
    try {
        const u = new URL(url);
        const hostname = u.hostname;

        // Must contain at least one dot
        if (!hostname.includes(".")) return false;

        const parts = hostname.split(".");
        const tld = parts[parts.length - 1];

        // TLD must be valid (com, org, etc.)
        if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

        return true;

    } catch {
        return false;
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.status === "complete" && tab.url) {

        // Ignore internal browser pages
        if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:") ||
            tab.url.startsWith("file://")
        ) {
            return;
        }

        // 🔵 INVALID URL CASE
        if (!isRealWebsite(tab.url)) {

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

        // 🔥 API CALL
        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: tab.url })
        })

        // ✅ FIX: Handle bad responses properly
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

        // ❌ ERROR HANDLING
        .catch(err => {

            console.log("API ERROR:", err);

            // fallback icon (optional)
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
