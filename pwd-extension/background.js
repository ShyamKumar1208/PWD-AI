const API_URL = "https://4fc4-2409-40d2-3009-68bd-9969-89df-4fb0-91b9.ngrok-free.app/api/check";

function isRealWebsite(url) {
    try {
        const u = new URL(url);
        const hostname = u.hostname;

        if (
            hostname.includes("google.com") ||
            hostname.includes("bing.com") ||
            hostname.includes("yahoo.com")
        ) {
            return false;
        }

        if (!hostname.includes(".")) return false;

        const parts = hostname.split(".");
        const tld = parts[parts.length - 1];

        if (!/^[a-zA-Z]{2,}$/.test(tld)) return false;

        return true;

    } catch {
        return false;
    }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {

    if (changeInfo.status === "complete" && tab.url) {

        if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
            return;
        }

        // 🔵 INVALID CASE
        if (!isRealWebsite(tab.url)) {

            chrome.storage.local.set({ status: "invalid" });

            chrome.action.setIcon({ path: "icons/invalid.png" });

            return;
        }

        // 🔥 NORMAL FLOW
        fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: tab.url })
        })
        .then(res => res.json())
        .then(data => {

            chrome.storage.local.set({ status: data.result });

            if (data.result === 1) {

                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icons/danger.png",
                    title: "⚠️ Phishing Alert",
                    message: "This website may be dangerous!"
                });

                chrome.action.setIcon({ path: "icons/danger.png" });

            } else {
                chrome.action.setIcon({ path: "icons/safe.png" });
            }
        })
        .catch(err => {
            console.log("API ERROR:", err);
        });
    }
});