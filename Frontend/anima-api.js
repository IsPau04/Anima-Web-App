/* Frontend/anima-api.js */
/* global React, ReactDOM */
(function () {
  const API_BASE = window.API_URL || "http://localhost:4000";

  // Estado interno del puente
  let currentStream = null;
  let currentBlob = null;     // Blob/File a enviar a Rekognition (de cámara o archivo)
  let captureCanvas = null;   // canvas offscreen para capturar frames

  function setStatus(msg){ window.AnimaTest?.setStatus?.(msg); }
  function setBusy(b){ window.AnimaTest?.setBusy?.(!!b); }
  function setResult(r){ window.AnimaTest?.setResult?.(r ?? null); }
  function setPreviewUrl(u){ window.AnimaTest?.setPreviewUrl?.(u || ""); }
  function setCameraActive(v){ window.AnimaTest?.setCameraActive?.(!!v); }
  function attachStream(s){ window.AnimaTest?.attachStream?.(s || null); }

  async function startCamera({ videoEl }) {
    setStatus("Solicitando cámara…");
    const s = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    currentStream = s;
    attachStream(s);          // TestPage se encarga de setear <video>.srcObject y play()
    setCameraActive(true);
    setStatus("Cámara activa");
    currentBlob = null;       // resetea último blob
    return true;
  }

  async function capturePhoto({ videoEl }) {
    if (!currentStream || !videoEl) throw new Error("No hay cámara activa");
    if (!captureCanvas) captureCanvas = document.createElement("canvas");
    const w = videoEl.videoWidth, h = videoEl.videoHeight;
    if (!w || !h) throw new Error("La cámara aún no inicializa tamaño");
    captureCanvas.width = w; captureCanvas.height = h;
    const ctx = captureCanvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, w, h);
    const blob = await new Promise(res => captureCanvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) throw new Error("No se pudo capturar la imagen");
    currentBlob = blob;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);       // muestra preview en TestPage
    return blob;              // por si la UI quiere usarlo
  }

  async function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    attachStream(null);
    setCameraActive(false);
    setStatus("Cámara detenida");
    return true;
  }

  // Paula sube un archivo: TestPage ya hace preview; aquí solo guardamos el File
  function onLocalFileSelected(file) {
    currentBlob = file || null;
  }

  async function analyzeImage() {
    if (!currentBlob) throw new Error("No hay imagen seleccionada o capturada.");
    setBusy(true);
    setStatus("Analizando…");
    try {
      const fd = new FormData();
      fd.append("image", currentBlob, "foto.jpg");
      const resp = await fetch(`${API_BASE}/api/rekognition/detect-faces`, {
        method: "POST",
        body: fd
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Error en análisis");
      setResult(data);
      setStatus("Análisis completo");
      return data;
    } catch (e) {
      console.error(e);
      setStatus("Error al analizar");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  // Expone la API que espera TestPage (ver useEffect en TestPage.js)
  window.AnimaAPI = {
    startCamera,
    capturePhoto,
    stopCamera,
    analyzeImage,
    onLocalFileSelected
  };
})();
