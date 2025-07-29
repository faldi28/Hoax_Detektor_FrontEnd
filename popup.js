// Frontend/popup.js
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const detectButton = document.getElementById('detect-btn');
    const resultCard = document.getElementById('result');
    const resultTitle = document.getElementById('result-title');
    const resultText = document.getElementById('result-text');
    const resultSVG = document.getElementById('result-svg');
    const buttonText = document.querySelector('.button-text');
    const buttonLoader = document.querySelector('.button-loader');
    const description = document.querySelector('.description');
    const feedbackButton = document.getElementById('feedback-btn');
    const comingSoonText = document.getElementById('coming-soon');

    function updatePopup(state, data = {}) {
        description.classList.add('hidden');
        resultCard.classList.remove('hidden');
        resultCard.className = 'result-card';

        const states = {
            loading: {
                class: 'result-loading',
                title: 'Menganalisis...',
                svg: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#F1C40F"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></animateTransform>`,
                message: 'Memindai konten halaman...',
                btnText: 'Memproses...',
                btnDisabled: true
            },
            valid: {
                class: 'result-valid',
                title: 'BERITA VALID',
                svg: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#2ECC71"/>`,
                message: 'Berdasarkan analisis, konten ini diklasifikasikan sebagai <b>berita valid</b>.',
                btnText: 'Analisis Ulang',
                btnDisabled: false
            },
            hoax: {
                class: 'result-hoax',
                title: 'BERITA HOAX',
                svg: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#E74C3C"/>`,
                message: 'Berdasarkan analisis, konten ini diklasifikasikan sebagai <b>berita hoax</b>.',
                btnText: 'Analisis Ulang',
                btnDisabled: false
            },
            error: {
                class: 'result-error',
                title: 'ANALISIS GAGAL',
                svg: `<path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#F1C40F"/>`,
                message: data.message || 'Terjadi kesalahan yang tidak diketahui.',
                btnText: 'Coba Lagi',
                btnDisabled: false
            },
            undefined: {
                class: 'result-undefined',
                title: 'ANALISIS TIDAK DIDUKUNG',
                svg: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#95A5A6"/>`,
                message: 'Halaman dari server lokal atau file di komputer tidak dapat dianalisis.',
                btnText: 'Coba Halaman Lain',
                btnDisabled: false
            },
            not_news: {
                class: 'result-undefined',
                title: 'KONTEN BUKAN BERITA',
                svg: `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="#95A5A6"/>`,
                message: data.message || 'Konten pada halaman ini tidak dapat dideteksi sebagai artikel berita.',
                btnText: 'Coba Halaman Lain',
                btnDisabled: false
            },
            not_indonesian: {
                class: 'result-error',
                title: 'BAHASA TIDAK DIDUKUNG',
                svg: `<path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" fill="#F1C40F"/>`,
                message: data.message || 'Ekstensi ini hanya dapat menganalisis berita dalam Bahasa Indonesia.',
                btnText: 'Coba Halaman Lain',
                btnDisabled: false
            },
            initial: {}
        };

        const s = states[state];
        if (s) {
            if (state === 'initial') {
                resultCard.classList.add('hidden');
                description.classList.remove('hidden');
                buttonLoader.style.display = 'none';
                buttonText.textContent = 'Analisis Halaman Ini';
                detectButton.disabled = false;
            } else {
                resultCard.classList.add(s.class);
                resultTitle.textContent = s.title;
                resultSVG.innerHTML = s.svg;
                resultText.innerHTML = s.message;
                
                buttonLoader.style.display = s.btnDisabled ? 'inline-block' : 'none';
                buttonText.textContent = s.btnText;
                detectButton.disabled = s.btnDisabled;
            }
        }
    }
    
    const initializePopup = async () => {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.storage.local.get(['lastResult'], (data) => {
            if (data.lastResult && data.lastResult.url === currentTab.url) {
                const { lastResult } = data;
                if (lastResult.prediction) {
                    const prediction = lastResult.prediction.toLowerCase();
                    const message = `Hasil terakhir untuk halaman ini. Klik tombol untuk analisis ulang.`;
                    updatePopup(prediction, { message });
                } else {
                    updatePopup('initial');
                }
            } else {
                updatePopup('initial');
            }
        });
    };

    initializePopup();

    detectButton.addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("chrome-extension://")) {
            updatePopup('error', { message: 'Tidak dapat menganalisis halaman internal Chrome.' });
            return;
        }

        if (tab.url?.startsWith("file:///") || tab.url?.startsWith("http://localhost") || tab.url?.startsWith("http://127.0.0.1")) {
            updatePopup('undefined');
            return;
        }

        updatePopup('loading');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: "detectHoax",
                tabId: tab.id,
                tabUrl: tab.url
            });

            if (chrome.runtime.lastError) {
                updatePopup('error', { message: 'Gagal berkomunikasi dengan background script. Coba muat ulang ekstensi.' });
                return;
            }

            if (response.error_code) {
                if (response.error_code === "NOT_INDONESIAN") {
                    updatePopup('not_indonesian', { message: response.message });
                } else if (response.error_code === "NOT_NEWS" || response.error_code === "TEXT_TOO_SHORT") {
                    updatePopup('not_news', { message: response.message });
                } else {
                    updatePopup('error', { message: response.message });
                }
            } else if (response.prediction) {
                const prediction = response.prediction.toLowerCase();
                updatePopup(prediction);
            } else {
                updatePopup('error', { message: 'Menerima respons tidak terduga dari server.' });
            }

        } catch (error) {
            console.error("Popup Error:", error);
            updatePopup('error', { message: `Gagal terhubung ke background script.` });
        }
    });

    feedbackButton.addEventListener('click', () => {
        comingSoonText.classList.remove('hidden');
    });
});