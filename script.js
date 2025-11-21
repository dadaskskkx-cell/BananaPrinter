document.addEventListener('DOMContentLoaded', () => {
    const magicBtn = document.getElementById('magicBtn');
    const cardWrapper = document.getElementById('cardWrapper');
    const statusText = document.getElementById('statusText');

    const inputCard = document.getElementById('inputCard');
    const fileInput = document.getElementById('fileInput');
    const inputImage = document.getElementById('inputImage');
    const outputImage = document.getElementById('outputImage');
    const downloadBtn = document.getElementById('downloadBtn');

    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const saveKeyBtn = document.getElementById('saveKeyBtn');

    const apiUrlInput = document.getElementById('apiUrlInput');
    const modelIdInput = document.getElementById('modelIdInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const promptInput = document.getElementById('promptInput');
    const strengthInput = document.getElementById('strengthInput');
    const strengthValue = document.getElementById('strengthValue');

    let isGenerated = false;
    let isProcessing = false;

    let config = {
        apiUrl: localStorage.getItem('banana_api_url') || apiUrlInput.value,
        modelId: localStorage.getItem('banana_model_id') || modelIdInput.value,
        apiKey: localStorage.getItem('banana_api_key') || apiKeyInput.value,
        prompt: localStorage.getItem('banana_prompt') || (promptInput ? promptInput.value : ""),
        strength: localStorage.getItem('banana_strength') || (strengthInput ? strengthInput.value : 0.45),
        visionModelId: "ep-20251121184116-ppvw5",
        visionApiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    };

    apiUrlInput.value = config.apiUrl;
    modelIdInput.value = config.modelId;
    apiKeyInput.value = config.apiKey;
    if (promptInput) promptInput.value = config.prompt;
    if (strengthInput) {
        strengthInput.value = config.strength;
        if (strengthValue) strengthValue.innerText = config.strength;
    }

    settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('open');
    });

    if (strengthInput) {
        strengthInput.addEventListener('input', (e) => {
            if (strengthValue) strengthValue.innerText = e.target.value;
        });
    }

    saveKeyBtn.addEventListener('click', () => {
        config.apiUrl = apiUrlInput.value.trim();
        config.modelId = modelIdInput.value.trim();
        config.apiKey = apiKeyInput.value.trim();
        config.prompt = promptInput ? promptInput.value.trim() : "";
        config.strength = strengthInput ? strengthInput.value : 0.45;

        localStorage.setItem('banana_api_url', config.apiUrl);
        localStorage.setItem('banana_model_id', config.modelId);
        localStorage.setItem('banana_api_key', config.apiKey);
        localStorage.setItem('banana_prompt', config.prompt);
        localStorage.setItem('banana_strength', config.strength);

        settingsPanel.classList.remove('open');
        alert("Settings Saved!");
    });

    inputCard.addEventListener('click', () => {
        if (isGenerated || isProcessing) return;
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                inputImage.src = e.target.result;
                statusText.innerText = "Ready to Transform!";
            };
            reader.readAsDataURL(file);
        }
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            try {
                statusText.innerText = "Downloading...";
                const imageUrl = outputImage.src;

                if (imageUrl.startsWith('data:')) {
                    const a = document.createElement('a');
                    a.href = imageUrl;
                    a.download = `bananaprinter_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else {
                    const response = await fetch('/api/download?url=' + encodeURIComponent(imageUrl));
                    if (!response.ok) throw new Error('Download failed');

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `bananaprinter_${Date.now()}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }

                statusText.innerText = "Saved! 🎉";
                setTimeout(() => {
                    statusText.innerText = "It's Real!";
                }, 2000);
            } catch (error) {
                console.error('Download failed:', error);
                statusText.innerText = "It's Real!";
                alert('Download failed. Please right-click the image and select "Save Image As..."');
            }
        });
    }

    magicBtn.addEventListener('click', () => {
        if (isProcessing) return;

        if (!isGenerated) {
            if (config.apiKey) {
                startCloudGeneration();
            } else {
                startDemoGeneration();
            }
        } else {
            resetApp();
        }
    });

    function startDemoGeneration() {
        isProcessing = true;
        magicBtn.classList.add('loading');
        statusText.innerText = "Creating Magic (Demo)...";
        cardWrapper.classList.add('scanning');

        setTimeout(() => {
            finishGeneration('giftbox.png');
        }, 2500);
    }

    async function startCloudGeneration() {
        isProcessing = true;
        magicBtn.classList.add('loading');
        cardWrapper.classList.add('scanning');

        try {
            statusText.innerText = "AI is looking at your photo...";
            const imageDescription = await analyzeImageWithVision();

            statusText.innerText = "Creating your 3D character...";
            const resultUrl = await generateImageFromDescription(imageDescription);

            finishGeneration(resultUrl);

        } catch (error) {
            console.error(error);
            alert("Generation Error: " + error.message + "\n\nTip: Make sure you are running 'start.bat'!");
            isProcessing = false;
            magicBtn.classList.remove('loading');
            cardWrapper.classList.remove('scanning');
            statusText.innerText = "Error. Try again.";
        }
    }

    async function analyzeImageWithVision() {
        const proxyUrl = '/api/proxy';
        const base64Image = inputImage.src.split(',')[1];

        const visionPayload = {
            model: config.visionModelId,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Please describe this person in detail: their appearance, clothing, hairstyle, pose, and any distinctive features. Be specific and concise. Focus on visual details that would help recreate this person as a 3D character."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`
                            }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_url: config.visionApiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: visionPayload
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Vision API Error");
        }

        const data = await response.json();

        if (data.choices && data.choices.length > 0) {
            return data.choices[0].message.content;
        } else {
            throw new Error("No description returned from Vision API");
        }
    }

    async function generateImageFromDescription(description) {
        const proxyUrl = '/api/proxy';
        const finalPrompt = `${config.prompt}. Character description: ${description}`;

        const genPayload = {
            model: config.modelId,
            prompt: finalPrompt,
            size: "1024x1024"
        };

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                target_url: config.apiUrl,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: genPayload
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Image Generation API Error");
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
            return data.data[0].url;
        } else {
            throw new Error("No image data in response");
        }
    }

    function finishGeneration(imageSrc) {
        outputImage.src = imageSrc;

        cardWrapper.classList.remove('scanning');
        magicBtn.classList.remove('loading');
        cardWrapper.classList.add('generated');
        statusText.innerText = "It's Real!";

        if (downloadBtn) downloadBtn.style.display = 'flex';

        isGenerated = true;
        isProcessing = false;
    }

    function resetApp() {
        cardWrapper.classList.remove('generated');
        statusText.innerText = "Ready to Create";
        if (downloadBtn) downloadBtn.style.display = 'none';
        isGenerated = false;
    }
});
