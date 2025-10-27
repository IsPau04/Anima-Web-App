/* global React, ReactDOM */
(function () {
  const { useRef, useState, useEffect } = React;

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
    grid:{display:"grid", gap:20, gridTemplateColumns:"repeat(2, 1fr)", alignItems:"start", marginTop:24},
    card:{background:"rgba(27,23,39,.72)", border:`1px solid ${C.border}`, borderRadius:18, padding:18, backdropFilter:"blur(8px)"},
    videoBox:{width:"100%", aspectRatio:"16/9", background:"#000", borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}`},
    preview:{width:"100%", borderRadius:12, border:`1px solid ${C.border}`},
    tip:{fontSize:13, color:C.text2},
    badge:{display:"inline-block", padding:"6px 10px", borderRadius:999, border:`1px solid ${C.border}`, color:"#E7E7FF", fontSize:12},
    footer:{color:"#A0A0BE", fontSize:13, marginTop:28}
  };

  function MediaCapture() {
    // Referencias y estado
    const videoRef = useRef(null);
    const canvasRef = useRef(null); 
    const fileInputRef = useRef(null);
    const imageRef = useRef(null);
    const overlayRef = useRef(null);

    const [stream, setStream] = useState(null);
    const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
    const [capturedBlob, setCapturedBlob] = useState(null);
    const [rekResult, setRekResult] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    // Cleanup al desmontar
    useEffect(() => {
      return () => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
      };
    }, [stream]);

    // Handlers
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
          audio: false
        });
        videoRef.current.srcObject = s;
        await videoRef.current.play();
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
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, w, h);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        setPhotoPreviewUrl(url);
        setCapturedBlob(blob);
        setRekResult(null);
      }, "image/jpeg", 0.92);
    }

        // Modificar el handler del botón Inicio
    function goHome(e) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('anima:goHome'));
    }

    // UI rendering
    return React.createElement(
      "div",
      { style: S.page },
      // Header
      React.createElement("div", { style: S.header },
        React.createElement("div", { style: {...S.container, ...S.row} },
          React.createElement("a", {
            href:"#",
            onClick: goHome,
            style: {display:"flex", alignItems:"center", gap:12, color:"#fff", textDecoration:"none"}
          },
            React.createElement("div", { style: S.logo }),
            React.createElement("strong", null, "Ánima")
          ),
          React.createElement("a", {
            style: S.btn("ghost"),
            href:"#",
            onClick: goHome
          }, "Inicio")
        )
      ),

      // Main content
      React.createElement("main", { style: S.container },
        React.createElement("h1", { style: {margin:"12px 0"} }, "Test de emociones"),
        React.createElement("p", { style: {color: C.text2, maxWidth:900} },
          "Subí una foto o usa tu cámara para comenzar el análisis de emociones."
        ),

        React.createElement("div", { style: S.grid },
          // Left column
          React.createElement("section", { style: S.card },
            React.createElement("div", { style: {display:"flex", gap:8, flexWrap:"wrap"} },
              React.createElement("button", { 
                style: S.btn("soft"),
                onClick: askForFile 
              }, "Subir foto"),

              !stream && React.createElement("button", {
                style: S.btn("soft"),
                onClick: startCamera
              }, "Usar cámara"),

              stream && React.createElement(React.Fragment, null,
                React.createElement("button", {
                  style: S.btn(busy ? "disabled" : "soft"),
                  onClick: busy ? undefined : captureFrame
                }, "Capturar foto"),
                React.createElement("button", {
                  style: S.btn("soft"),
                  onClick: stopCamera
                }, "Detener cámara")
              ),

              capturedBlob && React.createElement("button", {
                style: S.btn(busy ? "disabled" : "grad"),
                onClick: busy ? undefined : () => {
                  // Notificar análisis
                  window.dispatchEvent(new CustomEvent('anima:analyze', {
                    detail: { imageBlob: capturedBlob }
                  }));
                }
              }, "Analizar")
            ),

            error && React.createElement("div", { style: {color:"crimson", marginTop:12} }, error),

            React.createElement("div", { style: {marginTop:16} },
              React.createElement("div", { style: S.videoBox },
                React.createElement("video", {
                  ref: videoRef,
                  playsInline: true,
                  muted: true,
                  style: {width:"100%", height:"100%", objectFit:"cover"}
                })
              )
            )
          ),

          // Right column
          React.createElement("aside", { style: S.card },
            React.createElement("div", null,
              React.createElement("div", { style: {display:"flex", alignItems:"center", justifyContent:"space-between"} },
                React.createElement("h3", { style: {margin:0} }, "Vista previa"),
                photoPreviewUrl && React.createElement("span", { style: S.badge }, "Imagen lista")
              ),
              React.createElement("p", { style: S.tip }, "La imagen capturada aparecerá aquí antes de analizar."),

              photoPreviewUrl
                ? React.createElement("img", {
                    ref: imageRef,
                    src: photoPreviewUrl,
                    alt: "Preview",
                    style: S.preview
                  })
                : React.createElement("div", {
                    style: {...S.preview, height:220, display:"grid", placeItems:"center", color:"#8E8EA6"}
                  }, "Sin imagen seleccionada"),

              React.createElement("input", {
                ref: fileInputRef,
                type: "file",
                accept: "image/*",
                style: {display:"none"},
                onChange: onFilePicked
              }),

              React.createElement("canvas", {
                ref: canvasRef,
                style: {display:"none"}
              }),

              React.createElement("canvas", {
                ref: overlayRef,
                style: {
                  position:"absolute",
                  left:0, top:0,
                  pointerEvents:"none",
                  width:"100%",
                  height:"100%"
                }
              })
            )
          )
        ),

        React.createElement("p", { style: S.footer }, "© ", new Date().getFullYear(), " Ánima")
      )
    );
  }

  // Export para App.js
  window.MediaCapture = MediaCapture;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.MediaCapture = MediaCapture;

})();