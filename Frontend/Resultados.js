/**
 * Pestaña: Resultados
 * Flujo: MediaCapture ➜ Analizar ➜ Resultados
 * 
 * INTEGRACIÓN BACKEND:
 * ====================
 * Props esperadas:
 * - emotions: Array<{ name: string, score: number (0-1 o 0-100) }>
 *   Ejemplo: [{ name: "Alegría", score: 0.85 }, { name: "Tristeza", score: 0.12 }]
 * 
 * - playlistUrl: string (URL completa de Spotify)
 *   Ejemplo: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
 * 
 * - isLoading: boolean (true mientras espera respuesta del backend)
 * 
 * - isAuthenticated: boolean (true si el usuario tiene sesión activa)
 * 
 * Callbacks:
 * - onSavePlaylist: () => void - Guardar resultado en historial del usuario
 * - onRetry: () => void - Volver a MediaCapture para nuevo análisis
 * - onGoLogin: () => void - Ir a login (si no está autenticado)
 * - onGoHome: () => void - Ir al inicio
 * 
 * ENDPOINTS SUGERIDOS:
 * ====================
 * POST /api/analyze
 *   Body: { image: File/Blob }
 *   Response: { 
 *     emotions: [{ name: string, score: number }],
 *     playlistUrl: string 
 *   }
 * 
 * POST /api/playlists/save
 *   Headers: { Authorization: "Bearer TOKEN" }
 *   Body: { 
 *     emotions: [{ name: string, score: number }],
 *     playlistUrl: string,
 *     timestamp: Date 
 *   }
 *   Response: { success: boolean, playlistId: string }
 */
/* Pestaña: Resultados
 * Flujo: MediaCapture ➜ Analizar ➜ Resultados
 *
 * Copiar y pegar este archivo completo para reemplazar el existente.
 */

//* Resultados — integra con backend (análisis + guardar) */
/* global React */
(function () {
  const { useState, useEffect, useMemo } = React;
const API_BASE = window.API_URL || "http://localhost:4000";

  // Paleta
  const C = {
    bg1: "#2A1541", bg2: "#120F1E", bg3: "#1A1230",
    mor: "#6C63FF", mag: "#FF2DAA",
    text: "#FFFFFF", text2: "#C9C9D1", card: "#1B1727",
    border: "rgba(255,255,255,.12)"
  };
    // Breakpoints simples
  const W = (typeof window !== "undefined") ? window.innerWidth : 1200;
  const isSm = W < 640;
  const isMd = W >= 640 && W < 992;
  const isLg = W >= 992;


  // Placeholder
  const sampleEmotions = [
    { name: "Alegría", score: 0.62 },
    { name: "Sorpresa", score: 0.21 },
    { name: "Tristeza", score: 0.17 },
  ];

  // Mapa Rekognition -> etiqueta en español
  const EMO_MAP = {
    HAPPY: "Alegría",
    SAD: "Tristeza",
    SURPRISED: "Sorpresa",
    ANGRY: "Enojo",
    CALM: "Calma",
    CONFUSED: "Confusión",
    DISGUSTED: "Asco",
    FEAR: "Miedo",
    UNKNOWN: "Neutral"
  };

  function toPercent(x) {
    if (x == null) return 0;
    return x <= 1 ? Math.round(x * 100) : Math.round(x);
  }

  function getEmbedUrl(playlistUrl) {
    if (!playlistUrl) return "";
    try {
      const url = new URL(playlistUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => p === "playlist");
      if (idx !== -1 && parts[idx + 1]) {
        const id = parts[idx + 1];
        return `https://open.spotify.com/embed/playlist/${id}?utm_source=generator`;
      }
      return playlistUrl;
    } catch {
      return playlistUrl;
    }
  }

  // Transformadores
  function transformRekognitionRaw(resp) {
    const face = resp?.FaceDetails?.[0];
    if (!face || !Array.isArray(face.Emotions)) return [];
    return face.Emotions.map((e) => {
      const type = e.Type || e.type || "UNKNOWN";
      const name = EMO_MAP[type] || type;
      const score = (e.Confidence ?? e.confidence ?? 0) / 100;
      return { name, score };
    });
  }

  function transformBackendEmotions(resp) {
  if (!resp) return [];

  // Soporte a tu ruta actual: { faces: [ { emotionsTop3: [{Type,Confidence}...] } ] }
  if (Array.isArray(resp.faces) && resp.faces[0]?.emotionsTop3) {
    return resp.faces[0].emotionsTop3.map(e => ({
      name: (e.Type && (EMO_MAP[e.Type] || e.Type)) || "Desconocido",
      score: (typeof e.Confidence === "number" ? e.Confidence : 0) / 100
    }));
  }

  // Soporte genérico: { emotions: [{ name/type/Type, score/confidence }] }
  if (Array.isArray(resp.emotions)) {
    return resp.emotions.map(e => ({
      name: e.name || e.type || e.Type || "Desconocido",
      score: (e.score ?? e.confidence ?? 0) / 100
    }));
  }

  // Fallback: shape crudo de Rekognition { FaceDetails: [{ Emotions: [...] }] }
  return transformRekognitionRaw(resp);
}


  // HTTP helpers
  async function postJSON(url, body, token) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // Componente
function ResultadosTab({
  emotions: propsEmotions = null,
  playlistUrl: propsPlaylist = "",
  imageData = null,
  autoAnalyze = false,
  isAuthenticated = false,
  viewMode = "normal",           // 👈 nuevo
  onGoBack = null,               // 👈 nuevo
  onSavePlaylist = null,
  onRetry = () => { window.location.href = "./test.html"; },
  onGoLogin = () => { window.location.href = "./login.html"; },
  onGoHome = () => { window.location.href = "./index.html"; },

  showSaved = false,
  onSavedAnotherScan = () => {},
  onSavedGoAccount = () => {},
  onCloseSaved = () => {},

}) {
  const [emotions, setEmotions] = useState(propsEmotions || null);
  const [playlistUrl, setPlaylistUrl] = useState(propsPlaylist || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const readOnly = viewMode === "history"; // 👈 clave


    // Formatted list (top 3)
    const list = useMemo(() => {
      const src = (emotions && emotions.length) ? emotions : sampleEmotions;
      return src
        .map(e => ({ ...e, pct: toPercent(e.score) }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3);
    }, [emotions]);

    const embedUrl = useMemo(() => getEmbedUrl(playlistUrl), [playlistUrl]);

    // Detect token (optional)
    function getAuthToken() {
      if (window.__ANIMA_AUTH__ && typeof window.__ANIMA_AUTH__ === "string") return window.__ANIMA_AUTH__;
      return localStorage.getItem("anima_token") || null;
    }

    // Analizar: intenta en este orden:
    // 1) window.AnimaAPI.analyze() (si existe)
    // 2) POST /api/analyze (body: { image: base64 })
    // 3) POST /api/rekognition/analyze  (fallback)
   // ...existing code...
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(",");
  const mime = meta.split(":")[1].split(";")[0] || "image/jpeg";
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function analyze() {
  setError("");
  setIsLoading(true);
  try {
    // 1) Construir el Blob de imagen a partir de imageData
    let blob = null;
    if (imageData instanceof Blob) {
      blob = imageData;
    } else if (typeof imageData === "string") {
      if (imageData.startsWith("data:")) {
        blob = dataUrlToBlob(imageData);
      } else {
        const r = await fetch(imageData);
        if (!r.ok) throw new Error(`No se pudo descargar la imagen (${r.status})`);
        blob = await r.blob();
      }
    } else {
      throw new Error("No hay imagen para analizar");
    }

    // 2) Enviar como multipart/form-data (campo 'image') al endpoint real
    const fd = new FormData();
    fd.append("image", blob, "captura.jpg");

    const res = await fetch(`${API_BASE}/api/rekognition/detect-faces`, {
      method: "POST",
      body: fd
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

    // 3) Normalizar a [{ name, score }] (score 0..1) usando faces[0].emotionsTop3
    const face = Array.isArray(json?.faces) ? json.faces[0] : null;
    const emos = (face?.emotionsTop3 || []).map(em => ({
      name: (em.Type && (EMO_MAP[em.Type] || em.Type)) || "Desconocido",
      score: (typeof em.Confidence === "number" ? em.Confidence : 0) / 100
    }));

    setEmotions(emos);
    setPlaylistUrl(""); // (aquí luego metemos la URL de Spotify)
  } catch (e) {
    console.error(e);
    setError("Error al analizar. Revisa la consola y el backend.");
  } finally {
    setIsLoading(false);
  }
}



    // Guardar playlist en backend
    async function savePlaylist() {
      if (typeof onSavePlaylist === "function") {
        // si la app inyecta un handler, usarlo
        return onSavePlaylist({ emotions, playlistUrl });
      }
      // Default: POST /api/playlists/save
      try {
        setIsLoading(true);
        const token = getAuthToken();
        const payload = { emotions, playlistUrl, timestamp: new Date().toISOString() };
        const res = await postJSON("/api/playlists/save", payload, token);
        if (res?.success) {
          alert("Playlist guardada");
        } else {
          alert("No se pudo guardar la playlist");
        }
      } catch (e) {
        console.error(e);
        alert("Error guardando playlist");
      } finally {
        setIsLoading(false);
      }
    }

    // Auto-analyze si corresponde
    useEffect(() => {
      if (!propsEmotions && autoAnalyze) {
        analyze();
      } else if (propsEmotions) {
        setEmotions(propsEmotions);
        setPlaylistUrl(propsPlaylist || "");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
  if (propsEmotions && propsEmotions.length) {
    setEmotions(propsEmotions);
    setPlaylistUrl(propsPlaylist || "");
    setError("");         // limpia el error si llegó data buena
    setIsLoading(false);  // por si quedó en “cargando”
  }
}, [propsEmotions, propsPlaylist]);


    // Styles (simple)
        const S = {
      page: {
        minHeight: "100vh",
        color: C.text,
        background: `linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
        fontFamily: "system-ui",
      },

      // contenedor con padding seguro y ancho máximo
      container: {
        width: "100%",
        maxWidth: isLg ? 1100 : (isMd ? 960 : 640),
        margin: "0 auto",
        paddingLeft:  isSm ? "max(16px, env(safe-area-inset-left))"  : "24px",
        paddingRight: isSm ? "max(16px, env(safe-area-inset-right))" : "24px",
        paddingTop:   isSm ? 12 : 16,
        paddingBottom:isSm ? 16 : 20,
        boxSizing: "border-box"
      },

      card: {
        background: C.card,
        borderRadius: 16,
        padding: isSm ? 14 : 18,
        border: `1px solid ${C.border}`,
        marginBottom: isSm ? 14 : 16
      },

      title:   { fontSize: isSm ? 22 : 24, margin: 0, lineHeight: 1.2 },
      subtitle:{ color: C.text2, marginTop: 6, fontSize: isSm ? 13.5 : 14.5, lineHeight: 1.55 },

      // fila de botones: en móvil se apilan
      btnRow: {
        display: "flex",
        gap: 8,
        marginTop: 12,
        flexWrap: "wrap",
        flexDirection: isSm ? "column" : "row",
        alignItems: isSm ? "stretch" : "center"
      },

      // estilos base — los botones de la vista ya los extienden
      btnPrimary: {
        padding: isSm ? "12px 18px" : "12px 22px",
        borderRadius: 9999,
        background: `linear-gradient(90deg,${C.mag},${C.mor})`,
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: isSm ? 14 : 15,
        minHeight: isSm ? 42 : 46
      },
      btnGhost: {
        padding: isSm ? "10px 14px" : "10px 16px",
        borderRadius: 9999,
        background: "transparent",
        color: "#fff",
        border: `1px solid ${C.border}`,
        cursor: "pointer",
        fontWeight: 600,
        fontSize: isSm ? 14 : 15,
        minHeight: isSm ? 40 : 44
      },

      list: { marginTop: 12 },

      modalBack: {
        position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
        display:"grid", placeItems:"center", zIndex:1000
      },
      modal: {
        width:"min(520px, 92vw)", background: C.card, color:"#fff",
        border:`1px solid ${C.border}`, borderRadius:16, padding:18,
        boxShadow:"0 20px 60px rgba(0,0,0,.5)"
      },
      modalHeader: { display:"flex", justifyContent:"space-between", alignItems:"center" },
      modalTitle: { fontSize:18, fontWeight:800, margin:0 },
      xBtn: { background:"transparent", color:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"6px 10px", cursor:"pointer" },
      modalBody: { color: C.text2, marginTop:8, lineHeight:1.5 },
      modalBtns: { display:"flex", gap:10, marginTop:14, justifyContent:"flex-end" }
    };

    return React.createElement("div", { style: S.page },
      React.createElement("div", { style: S.container },


        React.createElement("div", { style: S.card },
          React.createElement("h2", { style: S.title }, "Resultados"),
          React.createElement("p", { style: S.subtitle }, "Top emociones detectadas. Si no ves resultados, pulsa 'Analizar' o revisa la conexión con el backend."),
React.createElement("div", { style: S.btnRow },
  readOnly
    // ← Solo cuando vienes del historial
    ? React.createElement("button", {
        type: "button",
        onClick: () => { if (typeof onGoBack === "function") onGoBack(); },
        style: { ...S.btnGhost, padding: "10px 16px", borderRadius: 9999, fontWeight: 600, borderWidth: 1, borderStyle: "solid" }
      }, "← Volver a historial")
    // ← Flujo normal (análisis nuevo)
    : React.createElement(React.Fragment, null,
        React.createElement("button", {
          type: "button",
          onClick: onGoHome,
          style: { ...S.btnGhost, padding: "10px 16px", borderRadius: 9999, fontWeight: 600, borderWidth: 1, borderStyle: "solid" }
        }, "← Inicio"),
        React.createElement("button", {
          type: "button",
          onClick: onRetry,
          style: { ...S.btnGhost, padding: "10px 16px", borderRadius: 9999, fontWeight: 600, borderWidth: 1, borderStyle: "solid" }
        }, "Volver a captura"),
        React.createElement("button", {
          type: "button",
          onClick: analyze,
          disabled: isLoading,
          style: {
            ...S.btnPrimary,
            padding: "12px 22px",
            borderRadius: 9999,
            fontWeight: 700,
            letterSpacing: .3,
            boxShadow: "0 6px 14px rgba(0,0,0,.20)",
            transition: "transform .15s ease, box-shadow .15s ease"
          }
        }, isLoading ? "Analizando..." : "Analizar")
      )
),

        ),

React.createElement("div", { style: S.card },
  React.createElement("h3", null, "Emoción dominante"),
isLoading
  ? React.createElement("p", null, "Cargando...")
  : (() => {
      const top = (emotions && emotions[0]) || null;
      if (!top) {
        return React.createElement("p", { style: { color: C.text2 } }, "Aún no hay resultados.");
      }

      const pct = Math.round((top.score || 0) * 100);
      const EMO_I18N = {
        HAPPY:"Alegría", SAD:"Tristeza", CALM:"Calma", ANGRY:"Enojo",
        SURPRISED:"Sorpresa", CONFUSED:"Confusión", FEAR:"Miedo",
        DISGUSTED:"Asco", UNKNOWN:"Neutral"
      };

      const raw = String(top.name || "");
      const clean = raw.replace(/^\s*\d+\.\s*/, ""); // quita "1. "
      const key = clean.toUpperCase();
      const label = EMO_I18N[key] || clean;

      return React.createElement(React.Fragment, null,
        React.createElement("div", { style: { display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:8 } },
          React.createElement("div", { style: { color:"#cfcfe6", fontSize:18, fontWeight:700 } }, label),
          React.createElement("div", { style: { fontWeight:800, fontSize:18 } }, `${pct}%`)
        ),
        React.createElement("div", { style: { height:16, background:"rgba(255,255,255,.08)", borderRadius:9999, overflow:"hidden" } },
          React.createElement("div", { style: { width:`${Math.min(pct,100)}%`, height:"100%", borderRadius:9999, background:`linear-gradient(90deg,${C.mag},${C.mor})` } })
        ),
        React.createElement("p", { style:{ color: C.text2, marginTop: 6 } }, "Usamos esta emoción para recomendar la playlist.")
      );
    })()

        ),

        React.createElement("div", { style: S.card },
          React.createElement("h3", null, "Playlist recomendada"),
          embedUrl ? React.createElement("div", { style: { borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` } },
            React.createElement("iframe", {
  title: "Spotify",
  src: embedUrl,
  width: "100%",
  height: isSm ? 300 : 352,
  frameBorder: 0,
  allow: "encrypted-media"
})

          ) : React.createElement("div", null,
            React.createElement("p", null, "No se encontró playlist. El backend debe devolver playlistUrl.")
          ),
          
          React.createElement("div", { style: S.btnRow },
  readOnly
    ? null // 👈 no mostramos nada en historial
    : (isAuthenticated
        ? React.createElement("button", { style: S.btnPrimary, onClick: savePlaylist, disabled: isLoading }, "Guardar playlist")
        : React.createElement("button", { style: S.btnPrimary, onClick: onGoLogin }, "Iniciar sesión para guardar")
      )
),
/* --- Modal “Guardado en tu historial” --- */
showSaved && React.createElement("div", { style: S.modalBack, onClick:(e)=>{ if (e.target === e.currentTarget) onCloseSaved(); } },
  React.createElement("div", { style: S.modal, role:"dialog", "aria-modal":"true" },
    React.createElement("div", { style: S.modalHeader },
      React.createElement("h4", { style: S.modalTitle }, "¡Guardado en tu historial!"),
      React.createElement("button", { style: S.xBtn, onClick:onCloseSaved }, "✕")
    ),
    React.createElement("div", { style: S.modalBody },
      "¿Quieres hacer otro escaneo ahora o ir a ",
      React.createElement("strong", null, "Mi cuenta"),
      " para ver tu historial?"
    ),
    React.createElement("div", { style: S.modalBtns },
      React.createElement("button", { style: S.btnGhost, onClick:onSavedGoAccount }, "Ir a Mi cuenta"),
      React.createElement("button", { style: S.btnPrimary, onClick:onSavedAnotherScan }, "Hacer otro escaneo")
    )
  )
),

        )

      )
    );
  }

  // Exponer
  window.ResultadosTab = ResultadosTab;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.ResultadosTab = ResultadosTab;
})();