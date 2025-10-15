// Frontend/src/components/ScanFace.jsx
import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ScanFace() {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);  // canvas para capturar
  const overlayRef = useRef(null);        // overlay para boxes
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [blob, setBlob] = useState(null);
  const [rek, setRek] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => stopCamera(), []);
  useEffect(() => {
    const onResize = () => drawBoxes();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rek, photoUrl]);

  function askFile() {
    setError(null);
    fileInputRef.current?.click();
  }
  function onFilePicked(e) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPhotoUrl(url);
    setBlob(f);
    setRek(null);
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
      setPhotoUrl(null);
      setBlob(null);
      setRek(null);
    } catch (err) {
      console.error(err);
      setError("No se pudo acceder a la cámara. Usa HTTPS/localhost y concede permisos.");
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
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) {
      setError("La cámara aún no inicializa el tamaño del video. Intenta de nuevo.");
      return;
    }
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(video, 0, 0, w, h);
    canvas.toBlob((b) => {
      if (!b) return setError("No se pudo capturar la imagen.");
      setBlob(b);
      setPhotoUrl(URL.createObjectURL(b));
      setRek(null);
    }, "image/jpeg", 0.92);
  }

  async function analyze() {
    if (!blob) return setError("Primero sube o captura una foto.");
    setError(null); setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", blob, "foto.jpg");
      const r = await fetch(`${API_BASE}/api/rekognition/detect-faces`, { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Error en análisis");
      setRek(data);
      setTimeout(drawBoxes, 0);
    } catch (e) {
      console.error(e);
      setError("No se pudo analizar la imagen. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  }

  function drawBoxes() {
    const img = imgRef.current, overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext("2d");
    if (!img || !rek?.faces?.length) {
      overlay.width = overlay.clientWidth || 0;
      overlay.height = overlay.clientHeight || 0;
      ctx && ctx.clearRect(0,0,overlay.width, overlay.height);
      return;
    }
    const dispW = img.clientWidth, dispH = img.clientHeight;
    overlay.width = dispW; overlay.height = dispH;
    ctx.clearRect(0,0,dispW,dispH);
    ctx.lineWidth = 3; ctx.strokeStyle = "lime";
    ctx.font = "14px system-ui"; ctx.fillStyle = "rgba(0,0,0,0.55)";

    rek.faces.forEach((f,i) => {
      const bb = f.boundingBox;
      const x = bb.Left * dispW, y = bb.Top * dispH;
      const w = bb.Width * dispW, h = bb.Height * dispH;
      ctx.strokeRect(x,y,w,h);
      const label = `#${i+1} ${(f.emotionsTop3?.[0]?.Type)||"FACE"}`;
      const pad=4, tw=ctx.measureText(label).width, bw=tw+pad*2, bh=18+pad*2;
      const ly = Math.max(y - bh, 0);
      ctx.fillRect(x, ly, bw, bh);
      ctx.fillStyle = "white";
      ctx.fillText(label, x + pad, ly + 14 + pad - 4);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
    });
  }
  function onPreviewLoad(){ drawBoxes(); }

  function getTopEmotion(f){
    return f?.emotionsTop3?.[0] ? `${f.emotionsTop3[0].Type} (${f.emotionsTop3[0].Confidence.toFixed(1)}%)` : "N/A";
  }

  return (
    <div style={{maxWidth: 900, margin: "0 auto"}}>
      <h2>Escaneo de rostro (demo funcional)</h2>
      <p>Sube una foto o usa la cámara. Luego analiza con AWS Rekognition.</p>

      <div style={{display:"flex", gap:12, flexWrap:"wrap", margin:"12px 0"}}>
        <button onClick={askFile}>Subir foto</button>
        <button onClick={startCamera}>Usar cámara</button>
        <button onClick={captureFrame} disabled={!stream}>Capturar</button>
        <button onClick={stopCamera} disabled={!stream}>Detener cámara</button>
        <button onClick={analyze} disabled={!blob || loading}>
          {loading ? "Analizando..." : "Analizar (AWS)"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={onFilePicked}/>
      </div>

      <div style={{ margin:"12px 0" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{width:"100%", maxHeight:360, background:"#000"}} />
      </div>

      <canvas ref={captureCanvasRef} style={{display:"none"}} />

      {photoUrl && (
        <div style={{marginTop:12}}>
          <h4>Vista previa</h4>
          <div style={{position:"relative", display:"inline-block", maxWidth:"100%"}}>
            <img ref={imgRef} src={photoUrl} alt="preview" onLoad={onPreviewLoad}
                 style={{maxWidth:"100%", height:"auto", display:"block", border:"1px solid #ddd"}} />
            <canvas ref={overlayRef}
                    style={{position:"absolute", left:0, top:0, pointerEvents:"none", width:"100%", height:"100%"}}/>
          </div>

          {rek && (
            <div style={{marginTop:8, padding:"6px 10px", background:"#eef", border:"1px solid #cdd", borderRadius:6}}>
              <strong>Resumen:</strong> Rostros: {rek.faceCount}.{" "}
              {rek.faces?.[0] && <>Emoción dominante: {getTopEmotion(rek.faces[0])}.</>}
            </div>
          )}

          {rek && (
            <pre style={{background:"#111", color:"#0f0", padding:8, overflow:"auto", maxHeight:240}}>
              {JSON.stringify(rek, null, 2)}
            </pre>
          )}
        </div>
      )}

      {error && <p style={{color:"crimson"}}>{error}</p>}
    </div>
  );
}
