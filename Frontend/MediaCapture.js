/* Frontend/MediaCapture.js */
/* global React, ReactDOM */
(function () {
  const { useRef, useState, useEffect } = React;
  const API_BASE = window.API_URL || "http://localhost:4000"; // backend

  function MediaCapture() {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageRef = useRef(null);          // preview <img>
    const overlayRef = useRef(null);        // canvas overlay
    const [stream, setStream] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [rekResult, setRekResult] = useState(null);
    const [error, setError] = useState(null);

    // Limpia la cámara al salir
    useEffect(() => () => stopCamera(), []);

    // Redibuja cajas si cambia el tamaño de la ventana
    useEffect(() => {
      const onResize = () => drawBoxes();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [rekResult, photoPreviewUrl]);

    function askForFile() {
      setError(null);
      if (fileInputRef.current) fileInputRef.current.click();
    }

    function onFilePicked(e) {
      setError(null);
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrl(url);
      setCapturedBlob(file);
      setRekResult(null);
    }

    async function startCamera() {
      setError(null);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
        setStream(s);
        setPhotoPreviewUrl(null);
        setCapturedBlob(null);
        setRekResult(null);
      } catch (err) {
        console.error(err);
        setError("No se pudo acceder a la cámara. Revisa permisos o usa HTTPS/localhost.");
      }
    }

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    }

    function captureFrame() {
      setError(null);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) {
        setError("La cámara aún no inicializa el tamaño del video. Intenta de nuevo.");
        return;
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (!blob) {
          setError("No se pudo capturar la imagen.");
          return;
        }
        setCapturedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPhotoPreviewUrl(url);
        setRekResult(null);
      }, "image/jpeg", 0.92);
    }

    async function analyzeFaces() {
      setError(null);
      if (!capturedBlob) {
        setError("Primero sube o captura una foto.");
        return;
      }
      try {
        const fd = new FormData();
        fd.append('image', capturedBlob, 'foto.jpg');

        const resp = await fetch(`${API_BASE}/api/rekognition/detect-faces`, {
          method: 'POST',
          body: fd
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data?.error || 'Error en análisis');

        setRekResult(data);
        setTimeout(drawBoxes, 0);
      } catch (e) {
        console.error(e);
        setError("No se pudo analizar la imagen. Revisa la consola.");
      }
    }

    function onPreviewLoad() {
      drawBoxes();
    }

    function drawBoxes() {
      const img = imageRef.current;
      const overlay = overlayRef.current;
      if (!img || !overlay || !rekResult?.faces?.length) {
        if (overlay) {
          const ctx = overlay.getContext('2d');
          ctx && ctx.clearRect(0, 0, overlay.width, overlay.height);
        }
        return;
      }
      const dispW = img.clientWidth;
      const dispH = img.clientHeight;
      overlay.width = dispW;
      overlay.height = dispH;

      const ctx = overlay.getContext('2d');
      ctx.clearRect(0, 0, dispW, dispH);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'lime';
      ctx.font = '14px system-ui';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';

      rekResult.faces.forEach((f, i) => {
        const bb = f.boundingBox; // valores 0..1
        const x = bb.Left * dispW;
        const y = bb.Top * dispH;
        const wBox = bb.Width * dispW;
        const hBox = bb.Height * dispH;

        ctx.strokeRect(x, y, wBox, hBox);

        const topEmotion = (f.emotionsTop3?.[0]?.Type) || 'FACE';
        const label = `#${i + 1} ${topEmotion}`;
        const pad = 4;
        const textW = ctx.measureText(label).width;
        const boxW = textW + pad * 2;
        const boxH = 18 + pad * 2;
        const labelY = Math.max(y - boxH, 0);

        ctx.fillRect(x, labelY, boxW, boxH);
        ctx.fillStyle = 'white';
        ctx.fillText(label, x + pad, labelY + 14 + pad - 4);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
      });
    }

    return React.createElement(
      "div",
      { style: { maxWidth: 720, margin: "20px auto", fontFamily: "system-ui, sans-serif" } },
      React.createElement("h2", null, "Prueba de Medios: Subir foto / Usar cámara"),
      React.createElement("p", null, "Página de guía (sin diseño). Captura/sube imagen y analiza con AWS Rekognition."),

      // Botones
      React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" } },
        React.createElement("button", { onClick: askForFile }, "Subir foto (archivo)"),
        React.createElement("button", { onClick: startCamera }, "Usar cámara"),
        React.createElement("button", { onClick: captureFrame, disabled: !stream }, "Capturar foto"),
        React.createElement("button", { onClick: stopCamera, disabled: !stream }, "Detener cámara"),
        React.createElement("button", { onClick: analyzeFaces, disabled: !capturedBlob }, "Analizar rostro (AWS)"),
      ),

      // Input oculto
      React.createElement("input", {
        ref: fileInputRef,
        type: "file",
        accept: "image/*",
        capture: "environment",
        style: { display: "none" },
        onChange: onFilePicked,
      }),

      // Vista de cámara
      React.createElement("div", { style: { margin: "12px 0" } },
        React.createElement("video", {
          ref: videoRef,
          playsInline: true,
          muted: true,
          autoPlay: true,
          style: { width: "100%", maxHeight: 400, background: "#000" },
        })
      ),

      // Canvas (oculto) para capturar frame
      React.createElement("canvas", { ref: canvasRef, style: { display: "none" } }),

      // Preview + overlay
      photoPreviewUrl &&
        React.createElement("div", { style: { marginTop: 12 } },
          React.createElement("h4", null, "Vista previa"),
          React.createElement("div", { style: { position: "relative", display: "inline-block", maxWidth: "100%" } },
            React.createElement("img", {
              ref: imageRef,
              src: photoPreviewUrl,
              alt: "preview",
              onLoad: onPreviewLoad,
              style: { maxWidth: "100%", height: "auto", display: "block", border: "1px solid #ddd" }
            }),
            React.createElement("canvas", {
              ref: overlayRef,
              style: { position: "absolute", left: 0, top: 0, pointerEvents: "none", width: "100%", height: "100%" }
            })
          ),
          rekResult && React.createElement("pre", {
            style: { background: "#111", color: "#0f0", padding: 8, overflow: "auto", maxHeight: 240 }
          }, JSON.stringify(rekResult, null, 2))
        ),

      // Errores
      error && React.createElement("p", { style: { color: "crimson" } }, error),

      React.createElement("hr", null),
      React.createElement("p", null, "El backend debe estar en ", React.createElement("code", null, API_BASE),
        " con la ruta ", React.createElement("code", null, "/api/rekognition/detect-faces"), ".")
    );
  }

  window.MediaCapture = MediaCapture;
})();
