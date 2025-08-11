// Frontend/background.js

// URL API Backend Anda.
const API_ENDPOINT = "https://107.21.175.82/predict";

// Fungsi ini akan disuntikkan ke halaman web untuk mengambil teks artikel menggunakan Readability.js
function parseArticleWithReadability() {
    if (typeof Readability === 'undefined') {
        return { error: "Readability library not loaded." };
    }
    const documentClone = document.cloneNode(true);
    const article = new Readability(documentClone).parse();
    return article;
}

// Mengirim teks dan judul ke API backend
async function fetchPrediction(text, title) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Mengirim 'text' dan 'title' sesuai kebutuhan backend
            body: JSON.stringify({ text, title }),
            signal: AbortSignal.timeout(15000) // Timeout 60 detik
        });
        
        const result = await response.json();
        return result; 

    } catch (error) {
        console.error("Error calling prediction API:", error);
        if (error.name === 'TimeoutError') {
             return { error_code: "TIMEOUT_ERROR", message: "Server tidak merespons dalam 60 detik. Coba lagi nanti." };
        }
        return { error_code: "CONNECTION_ERROR", message: "Tidak dapat terhubung ke server. Pastikan server backend berjalan." };
    }
}

// Listener utama untuk pesan dari popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "detectHoax") {

        const tabUrl = request.tabUrl;
        
        if (!tabUrl) {
            sendResponse({ error_code: "URL_NOT_FOUND", message: "URL tidak ditemukan dalam permintaan." });
            return true;
        }

        try {
            const url = new URL(tabUrl);
            const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);

            if (pathSegments.length < 2) {
                sendResponse({ error_code: "NOT_NEWS", message: "Halaman ini sepertinya bukan halaman berita." });
                return true;
            }
        } catch (e) {
            sendResponse({ error_code: "INVALID_URL", message: "URL halaman tidak valid." });
            return true;
        }

        chrome.scripting.executeScript({
            target: { tabId: request.tabId },
            files: ["Readability.js"],
        }).then(() => {
            chrome.scripting.executeScript({
                target: { tabId: request.tabId },
                function: parseArticleWithReadability
            }, async (injectionResults) => {
                if (chrome.runtime.lastError || !injectionResults || !injectionResults[0] || !injectionResults[0].result) {
                    sendResponse({ error_code: "EXTRACTION_FAILED", message: "Gagal mengekstrak konten artikel dari halaman ini." });
                    return;
                }
                
                const article = injectionResults[0].result;

                if (!article || !article.textContent || article.textContent.trim().length < 250) {
                    sendResponse({ error_code: "NOT_NEWS", message: "Konten tidak terdeteksi sebagai artikel berita atau teks terlalu pendek." });
                    return;
                }

                // Mengirim konten teks dan judul artikel untuk dianalisis
                const result = await fetchPrediction(article.textContent, article.title);
                
                // Memeriksa apakah ada hasil prediksi yang sukses
                if (result.prediction) {
                    const finalResult = {
                        prediction: result.prediction,
                        title: article.title,
                        excerpt: article.excerpt,
                        url: request.tabUrl 
                    };
                    chrome.storage.local.set({ lastResult: finalResult });
                    sendResponse(finalResult);
                } else {
                    // Meneruskan error dari API atau dari koneksi
                    sendResponse(result); 
                }
            });
        }).catch(err => {
            console.error("Gagal menyuntikkan skrip Readability.js:", err);
            sendResponse({ error_code: "SCRIPT_INJECTION_FAILED", message: "Gagal memuat komponen analisis. Coba muat ulang halaman." });
        });

        return true;
    }
});