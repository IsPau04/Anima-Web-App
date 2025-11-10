/* global React, ReactDOM, Babel */
const { useState, useEffect } = React;
const API_BASE = window.API_URL || "http://localhost:4000";



// === Helper HTTP con token ===
async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Convierte emotions [{name, score 0..1}] -> payload backend [{nombre, confianza 0..100}]
function toBackendEmotions(list) {
  return (Array.isArray(list) ? list : []).map(e => ({
    nombre: String(e?.name || "UNKNOWN").toUpperCase(),
    confianza: Math.round(((e?.score ?? 0) * 100) * 100) / 100 // dos decimales
  }));
}

// Extrae ID de playlist desde un embed o URL normal
function extractSpotifyId(url = "") {
  const m = url.match(/playlist\/([a-zA-Z0-9]+)(?:\?|$|\/)/);
  return m?.[1] || null;
}


/* =================== APP ROOT =================== */
function App(){
  const [mode, setMode]   = useState("home"); // "home" | "login" | "register" | "test"
  const [TestC, setTestC] = useState(null);   // componente TestPage cuando esté listo
  const [loadErr, setLoadErr] = useState("");
  const [MiCuentaC, setMiCuentaC] = useState(null); // componente MiCuenta cuando esté listo
  const [miCuentaErr, setMiCuentaErr] = useState("");
  const [captureMethod, setCaptureMethod] = useState("camara");
  const [HistoryC, setHistoryC] = useState(null);
const [historyErr, setHistoryErr] = useState("");



  //Estado para Resultados
  const [ResultsC, setResultsC] = useState(null);
  const [resultsErr, setResultsErr] = useState("");
  const [resultsProps, setResultsProps] = useState({
    emotions: null,
    playlistUrl: "",
    isLoading: false,
     viewMode: "normal", 
     showSaved: false, 
  });

   // Estado para Olvidé mi contraseña
  const [ForgotPwdC, setForgotPwdC] = useState(null);
  const [forgotPwdErr, setForgotPwdErr] = useState("");
  const [ResetPwdC, setResetPwdC] = useState(null);
  const [resetPwdErr, setResetPwdErr] = useState("");
  const [resetData, setResetData] = useState(null); // { email, code, resetToken }

    // Estados para Historial
  const [HistorialC, setHistorialC] = useState(null);
  const [historialErr, setHistorialErr] = useState("");



    // Estado de usuario (lee localStorage si existe)
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch(e){ return null; }
  });

 useEffect(() => {
  const onGoHome = () => setMode("home");

   // Recibir evento desde MediaCapture para iniciar análisis y pasar a Resultados
    function goHistory() { setMode("history"); }
    function goLogin() { setMode("login"); }

  function prettyDetectFacesError(status, json){
  // backend nuevo: { error, message, name, code }
  const err = (json && (json.message || json.error)) || "";
  if (status === 415 || err === "unsupported_format") {
    return "Formato no soportado. Usa JPG o PNG (no HEIC/WEBP/CMYK).";
  }
  if (status === 413 || err === "file_too_large") {
    return "La imagen excede 5 MB. Comprime o elige otra.";
  }
  if (status === 0) {
    return "No se pudo contactar al backend (CORS/URL).";
  }
  if (json?.name === "UnrecognizedClientException") {
    return "Credenciales AWS inválidas (Access Key / Secret).";
  }
  if (json?.name === "InvalidSignatureException") {
    return "Firma AWS inválida (revisa reloj del sistema/región).";
  }
  if (json?.name === "AccessDeniedException") {
    return "AWS denegó DetectFaces (revisa políticas/role).";
  }
  return json?.message || `Error HTTP ${status} al analizar la imagen.`;
}
function moodFromEmotions(emotions){
  // toma el nombre tal como venga (es/en) y normaliza
  const raw = (emotions && emotions[0] && emotions[0].name) ? String(emotions[0].name).trim().toUpperCase() : "";

  // normalizaciones comunes (quitamos numerales tipo "1. ENOJO")
  const clean = raw.replace(/^\s*\d+\.\s*/, "");

  // mapa bilingüe → clave canónica que usa el backend
  const MAP = {
    "HAPPY":"HAPPY", "ALEGRIA":"HAPPY", "ALEGRÍA":"HAPPY",
    "SAD":"SAD", "TRISTEZA":"SAD",
    "CALM":"CALM", "CALMA":"CALM",
    "ANGRY":"ANGRY", "ENOJO":"ANGRY", "IRA":"ANGRY",
    "SURPRISED":"SURPRISED", "SORPRESA":"SURPRISED",
    "CONFUSED":"CONFUSED", "CONFUSION":"CONFUSED", "CONFUSIÓN":"CONFUSED",
    "FEAR":"FEAR", "MIEDO":"FEAR",
    "DISGUSTED":"DISGUSTED", "ASCO":"DISGUSTED",
    "UNKNOWN":"UNKNOWN", "NEUTRAL":"UNKNOWN", "NEUTRO":"UNKNOWN"
  };

  return MAP[clean] || "UNKNOWN";
}


// Reemplaza tu onAnalyze actual por este:
const onAnalyze = async (e) => {
  const blob = e?.detail?.imageBlob || null;
  // Método de captura usado en este flujo (cámara). Si luego usas archivo, cámbialo a 'subida_imagen'.
// Método de captura usado en este flujo (cámara). Si luego usas archivo, cambia a 'subida_imagen'.
setCaptureMethod("camara");



  // Mostrar la pantalla de resultados en modo "cargando"
  setResultsProps({ emotions: null, playlistUrl: "", isLoading: true });
  setMode("results");

  try {
    if (!blob) throw new Error("No hay imagen para analizar");

    // 1) Enviar como multipart/form-data (campo 'image')
    const fd = new FormData();
    fd.append("image", blob, "captura.jpg");

    // IMPORTANTE: usa tu base de API (4000 por defecto)
  const res = await fetch(`${API_BASE}/api/rekognition/detect-faces`, { method:"POST", body: fd });
const json = await res.json().catch(() => ({}));
console.log("detect-faces →", res.status, json);
if (!res.ok) {
  const msg = prettyDetectFacesError(res.status, json);
  throw new Error(msg);
}
    

    // 2) Tomar la PRIMERA cara y sus Top 3 emociones
    const face = Array.isArray(json?.faces) ? json.faces[0] : null;
    if (!face) {
      setResultsProps({ emotions: [], playlistUrl: "", isLoading: false });
      return;
    }

    // 3) Normalizar a [{ name, score }] con score en 0..1
    const emotions = (face.emotionsTop3 || []).map(em => ({
      name: em.Type || "UNKNOWN",
      score: (typeof em.Confidence === "number" ? em.Confidence : 0) / 100
    }));

    // 4) Entregar al componente de Resultados
// 4) Entregar emociones y, EN PARALELO, pedir playlist al backend
setResultsProps({ emotions, playlistUrl: "", isLoading: false });

// ===== PLAYLIST: fallback inmediato + reintentos =====
const FB = {
  HAPPY:     "37i9dQZF1DXdPec7aLTmlC",
  SAD:       "37i9dQZF1DX3YSRoSdA634",
  CALM:      "37i9dQZF1DX4WYpdgoIcn6",
  ANGRY:     "37i9dQZF1DX76Wlfdnj7AP",
  SURPRISED: "37i9dQZF1DXa3LlXtETKqH",
  CONFUSED:  "37i9dQZF1DX8Uebhn9wzrS",
  FEAR:      "37i9dQZF1DX59NCqCqJtoH",
  DISGUSTED: "37i9dQZF1DXci7j0DJQgGp",
  UNKNOWN:   "37i9dQZF1DX4WYpdgoIcn6"
};

const mood = moodFromEmotions(emotions);
const pref = (localStorage.getItem("anima_pref") || "").trim();

// 1) Pintar Fallback inmediato (garantiza 100% de visualización)
const fbId = FB[mood] || FB.UNKNOWN;
setResultsProps(prev => ({
  ...prev,
  playlistUrl: `https://open.spotify.com/embed/playlist/${fbId}`
}));

// 2) Intentar mejorar con backend (hasta 3 intentos con backoff)
const url = `${API_BASE}/api/spotify/playlists?mood=${encodeURIComponent(mood)}&pref=${encodeURIComponent(pref)}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (let attempt = 0; attempt < 3; attempt++) {
  try {
    const r = await fetch(url);
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.embedUrl) {
      setResultsProps(prev => ({ ...prev, playlistUrl: j.embedUrl }));
      break; // reemplaza el fallback y salimos
    }
  } catch {}
  await sleep(250 * (attempt + 1)); // 250ms, 500ms
}
// Si no hubo éxito, nos quedamos con el fallback ya pintado.


 } catch (err) {
  console.error(err);
  setResultsProps({
    emotions: [],
    playlistUrl: "",
    isLoading: false,
    error: err?.message || "No se pudo analizar la imagen."
  });
}

};



  const onLoggedOut = () => {
    try { localStorage.removeItem("token"); localStorage.removeItem("user"); } catch(_) {}
    setUser(null);
    setMode("home");
  };

  const onStorage = (e) => {
    if (e.key === "user") {
      try { setUser(JSON.parse(localStorage.getItem("user") || "null")); }
      catch(_) { setUser(null); }
    }
  };
  window.addEventListener('anima:goHistory', goHistory);
  window.addEventListener('anima:goHome', onGoHome);
  window.addEventListener('anima:loggedOut', onLoggedOut);
  window.addEventListener('storage', onStorage);
  window.addEventListener('anima:analyze', onAnalyze);

return () => {
  window.removeEventListener('anima:goHistory', goHistory);
  window.removeEventListener('anima:goHome', onGoHome);
  window.removeEventListener('anima:loggedOut', onLoggedOut);
  window.removeEventListener('storage', onStorage);
  window.removeEventListener('anima:analyze', onAnalyze);
};

}, []);

useEffect(() => {
    if (mode !== "test") return;

    async function loadTest() {
      try {
        setLoadErr("");
        window.__ANIMA_EMBEDDED_APP__ = true;

        // Si ya está disponible, úsalo
        if (window.MediaCapture || (window.AnimaUI && window.AnimaUI.MediaCapture)) {
          const Cmp = window.MediaCapture || window.AnimaUI.MediaCapture;
          setTestC(() => Cmp);
          return;
        }

        if (!window.Babel) {
          throw new Error("Babel no está cargado en index.html");
        }

        const res = await fetch("./MediaCapture.js", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo leer MediaCapture.js");
        const src = await res.text();

        const compiled = Babel.transform(src, { presets: ["react"] }).code;
        new Function(compiled)();

        const Cmp = window.MediaCapture || window.AnimaUI.MediaCapture;
        if (!Cmp) throw new Error("MediaCapture no se exportó correctamente");
        
        setTestC(() => Cmp);
      } catch (err) {
        console.error(err);
        setLoadErr(err.message || "Error cargando MediaCapture");
      }
    }

    loadTest();
  }, [mode]);

   useEffect(() => {
    if (mode !== "account") return;

    async function loadAccount() {
      try {
        setMiCuentaErr("");
        window.__ANIMA_EMBEDDED_APP__ = true;

        if (window.MiCuenta) {
          setMiCuentaC(() => window.MiCuenta);
          return;
        }

        if (!window.Babel) throw new Error("Babel no está cargado en index.html");

        const res = await fetch("./MiCuenta.js", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo leer MiCuenta.js");
        const src = await res.text();

        const compiled = Babel.transform(src, { presets: ["react"] }).code;
        new Function(compiled)();

        if (window.MiCuenta) {
          setMiCuentaC(() => window.MiCuenta);
          // después de setMiCuentaC(() => window.MiCuenta);
          

        } else {
          throw new Error("MiCuenta no se exportó correctamente");
        }
      } catch (err) {
        console.error(err);
        setMiCuentaErr(err.message || "Error cargando MiCuenta");
      }
    }

    loadAccount();
  }, [mode]); 

useEffect(() => {
  if (mode !== "results") return;
  async function loadResults() {
    try {
      setResultsErr("");
      window.__ANIMA_EMBEDDED_APP__ = true;

      const CmpNow = window.ResultadosTab || (window.AnimaUI && window.AnimaUI.ResultadosTab);
      if (CmpNow) { setResultsC(() => CmpNow); return; }

      if (!window.Babel) throw new Error("Babel no está cargado en index.html");
      const res = await fetch("./Resultados.js", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo leer Resultados.js");
      const src = await res.text();

      const compiled = Babel.transform(src, { presets: ["react"] }).code;
      new Function(compiled)();

      const Cmp = window.ResultadosTab || (window.AnimaUI && window.AnimaUI.ResultadosTab);
      if (!Cmp) throw new Error("ResultadosTab no se exportó correctamente");
      setResultsC(() => Cmp);
    } catch (err) {
      console.error(err);
      setResultsErr(err.message || "Error cargando Resultados");
    }
  }
  loadResults();
}, [mode]);
  

 // Carga dinámica de ForgotPassword cuando mode === "forgot-password"
  useEffect(() => {
    if (mode !== "forgot-password") return;

    async function loadForgotPwd() {
      try {
        setForgotPwdErr("");

        // Si ya está en memoria
        const CmpNow = window.ForgotPasswordPage || (window.AnimaUI && window.AnimaUI.ForgotPasswordPage);
        if (CmpNow) { setForgotPwdC(() => CmpNow); return; }

        if (!window.Babel) throw new Error("Babel no está cargado en index.html");

        const res = await fetch("./Olvido_Contraseña_CORREO.js", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo leer Olvido_Contraseña_CORREO.js");
        const src = await res.text();

        const compiled = Babel.transform(src, { presets: ["react"] }).code;
        new Function(compiled)();

        const Cmp = window.ForgotPasswordPage || (window.AnimaUI && window.AnimaUI.ForgotPasswordPage);
        if (!Cmp) throw new Error("ForgotPasswordPage no se exportó correctamente");
        setForgotPwdC(() => Cmp);
      } catch (err) {
        console.error(err);
        setForgotPwdErr(err.message || "Error cargando Olvidé mi contraseña");
      }
    }

    loadForgotPwd();
  }, [mode]);

  // Carga dinámica de NuevaContrasenaPage cuando mode === "reset-password"
  useEffect(() => {
    if (mode !== "reset-password") return;

    async function loadResetPwd() {
      try {
        setResetPwdErr("");

        const CmpNow = window.NuevaContrasenaPage || (window.AnimaUI && window.AnimaUI.NuevaContrasenaPage);
        if (CmpNow) { setResetPwdC(() => CmpNow); return; }

        if (!window.Babel) throw new Error("Babel no está cargado en index.html");

        const res = await fetch("./OC_Cambio.js", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo leer OC_Cambio.js");
        const src = await res.text();

        const compiled = Babel.transform(src, { presets: ["react"] }).code;
        new Function(compiled)();

        const Cmp = window.NuevaContrasenaPage || (window.AnimaUI && window.AnimaUI.NuevaContrasenaPage);
        if (!Cmp) throw new Error("NuevaContrasenaPage no se exportó correctamente");
        setResetPwdC(() => Cmp);
      } catch (err) {
        console.error(err);
        setResetPwdErr(err.message || "Error cargando Nueva contraseña");
      }
    }

    loadResetPwd();
  }, [mode]);

    // Listener para cambio de contraseña desde Mi Cuenta
  useEffect(() => {
    function handleChangePassword(e) {
      const userData = e.detail || {};
      setResetData({
        email: userData.email,
        isAuthenticated: true // Flag importante
      });
      setMode("reset-password");
    }

    window.addEventListener("anima:changePassword", handleChangePassword);
    return () => window.removeEventListener("anima:changePassword", handleChangePassword);
  }, []);

   // Carga dinámica de HistorialTab cuando mode === "history"
 // === HISTORY ===
useEffect(() => {
  if (mode !== "history") return;
  (async () => {
    try {
      setHistoryErr("");
      window.__ANIMA_EMBEDDED_APP__ = true;
      // ⬇️ 1) Checa por HistorialTab (no Historial)
      if (!window.HistorialTab) {
        const s = document.createElement("script");
        s.src = "./Historial.js"; // deja la ruta correcta a tu archivo
        document.body.appendChild(s);
        await new Promise((res, rej) => {
          s.onload = res;
          s.onerror = () => rej(new Error("No cargó Historial.js"));
        });
      }
      // ⬇️ 2) Asigna el componente correcto
      setHistoryC(() => window.HistorialTab);
    } catch (e) {
      console.error(e);
      setHistoryErr(e.message || "Error cargando historial");
    }
  })();
}, [mode]);



    // Listener para ir a historial desde Mi Cuenta
  useEffect(() => {
    function handleGoHistory() {
      setMode("history");
    }

    window.addEventListener("anima:goHistory", handleGoHistory);
    return () => window.removeEventListener("anima:goHistory", handleGoHistory);
  }, []);

  // Handler para ver detalles de un análisis del historial
function handleViewHistoryResult(item) {
  const emotions = (item?.emotions || []).map(e => ({
    name: String(e?.name || "UNKNOWN"),
    score: typeof e?.score === "number" ? (e.score > 1 ? e.score / 100 : e.score) : 0
  }));

  setResultsProps({
    emotions,
    playlistUrl: item?.playlistUrl || "",
    isLoading: false,
    viewMode: "history"  // 👈 modo lectura
  });

  setMode("results");
}




  // Handler cuando se cambia la contraseña desde sesión autenticada
  function handlePasswordChangedFromAccount() {
    setResetData(null);
    // Volver a Mi Cuenta
    setMode("account");
  }


  // Handler cuando se valida el código (desde ForgotPasswordPage)
  function handleCodeValidated(data) {
    setResetData(data); // { email, code, resetToken }
    setMode("reset-password");
  }

  // Handler cuando se cambia la contraseña exitosamente
  function handlePasswordChanged() {
    // Limpiar datos temporales
    setResetData(null);
  }

  
  // Logout handler
  // Logout sin confirm — la confirmación la hace HomeScreen con el modal
function handleLogout() {
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  } catch (_) {}
  setUser(null);
  setMode("home");
  window.dispatchEvent(new CustomEvent("anima:loggedOut"));
}


async function handleSavePlaylist() {
  try {
    // 0) Requisitos
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Inicia sesión para guardar tu playlist.");
      handleGoLoginFromResults();
      return;
    }
    if (!resultsProps?.emotions || !resultsProps?.emotions.length) {
      alert("No hay emociones para guardar. Repite el análisis.");
      return;
    }

    // 1) Crear análisis (usa el método de captura desde state)
    const { analisisId } = await apiFetch(`/api/analisis`, {
      method: "POST",
      body: JSON.stringify({ metodoCaptura: captureMethod || "camara" })
    });

    // 2) Registrar emociones
    const emociones = toBackendEmotions(resultsProps.emotions);
    await apiFetch(`/api/analisis/${analisisId}/emociones`, {
      method: "POST",
      body: JSON.stringify({ emociones })
    });

    // 3) Registrar playlist
    const embedUrl = resultsProps.playlistUrl || "";
    const spotifyId = extractSpotifyId(embedUrl);
    const spotifyUrl = embedUrl.replace("/embed", "");
    const nombre = `Recomendación Ánima — ${String(emociones?.[0]?.nombre || "UNKNOWN")}`;
    const totalCanciones = 0;

    await apiFetch(`/api/analisis/${analisisId}/playlist`, {
      method: "POST",
      body: JSON.stringify({ spotifyId, spotifyUrl, nombre, totalCanciones })
    });

  // 4) Mostrar modal “guardado”
setResultsProps(prev => ({ ...prev, showSaved: true }));   // 👈 abre el modal

  } catch (err) {
    console.error(err);
    alert(`No se pudo guardar: ${err.message || "error"}`);
  }
}


  function handleRetry() {
    setMode("test");
  }

    // Guardar resultado temporalmente antes de ir a login
  function handleGoLoginFromResults() {
    // Guardar el estado actual de resultados en sessionStorage
    try {
      sessionStorage.setItem('anima.pendingResult', JSON.stringify({
        emotions: resultsProps.emotions,
        playlistUrl: resultsProps.playlistUrl,
        timestamp: Date.now()
      }));
    } catch(e) { console.warn('No se pudo guardar resultado temporal', e); }
    setMode("login");
  }

  // Recuperar resultado pendiente al iniciar sesión
  function handleLoggedIn(userData) {
    setUser(userData);
    
    // Verificar si hay un resultado pendiente
    try {
      const pending = sessionStorage.getItem('anima.pendingResult');
      if (pending) {
        const data = JSON.parse(pending);
        // Solo recuperar si es reciente (menos de 30 min)
        if (Date.now() - data.timestamp < 30 * 60 * 1000) {
          setResultsProps({
            emotions: data.emotions,
            playlistUrl: data.playlistUrl,
            isLoading: false
          });
          sessionStorage.removeItem('anima.pendingResult');
          setMode("results");
          return;
        }
      }
    } catch(e) { console.warn('Error recuperando resultado pendiente', e); }
    
    // Si no hay resultado pendiente, ir a home
    setMode("home");
  }

  const handlers = {
    onGoLogin:    () => setMode("login"),
    onGoRegister: () => setMode("register"),
    onGoAccount:  () => setMode("account"),
    onTryTest:    () => setMode("test"), // abre el modo Test dentro del App
  };

  return (
    <div className="min-h-screen">
      {mode === "home" && <HomeScreen {...handlers} isAuthenticated={!!user} onLogout={handleLogout} />}
  

      {mode === "login" && (
        <LoginScreen
          onGoRegister={() => setMode("register")}
          onGoHome={() => setMode("home")}
          onLoggedIn={handleLoggedIn}
          onGoForgotPassword={() => setMode("forgot-password")}
        />
      )}

      {mode === "register" && (
        <RegisterScreen

        onGoHome={() => setMode("home")}

         onGoLogin={() => {
           // Mantener resultado pendiente al cambiar a login
           setMode("login");
         }}
         onLoggedIn={handleLoggedIn}
          
        />
      )}

       {mode === "forgot-password" && (
        forgotPwdErr
          ? <div style={{color:"#fff", padding:24}}>Error: {forgotPwdErr}</div>
          : (ForgotPwdC
              ? <ForgotPwdC
                  onGoLogin={() => setMode("login")}
                  onCodeValidated={handleCodeValidated}
                />
              : <div style={{color:"#fff", padding:24}}>Cargando...</div>)
      )}

      {mode === "reset-password" && (
        resetPwdErr
          ? <div style={{color:"#fff", padding:24}}>Error: {resetPwdErr}</div>
          : (ResetPwdC
              ? <ResetPwdC
                  resetData={resetData}
                  onGoLogin={() => setMode("login")}
                  onGoBack={() => setMode("account")}
                  onPasswordChanged={
                    resetData?.isAuthenticated 
                      ? handlePasswordChangedFromAccount 
                      : handlePasswordChanged
                  }
                />
              : <div style={{color:"#fff", padding:24}}>Cargando...</div>)
      )}

      {mode === "test" && (
        loadErr
          ? <div style={{color:"#fff", padding:24}}>Error: {loadErr}</div>
          : (TestC
              ? <TestC />
              : <div style={{color:"#fff", padding:24}}>Cargando Test…</div>)
      )}
            {mode === "account" && (
        miCuentaErr
          ? <div style={{color:"#fff", padding:24}}>Error: {miCuentaErr}</div>
          : (MiCuentaC
              ? <MiCuentaC />
              : <div style={{color:"#fff", padding:24}}>Cargando Cuenta…</div>)
      )}

{mode === "results" && (
  resultsErr
    ? <div style={{color:"#fff", padding:24}}>Error: {resultsErr}</div>
    : (ResultsC
        ? <ResultsC
  autoAnalyze={false}
  emotions={resultsProps.emotions}
  playlistUrl={resultsProps.playlistUrl}
  isLoading={resultsProps.isLoading}
  isAuthenticated={!!user}
  viewMode={resultsProps.viewMode}
  onGoBack={() => setMode("history")}
  onSavePlaylist={handleSavePlaylist}
  onRetry={handleRetry}
  onGoLogin={handleGoLoginFromResults}
  onGoHome={() => setMode("home")}
  /* 👇 nuevas para el modal */
  showSaved={resultsProps.showSaved}
  onSavedAnotherScan={() => { setResultsProps(p=>({ ...p, showSaved:false })); setMode("test"); }}
  onSavedGoAccount={() => { setResultsProps(p=>({ ...p, showSaved:false })); setMode("account"); }}
  onCloseSaved={() => setResultsProps(p=>({ ...p, showSaved:false }))}
/>

        : <div style={{color:"#fff", padding:24}}>Cargando Resultados…</div>)
)}

              {mode === "history" && (
  historyErr
    ? <div style={{color:"#fff", padding:24}}>Error: {historyErr}</div>
    : (HistoryC
        ? <HistoryC
            onGoBack={() => setMode("account")}
            onGoHome={() => setMode("home")}
            onViewResult={handleViewHistoryResult}  // si aún no lo usas, puedes omitirlo
          />
        : <div style={{color:"#fff", padding:24}}>Cargando...</div>)
)}

    </div>
  );
}

/* =================== HOME — Estilo AWS/Ánima (sin “Analizar emoción”) =================== */
function HomeScreen({
  onGoLogin,
  onGoRegister,
  onGoAccount,
  onTryTest,
  isAuthenticated,
  onLogout
}){
  const [showLogout, setShowLogout] = useState(false);
const [, force] = React.useReducer(x=>x+1, 0);
useEffect(() => {
  const onResize = () => force();
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  // Paleta y estilos inline (compatibles con tu setup)
  const API_BASE = window.API_URL || "http://localhost:4000";
  // Paleta y estilos inline (compatibles con tu setup)
  const C = {
    bg1:"#2A1541", bg2:"#120F1E", bg3:"#1A1230",
    mor:"#6C63FF", mag:"#FF2DAA",
    text:"#FFFFFF", text2:"#C9C9D1", card:"#1B1727",
    border:"rgba(255,255,255,.10)"
  };

  // ancho actual (para decidir ajustes)
  const W = typeof window !== "undefined" ? window.innerWidth : 1200;
  const isSm = W < 600;
  const isMd = W >= 600 && W < 992;
  const isLg = W >= 992;

  const S = {
    page:{
  minHeight:"100vh",
  color:C.text,
  background:`linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
  fontFamily:"system-ui, Segoe UI, Inter, Roboto, Arial",
  boxSizing:"border-box"            // 👈 nuevo
  
},
mediaBox:{
  position:"relative",
  width:"100%",
  height: isSm ? 140 : 180,
  overflow:"hidden",
  borderTopLeftRadius:18,
  borderTopRightRadius:18,
  background:"#0d0b16"
},
imgCover:{
  position:"absolute",
  inset:0,
  width:"100%",
  height:"100%",
  objectFit:"cover",
  display:"block"
},
mediaShade:{
  position:"absolute",
  inset:0,
  background:"linear-gradient(180deg, rgba(0,0,0,.0) 0%, rgba(0,0,0,.15) 60%, rgba(0,0,0,.28) 100%)"
},

container:{
  width:"100%",
  maxWidth: isLg ? 1200 : (isMd ? 960 : 640),
  margin:"0 auto",

  // 👇 padding lateral “seguro” (respeta notch)
  paddingLeft: isSm ? "max(16px, env(safe-area-inset-left))"  : "24px",
  paddingRight: isSm ? "max(16px, env(safe-area-inset-right))" : "24px",

  // respiración vertical global (sin tocar laterales)
  paddingTop: 0,
  paddingBottom: 0,
  boxSizing:"border-box"            // 👈 nuevo
},

    halo:(side)=>({
      position:"absolute", [side]:-120,
      top:side==="left"?40:"auto", bottom:side==="right"?-120:"auto",
      width:380, height:380, borderRadius:9999, filter:"blur(90px)",
      background:`radial-gradient(circle,${side==="left"?C.mor:C.mag} 0%, transparent 60%)`,
      opacity:.45, pointerEvents:"none"
    }),
    header:{
      position:"sticky", top:0, zIndex:20,
      backdropFilter:"saturate(120%) blur(6px)",
      background:"rgba(0,0,0,.12)", borderBottom:`1px solid ${C.border}`
    },
    btn:(kind)=>({
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      minHeight: isSm ? 36 : 40,
      padding: isSm ? "8px 12px" : "10px 16px",
      borderRadius:14, textDecoration:"none",
      color:"#fff", fontWeight:600, cursor:"pointer",
      fontSize: isSm ? 13 : 14,
      lineHeight:1.1,
      ...(kind==="ghost" && { border:`1px solid ${C.border}`, color:"#e5e5f5", background:"transparent" }),
      ...(kind==="grad"  && { background:`linear-gradient(90deg,${C.mag},${C.mor})`, border:"none" })
    }),
    hero:{
  padding: isSm ? "28px 0 8px" : "48px 0 12px",
  paddingLeft:  isSm ? "max(16px, env(safe-area-inset-left))"  : "24px",
  paddingRight: isSm ? "max(16px, env(safe-area-inset-right))" : "24px"
},
section:{
  padding: isSm ? "22px 0" : "28px 0",
  paddingLeft:  isSm ? "max(16px, env(safe-area-inset-left))"  : "24px",
  paddingRight: isSm ? "max(16px, env(safe-area-inset-right))" : "24px"
},
ctaWrap:{
  padding: isSm ? "28px 0 48px" : "36px 0 64px",
  paddingLeft:  isSm ? "max(16px, env(safe-area-inset-left))"  : "24px",
  paddingRight: isSm ? "max(16px, env(safe-area-inset-right))" : "24px"
},

    h1:{
      fontSize:"clamp(26px, 6vw, 44px)",
      lineHeight:1.18,
      margin:isSm ? "8px 0 6px 0" : "12px 0 8px 0",
      letterSpacing:isSm ? 0 : ".2px"
    },
    lead:{
      color:C.text2,
      maxWidth:820,
      fontSize: isSm ? 14.5 : (isMd ? 16 : 18),
      lineHeight: isSm ? 1.5 : 1.6
    },
    heroBar:{
      display:"flex",
      gap:12,
      flexWrap:"wrap",
      marginTop:isSm ? 14 : 18
    },
    
    gridCards:{
      display:"grid",
      gap: isSm ? 12 : 18,
      gridTemplateColumns: isLg ? "repeat(3, 1fr)" : (isMd ? "repeat(2, 1fr)" : "1fr"),
      marginTop:isSm ? 12 : 18
    },
    card:{
      background:`color-mix(in oklab, ${C.card} 82%, transparent)`,
      border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden"
    },
    media:(grad)=>({ height:isSm ? 120 : 160, background:grad }),
    cardBody:{ padding:isSm ? 12 : 16 },
    small:{ fontSize:isSm ? 11 : 12, color:"#A7A7BD", letterSpacing:.2 },
    split:{
      display:"grid",
      gap:isSm ? 16 : 24,
      gridTemplateColumns: isLg ? "1.2fr .8fr" : "1fr",
      alignItems:"start"
    },
    faqItem:{
      border:`1px solid ${C.border}`, borderRadius:14,
      padding:isSm ? "10px 12px" : "12px 14px",
      background:"rgba(255,255,255,.04)"
    },
    ctaWrap:{ padding:isSm ? "28px 0 48px" : "36px 0 64px" },
    cta:{
      textAlign:"center",
      border:`1px solid ${C.border}`, borderRadius:24,
      background:`linear-gradient(90deg,${C.mag}22,${C.mor}22)`,
      padding:isSm ? "22px 16px" : "28px 20px"
    },
    bigBtn:{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      width: isSm ? "100%" : "auto",
      minHeight: isSm ? 42 : 46,
      padding:isSm ? "10px 18px" : "14px 28px",
      borderRadius:999,
      background:`linear-gradient(90deg,${C.mag},${C.mor})`,
      color:"#fff", fontWeight:700, letterSpacing:.5,
      fontSize:isSm ? 16 : 18
    },

    // modal (sin cambios funcionales)
    modalBack:{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", display:"grid", placeItems:"center", zIndex:1000 },
    modal:{
      width:"min(520px, 92vw)", background: C.card, color:"#fff",
      border:`1px solid ${C.border}`, borderRadius:16, padding:18,
      boxShadow:"0 20px 60px rgba(0,0,0,.5)"
    },
    modalHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center" },
    modalTitle:{ fontSize:18, fontWeight:800, margin:0 },
    xBtn:{ background:"transparent", color:"#fff", border:`1px solid ${C.border}`, borderRadius:10, padding:"6px 10px", cursor:"pointer" },
    modalBody:{ color: C.text2, marginTop:8, lineHeight:1.5 },
    modalBtns:{ display:"flex", gap:10, marginTop:14, justifyContent:"flex-end" }
  };


  const twoCols = typeof window!=="undefined" && window.innerWidth>=992;
  if (twoCols){ S.gridCards.gridTemplateColumns="repeat(3, 1fr)"; S.split.gridTemplateColumns="1.2fr .8fr"; }

  return (

    <div style={S.page}>
      <div style={{position:"relative"}}>
        <div style={S.halo("left")} />
        <div style={S.halo("right")} />
        {/* Modal confirmar cerrar sesión */}
{showLogout && (
  <div style={S.modalBack} onClick={(e)=>{ if(e.target===e.currentTarget) setShowLogout(false); }}>
    <div style={S.modal} role="dialog" aria-modal="true">
      <div style={S.modalHeader}>
        <h4 style={S.modalTitle}>¿Cerrar sesión?</h4>
        <button style={S.xBtn} onClick={()=>setShowLogout(false)}>✕</button>
      </div>
      <div style={S.modalBody}>
        ¿Estás seguro que quieres cerrar sesión?
      </div>
      <div style={S.modalBtns}>
        <button style={S.btn("ghost")} onClick={()=>setShowLogout(false)}>Cancelar</button>
        <button
          style={{ ...S.btn("grad"), border:"none" }}
          onClick={()=>{ setShowLogout(false); onLogout(); }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  </div>
)}

      </div>

      {/* HEADER */}
      <header style={S.header}>
        <div style={{ 
  ...S.container,
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  paddingTop:12,          // 👈 solo alto; laterales los da S.container
  paddingBottom:12
}}>
          <a href="#" onClick={(e)=>e.preventDefault()} style={{display:"flex", alignItems:"center", gap:12, color:"#fff", textDecoration:"none"}}>
            <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${C.mag},${C.mor})`, boxShadow:"0 10px 30px rgba(0,0,0,.4)"}} />
            <strong>Ánima</strong>
          </a>

        
<div style={{display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end"}}>
  <button style={S.btn("ghost")} onClick={onTryTest}>Escanear</button>

  {!isAuthenticated && (
    <>
      <button style={S.btn("ghost")} onClick={onGoLogin}>Iniciar sesión</button>
      <button style={S.btn("grad")}  onClick={onGoRegister}>Crear cuenta</button>
    </>
  )}

  {isAuthenticated && (
    <>
      <button style={S.btn("ghost")} onClick={onGoAccount}>Mi cuenta ▾</button>
      <button style={S.btn("ghost")} onClick={() => setShowLogout(true)}>Cerrar sesión</button>
    </>
  )}
</div>

        </div>
      </header>

{/* HERO */}
<section style={S.hero}>
  <div style={S.container}>
    <h1 style={S.h1}>
      Desde usuarios hasta equipos, Ánima es la forma moderna de elegir música con emociones
    </h1>

    <p style={S.lead}>
      Únete a la comunidad que ya descubre playlists personalizadas con un simple escaneo.
      Detectamos tu emoción y te sugerimos música para acompañar o transformar tu estado de ánimo.
    </p>

    <div style={S.heroBar}>
      {!isAuthenticated ? (
        <>
          <button style={S.btn("ghost")} onClick={onGoLogin}>Iniciar sesión</button>
          <button style={S.btn("grad")}  onClick={onGoRegister}>Crear cuenta</button>
        </>
      ) : (
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span style={{color:"#cfcfe6"}}>¡Bienvenido!</span>
        </div>
      )}
    </div>
  </div>
</section>


      {/* EXPLORAR — Cards */}
<section style={S.section}>
  <div style={S.container}>
    <h3>Explorar por emoción</h3>
<div style={S.gridCards}>
  {[
    { tag:"Información ejecutiva", title:"Escucha inteligente lista para usar", src:"./images/imagen-audifonos.png", alt:"Persona con audífonos escuchando música" },
    { tag:"Agentes de IA",        title:"Cómo recomendamos canciones con emociones", src:"./images/imagen-chico.png",      alt:"Joven mirando a cámara con luz neón" },
    { tag:"Modelos de IA",        title:"Ajusta la recomendación a tu objetivo",    src:"./images/imagen-resltados.png",  alt:"Resultados de análisis con tarjetas" }
  ].map((c, i)=>(
    <article key={i} style={S.card}>
      <div style={S.mediaBox}>
        <img src={c.src} alt={c.alt} style={S.imgCover}/>
        <div style={S.mediaShade}/>
      </div>
      <div style={S.cardBody}>
        <div style={{...S.small, marginBottom:6}}>{c.tag}</div>
        <div style={{fontWeight:600}}>{c.title}</div>
      </div>
    </article>
  ))}
</div>

  </div>
</section>

      {/* ¿Por qué Ánima? + FAQ */}
<section style={S.section}>
  <div style={S.container}>
    <div style={S.split}>
      <div>
        <h3>¿Por qué Ánima?</h3>
        <p style={{color:C.text2}}>
          Ánima es una experiencia musical personalizada. Con un análisis rápido y seguro,
          te ofrecemos playlists que conectan contigo. Ahorra tiempo eligiendo qué escuchar
          y descubrí música que realmente te acompaña.
        </p>
      </div>

      <div>
        {[
          ["Privacidad y control", "Procesamos tus imágenes solo para el análisis. Tú decides qué guardar."],
          ["Integración con Spotify", "Escucha al instante en tu plataforma favorita."],
          ["Personalización real", "Ajusta si querés amplificar o cambiar tu estado de ánimo."],
          ["Experiencia comprobada", "Interfaz clara, resultados en segundos."]
        ].map((f,i)=>(
          <details key={i} style={{...S.faqItem, marginBottom:10}}>
            <summary style={{cursor:"pointer", fontWeight:600}}>{f[0]}</summary>
            <p style={{color:C.text2, marginTop:6}}>{f[1]}</p>
          </details>
        ))}
      </div>
    </div>
  </div>
</section>


      {/* CTA FINAL */}
<section style={S.ctaWrap}>
  <div style={S.container}>
    <div style={S.cta}>
      <h3 style={{margin:"0 0 8px 0"}}>¿Listo para probarlo?</h3>
      <p style={{color:C.text2, marginTop:0}}>Haz el test y recibí tu primera playlist personalizada.</p>
      <button style={S.bigBtn} onClick={onTryTest}>PRUÉBALO</button>
      <div style={{marginTop:16}}>
        {!isAuthenticated && (
          <button style={{...S.btn("ghost"), marginRight:8}} onClick={onGoRegister}>
            Crear una cuenta
          </button>
        )}
      </div>
    </div>
  </div>
</section>


<footer style={S.section}>
  <div style={{...S.container, color:"#A0A0BE", fontSize:13}}>
    © {new Date().getFullYear()} Ánima · Privacidad · Términos · Preferencias de cookies
  </div>
</footer>

    </div>
  );
}

/* =================== LOGIN =================== */
function LoginScreen({ onGoRegister, onGoHome, onLoggedIn, onGoForgotPassword }){
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e){
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const body = { email: form.get("email"), password: form.get("password") };

    try{
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok){ throw new Error(data?.message || "Credenciales inválidas"); }

      // Guardar token/usuario y notificar App
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      // Actualizar App (si se pasó el handler)
      if (typeof onLoggedIn === "function") onLoggedIn(data.user);
      else onGoHome?.();

    }catch(err){
      setError(err.message || "Error al iniciar sesión");
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="layout">
      <aside className="brand">
        <div className="brand-inner">
          <Logo />
          <h1>Ánima</h1>
          <p className="tag">Escucha tus emociones</p>
          <div className="shine" />
        </div>
        <footer className="brand-footer">© {new Date().getFullYear()} </footer>
      </aside>

      <main className="panel">
        <div className="card">
          <h2>Inicia sesión</h2>
          <p className="sub">Usa tu cuenta para continuar</p>

          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Correo electrónico</span>
              <input name="email" type="email" placeholder="tu@email.com" required />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="pwd">
                <input
                  name="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  required
                />
                <button type="button" className="ghost"
                        onClick={() => setShowPwd(v => !v)}
                        aria-label={showPwd ? "Ocultar" : "Mostrar"}>
                  <Eye show={!showPwd}/>
                </button>
              </div>
            </label>

            <div className="row between">
              <label className="check"><input type="checkbox"/><span>Recuérdame</span></label>

             <a className="link" href="#" onClick={(e)=>{e.preventDefault(); if(typeof onGoForgotPassword === 'function') onGoForgotPassword();}}>
               ¿Olvidaste tu contraseña?
             </a>

            </div>

            {error && <div className="error">{error}</div>}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <p className="foot">
              ¿No tienes cuenta?{" "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoRegister();}}>
                Crear cuenta
              </a>
              {"  ·  "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoHome();}}>
                Ir al inicio
              </a>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =================== REGISTRO =================== */
function RegisterScreen({ onGoLogin, onGoHome, onLoggedIn }){
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [okMsg, setOkMsg]   = useState("");
  const redirectTimer = React.useRef(null);

  async function handleSubmit(e){
    e.preventDefault();
    setError(""); setOkMsg("");

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const nombre   = form.get("nombre")?.trim();
    const email    = form.get("email")?.trim().toLowerCase();
    const password = form.get("password") || "";
    const confirm  = form.get("confirm") || "";

    if(!nombre || !email || !password){
      setError("Completa los campos requeridos."); return;
    }
    if(password.length < 8){
      setError("La contraseña debe tener al menos 8 caracteres."); return;
    }
    if(password !== confirm){
      setError("Las contraseñas no coinciden."); return;
    }

    try{
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName: nombre })
      });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok){ throw new Error(data?.message || "No se pudo crear la cuenta"); }

      formEl.reset();
      setShowPwd(false);
      setError("");
      setOkMsg("¡Cuenta creada! Redirigiendo...");

      // Redirigir a Login tras un breve lapso para que el usuario vea el mensaje
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
      redirectTimer.current = setTimeout(() => {
       // Si el backend ya devuelve token en registro, podemos iniciar sesión directamente
       if (data.token && data.user) {
         localStorage.setItem("token", data.token);
         localStorage.setItem("user", JSON.stringify(data.user));

         if (typeof onLoggedIn === "function") {
           onLoggedIn(data.user);
         } else {
           onGoHome?.();
         }

       } else {
         onGoLogin?.();
       }

      }, 900);

    }catch(err){
      setOkMsg("");
      setError(err.message || "Error al registrar");
    }finally{
      setLoading(false);
    }
  }

  // CSS global: reset margenes y box-sizing sin usar JSX
// ——— CSS responsivo para Login/Registro (clases existentes) ———
useEffect(() => {
const css = `
/* ======== FIX global: homogeneiza el fondo y elimina la línea ======== */
.layout { position: relative; isolation: isolate; }

/* Capa suave para toda la vista */
.layout::after{
  content:"";
  position: fixed; inset:0;
  pointer-events:none;
  z-index:0;
  background: linear-gradient(
    180deg,
    rgba(18,15,30,0) 0%,
    rgba(18,15,30,.44) 52%,
    rgba(18,15,30,.82) 100%
  );
}

/* Refuerzo en el borde inferior (por si el corte aparece abajo) */
.layout::before{
  content:"";
  position: fixed; left:0; right:0; bottom:0; height:260px;
  pointer-events:none; z-index:0;
  background: linear-gradient(180deg, rgba(18,15,30,0) 0%, rgba(18,15,30,1) 100%);
}

/* Garantiza que panel/brand queden por encima del velo */
.panel, .brand { position: relative; z-index:1; }

`;


  const tag = document.createElement('style');
  tag.setAttribute('data-anima-login-css', 'true');
  tag.textContent = css;
  document.head.appendChild(tag);
  return () => { if (tag.parentNode) tag.parentNode.removeChild(tag); };
}, []);



  return (
    <div className="layout">
      <aside className="brand">
        <div className="brand-inner">
          <Logo />
          <h1>Ánima</h1>
          <p className="tag">Escucha tus emociones</p>
          <div className="shine" />
        </div>
        <footer className="brand-footer">© {new Date().getFullYear()} </footer>
      </aside>

      <main className="panel">
        <div className="card">
          <h2>Crea tu cuenta</h2> 
          <p className="sub">Regístrate para continuar</p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Nombre completo</span>
              <input name="nombre" type="text" placeholder="Nombre" required />
            </label>

            <label className="field">
              <span>Correo electrónico</span>
              <input name="email" type="email" placeholder="tu@email.com" required />
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="pwd">
                <input
                  name="password"
                  type={showPwd ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button type="button" className="ghost"
                        onClick={() => setShowPwd(v => !v)}
                        aria-label={showPwd ? "Ocultar" : "Mostrar"}>
                  <Eye show={!showPwd}/>
                </button>
              </div>
            </label>

            <label className="field">
              <span>Confirmar contraseña</span>
              <input name="confirm" type={showPwd ? "text" : "password"} placeholder="Repite tu contraseña" required />
            </label>

            {error && <div className="error">{error}</div>}
            {okMsg && (
              <div className="error" style={{borderColor:'#54d6a155', background:'#0f1a14', color:'#c9ffe3'}}>
                {okMsg}
              </div>
            )}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>

            <p className="foot">
              ¿Ya tienes cuenta?{" "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoLogin();}}>
                Inicia sesión
              </a>
              {"  ·  "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoHome();}}>
                Ir al inicio
              </a>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

/* ================ UI helpers ================ */
function Eye({show}){
  return show ? (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M1 12s4-7 11-7c2.1 0 4 .6 5.7 1.6M23 12s-4 7-11 7c-2.1 0-4-.6-5.7-1.6" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}

function Logo(){
  return (
    <div className="logo"> 
      <img src="./images/Logo-Anima.jpg" alt="Logo Ánima" class="logo-img" width="128" height="128" loading="eager" />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
