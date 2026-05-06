const API_URL = "https://pwd-ai.onrender.com/api/check";

// =====================================
// INVALID URL DETECTION
// =====================================
function isRealWebsite(url) {

    try {

        const u = new URL(url);

        const hostname = u.hostname;

        // 🔵 Detect search pages
        if (
            url.includes("google.com/search") ||
            url.includes("?q=")
        ) {
            return false;
        }

        // 🔵 Must contain dot
        if (!hostname.includes(".")) {
            return false;
        }

        const parts = hostname.split(".");

        const tld = parts[parts.length - 1];

        // 🔵 Invalid TLD
        if (!/^[a-zA-Z]{2,}$/.test(tld)) {
            return false;
        }

        return true;

    } catch {

        return false;
    }
}

// =====================================
// TAB UPDATE LISTENER
// =====================================
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (
        changeInfo.status === "complete" &&
        tab.url
    ) {

        // Ignore internal browser pages
        if (
            tab.url.startsWith("chrome://") ||
            tab.url.startsWith("edge://") ||
            tab.url.startsWith("about:") ||
            tab.url.startsWith("file://")
        ) {
            return;
        }

        const url = tab.url;

        // =====================================
        // STEP 1 → INVALID URL
        // =====================================
        if (!isRealWebsite(url)) {

            chrome.storage.local.set({
                status: "invalid"
            });

            chrome.action.setIcon({
                path: {
                    "16": "icons/invalid.png",
                    "48": "icons/invalid.png",
                    "128": "icons/invalid.png"
                }
            });

            return;
        }

        // =====================================
        // STEP 2 → API CALL
        // =====================================
        fetch(API_URL, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                url: url
            })
        })

        .then(res => {

            if (!res.ok) {
                throw new Error("Server not reachable");
            }

            return res.json();
        })

        .then(data => {

            chrome.storage.local.set({
                status: data.result
            });

            // =====================================
            // 🚨 PHISHING
            // =====================================
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

            // =====================================
            // 🔵 INVALID
            // =====================================
            else if (data.result === "invalid") {

                chrome.action.setIcon({

                    path: {
                        "16": "icons/invalid.png",
                        "48": "icons/invalid.png",
                        "128": "icons/invalid.png"
                    }
                });
            }

            // =====================================
            // ✅ SAFE
            // =====================================
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

            // Fallback icon
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
