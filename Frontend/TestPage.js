/* global React, ReactDOM */
const { useRef, useState, useEffect } = React;

function TestPage(){
  // Paleta Ánima
  const C = {
    bg1:"#2A1541", bg2:"#120F1E", bg3:"#1A1230",
    mor:"#6C63FF", mag:"#FF2DAA",
    text:"#FFFFFF", text2:"#C9C9D1", card:"#1B1727",
    border:"rgba(255,255,255,.12)"
  };

  const S = {
    page:{
      minHeight:"100vh", color:C.text,
      background:`linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
      fontFamily:"system-ui, Segoe UI, Inter, Roboto, Arial"
    },
    container:{maxWidth:1200, margin:"0 auto", padding:"24px"},
    header:{
      position:"sticky", top:0, zIndex:10,
      background:"rgba(0,0,0,.12)", borderBottom:`1px solid ${C.border}`,
      backdropFilter:"saturate(120%) blur(6px)"
    },
    row:{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16},
    logo:{width:32, height:32, borderRadius:10,
      background:`linear-gradient(135deg,${C.mag},${C.mor})`, boxShadow:"0 10px 30px rgba(0,0,0,.4)"},
    btn:(kind)=>({
      display:"inline-block", padding:"10px 16px", borderRadius:14, textDecoration:"none",
      color:"#fff", fontWeight:600, cursor:"pointer",
      ...(kind==="ghost" && { border:`1px solid ${C.border}`, color:"#e5e5f5", background:"transparent" }),
      ...(kind==="grad"  && { background:`linear-gradient(90deg,${C.mag},${C.mor})` }),
      ...(kind==="soft"  && { background:"rgba(255,255,255,.06)", border:`1px solid ${C.border}` }),
      ...(kind==="disabled" && { opacity:.5, cursor:"not-allowed" })
    }),
    grid:{display:"grid", gap:20, gridTemplateColumns:"1fr", alignItems:"start", marginTop:24},
    card:{background:"rgba(27,23,39,.72)", border:`1px solid ${C.border}`, borderRadius:18, padding:18, backdropFilter:"blur(8px)"},
    videoBox:{width:"100%", aspectRatio:"16/9", background:"#000", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`},
    preview:{width:"100%", borderRadius:12, border:`1px solid ${C.border}`},
    tip:{fontSize:13, color:C.text2},
    badge:{display:"inline-block", padding:"6px 10px", borderRadius:999, border:`1px solid ${C.border}`, color:"#E7E7FF", fontSize:12},
    footer:{color:"#A0A0BE", fontSize:13, marginTop:28}
  };

  if (typeof window!=="undefined" && window.innerWidth>=992){
    S.grid.gridTemplateColumns = "1.2fr .8fr";
  }

  // Refs/UI state (sin lógica de medios propia)
  const videoRef  = useRef(null);
  const inputRef  = useRef(null);

  const [previewURL, setPreviewURL] = useState(""); // URL local para <img> (archivo subido)
  const [status, setStatus] = useState("");         // mensaje de estado
  const [cameraActive, setCameraActive] = useState(false); // lo define la integración
  const [result, setResult] = useState(null);       // JSON de resultados de análisis
  const [busy, setBusy] = useState(false);          // deshabilitar botones durante análisis

  // Limpieza de URL local
  useEffect(()=> {
    return () => { if (previewURL) URL.revokeObjectURL(previewURL); };
  }, [previewURL]);

  // ---- API de integración para Paula (puente UI) ----
  useEffect(() => {
    window.AnimaTest = {
      // Estado/feedback
      setStatus: (txt)  => setStatus(txt || ""),
      setBusy:   (v)    => setBusy(!!v),
      // Resultados
      setResult: (json) => setResult(json ?? null),
      // Preview por URL (por si backend genera una)
      setPreviewUrl: (url) => setPreviewURL(url || ""),
      // Cámara controlada externamente
      setCameraActive: (flag) => setCameraActive(!!flag),
      // Adjunta un MediaStream externo a nuestro <video>
      attachStream: (mediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream || null;
          if (mediaStream) {
            videoRef.current.play?.();
            setCameraActive(true);
          } else {
            setCameraActive(false);
          }
        }
      }
    };
    return () => { delete window.AnimaTest; };
  }, []);

  // ---- Handlers de UI (delegan en AnimaAPI si existe) ----
  function onPickFile(e){
    const f = e.target.files?.[0];
    if(!f) return;
    if(!f.type.startsWith("image/")){
      setStatus("Selecciona una imagen válida."); return;
    }
    if (previewURL) URL.revokeObjectURL(previewURL);
    setPreviewURL(URL.createObjectURL(f));
    setStatus(`Imagen cargada: ${f.name}`);

    // Notificar a la integración (opcional)
    window.AnimaAPI?.onLocalFileSelected?.(f);
  }

  async function startCamera(){
    setStatus("Solicitando cámara…");
    if (window.AnimaAPI?.startCamera) {
      try{
        await window.AnimaAPI.startCamera({ videoEl: videoRef.current });
      }catch(e){ console.error(e); setStatus("No se pudo iniciar la cámara"); }
    } else {
      setStatus("Conecta backend: falta AnimaAPI.startCamera");
    }
  }

  async function capturePhoto(){
    if (!cameraActive) { setStatus("Activa la cámara primero."); return; }
    if (window.AnimaAPI?.capturePhoto) {
      try{
        setBusy(true);
        const fileOrBlob = await window.AnimaAPI.capturePhoto({ videoEl: videoRef.current });
        // si la integración devuelve un Blob/File, lo mostramos como preview
        if (fileOrBlob) {
          if (previewURL) URL.revokeObjectURL(previewURL);
          const url = URL.createObjectURL(fileOrBlob);
          setPreviewURL(url);
        }
        setStatus("Foto capturada");
      }catch(e){ console.error(e); setStatus("Error al capturar"); }
      finally{ setBusy(false); }
    } else {
      setStatus("Conecta backend: falta AnimaAPI.capturePhoto");
    }
  }

  async function stopCamera(){
    if (window.AnimaAPI?.stopCamera) {
      try{
        await window.AnimaAPI.stopCamera({ videoEl: videoRef.current });
        // limpiar UI
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
        setStatus("Cámara detenida");
      }catch(e){ console.error(e); setStatus("No se pudo detener la cámara"); }
    } else {
      // Aun sin backend, limpiamos UI
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
      setStatus("Conecta backend: falta AnimaAPI.stopCamera");
    }
  }

  async function onAnalyze(){
    // Si Paula expone analyzeImage, lo usamos; si no, solo dejamos el contenedor listo
    if (window.AnimaAPI?.analyzeImage) {
      try{
        setBusy(true);
        setStatus("Analizando…");
        const res = await window.AnimaAPI.analyzeImage({
          // La integración decide de dónde tomar la imagen (preview/cámara/último payload)
          previewURL
        });
        setResult(res ?? null);
        setStatus("Análisis completo");
      }catch(e){
        console.error(e);
        setStatus("Error al analizar");
      }finally{
        setBusy(false);
      }
    } else {
      setStatus("Conecta backend: falta AnimaAPI.analyzeImage");
    }
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{...S.container, ...S.row, padding:"12px 0"}}>
          <a href="./index.html" style={{display:"flex", alignItems:"center", gap:12, color:"#fff", textDecoration:"none"}}>
            <div style={S.logo} />
            <strong>Ánima</strong>
          </a>
          <div style={{display:"flex", gap:8}}>
            <a style={S.btn("ghost")} href="./index.html">Inicio</a>
            <button style={S.btn("ghost")} onClick={()=>location.reload()}>Reiniciar</button>
          </div>
        </div>
      </div>

      {/* Main */}
      <main style={{...S.container}}>
        <h1 style={{margin:"12px 0"}}>Test de emociones</h1>
        <p style={{color:C.text2, maxWidth:900}}>
          Subí una foto o usa tu cámara. Verás la vista previa y luego podrás “Analizar”.
          Esta página es independiente del App.js y sirve para integrar los servicios de análisis.
        </p>

        <div style={S.grid}>
          {/* Columna izquierda: captura / controles */}
          <section style={S.card}>
            <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
              <label style={S.btn("soft")}>
                <input ref={inputRef} type="file" accept="image/*" onChange={onPickFile} style={{display:"none"}} />
                Subir foto (archivo)
              </label>

              {!cameraActive && (
                <button style={S.btn("soft")} onClick={startCamera}>Usar cámara</button>
              )}

              {cameraActive && (
                <>
                  <button style={S.btn(busy ? "disabled":"soft")} onClick={busy ? undefined : capturePhoto}>Capturar foto</button>
                  <button style={S.btn("soft")} onClick={stopCamera}>Detener cámara</button>
                </>
              )}

              <button style={S.btn(busy ? "disabled":"grad")} onClick={busy ? undefined : onAnalyze}>
                Analizar
              </button>
            </div>

            <div style={{marginTop:16}}>
              <span style={S.badge}>{status || "Listo"}</span>
            </div>

            {/* Mosaico cámara */}
            <div style={{marginTop:16}}>
              <div style={S.videoBox}>
                {/* La integración adjunta el stream con window.AnimaTest.attachStream(stream) */}
                <video ref={videoRef} playsInline muted style={{width:"100%", height:"100%", objectFit:"cover"}} />
              </div>
            </div>
          </section>

          {/* Columna derecha: preview e info */}
          <aside style={S.card}>
            <div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <h3 style={{margin:0}}>Vista previa</h3>
                {previewURL && <span style={S.badge}>Imagen cargada</span>}
              </div>
              <p style={S.tip}>Se mostrará tu imagen aquí antes de analizar.</p>

              {previewURL ? (
                <img src={previewURL} alt="Preview" style={S.preview}/>
              ) : (
                <div style={{...S.preview, height:220, display:"grid", placeItems:"center", color:"#8E8EA6"}}>
                  Sin imagen seleccionada
                </div>
              )}

              <div style={{marginTop:16}}>
                <h4 style={{margin:"0 0 6px 0"}}>Privacidad</h4>
                <p style={S.tip}>
                  Tu imagen se usa solo para el análisis. Podrás borrar resultados cuando quieras.
                </p>
                <h4 style={{margin:"12px 0 6px 0"}}>Consejos</h4>
                <ul style={{margin:0, paddingLeft:16, color:C.text2}}>
                  <li>Buena iluminación y rostro centrado.</li>
                  <li>Evita desenfoques y sombras fuertes.</li>
                  <li>Formatos recomendados: JPG/PNG.</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>

        {/* Resultados (JSON) */}
        <section style={{...S.card, marginTop:20}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
            <h3 style={{margin:0}}>Resultados</h3>
            {result && (
              <button
                style={S.btn("soft")}
                onClick={()=>{
                  navigator.clipboard.writeText(JSON.stringify(result,null,2)).catch(()=>{});
                }}>
                Copiar JSON
              </button>
            )}
          </div>
          <p style={S.tip}>Vista del JSON devuelto por el análisis.</p>

          {result ? (
            <pre style={{
              margin:0, padding:12, whiteSpace:"pre-wrap", wordBreak:"break-word",
              background:"rgba(0,0,0,.25)", border:`1px solid ${C.border}`, borderRadius:12
            }}>
{JSON.stringify(result, null, 2)}
            </pre>
          ) : (
            <div style={{
              height:120, display:"grid", placeItems:"center",
              color:"#8E8EA6", border:`1px solid ${C.border}`, borderRadius:12, marginTop:8
            }}>
              Aún no hay resultados
            </div>
          )}
        </section>

        <p style={S.footer}>© {new Date().getFullYear()} Ánima</p>
      </main>
    </div>
  );
}

/* ---------- Auto-render solo cuando NO está embebido en App ---------- */
if (!window.__ANIMA_EMBEDDED_APP__) {
  const mount = document.getElementById("root");
  if (mount) {
    const root = ReactDOM.createRoot(mount);
    root.render(<TestPage />);
  }
}

/* ---------- Export para uso embebido desde App ---------- */
window.TestPage = TestPage;
