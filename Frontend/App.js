/* global React, ReactDOM, Babel */
const { useState, useEffect } = React;
const API_BASE = window.API_URL || "http://localhost:4000";

/* =================== APP ROOT =================== */
function App(){
  const [mode, setMode]   = useState("home"); // "home" | "login" | "register" | "test"
  const [TestC, setTestC] = useState(null);   // componente TestPage cuando esté listo
  const [loadErr, setLoadErr] = useState("");
  const [MiCuentaC, setMiCuentaC] = useState(null); // componente MiCuenta cuando esté listo
  const [miCuentaErr, setMiCuentaErr] = useState("");

  //Estado para Resultados
  const [ResultsC, setResultsC] = useState(null);
  const [resultsErr, setResultsErr] = useState("");
  const [resultsProps, setResultsProps] = useState({
    emotions: null,
    playlistUrl: "",
    isLoading: false,
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
   const onAnalyze = async (e) => {
     const blob = e?.detail?.imageBlob || null;
     // Placeholder: navegar a resultados en estado de carga
     setResultsProps({ emotions: null, playlistUrl: "", isLoading: true });
     setMode("results");

     // Integración backend (ejemplo):
     // const fd = new FormData(); fd.append("image", blob, "captura.jpg");
     // const res = await fetch(`${API_BASE}/analyze`, { method: "POST", body: fd });
     // const data = await res.json();
     // setResultsProps({ emotions: data.emotions, playlistUrl: data.playlistUrl, isLoading: false });

     // Simulación mientras no hay backend:
     setTimeout(() => {
       setResultsProps({
         emotions: [
           { name: "Alegría", score: 0.62 },
           { name: "Sorpresa", score: 0.21 },
           { name: "Tristeza", score: 0.17 },
         ],
         playlistUrl: "",
         isLoading: false,
       });
     }, 900);
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

  window.addEventListener('anima:goHome', onGoHome);
  window.addEventListener('anima:loggedOut', onLoggedOut);
  window.addEventListener('storage', onStorage);
  window.addEventListener('anima:analyze', onAnalyze);

  return () => {
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
  useEffect(() => {
    if (mode !== "history") return;

    async function loadHistorial() {
      try {
        setHistorialErr("");

        const CmpNow = window.HistorialTab || (window.AnimaUI && window.AnimaUI.HistorialTab);
        if (CmpNow) { setHistorialC(() => CmpNow); return; }

        if (!window.Babel) throw new Error("Babel no está cargado en index.html");

        const res = await fetch("./Historial.js", { cache: "no-store" });
        if (!res.ok) throw new Error("No se pudo leer Historial.js");
        const src = await res.text();

        const compiled = Babel.transform(src, { presets: ["react"] }).code;
        new Function(compiled)();

        const Cmp = window.HistorialTab || (window.AnimaUI && window.AnimaUI.HistorialTab);
        if (!Cmp) throw new Error("HistorialTab no se exportó correctamente");
        setHistorialC(() => Cmp);
      } catch (err) {
        console.error(err);
        setHistorialErr(err.message || "Error cargando Historial");
      }
    }

    loadHistorial();
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
    // Llevar a resultados con los datos del historial
    setMode("results");
    // Aquí puedes pasar los datos a ResultadosTab si lo necesitas
    // Por ahora solo navegamos
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
  function handleLogout() {
// Confirmar antes de cerrar sesión
    const ok = window.confirm("¿Estás seguro que quieres cerrar sesión?");
    if (!ok) return;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setMode("home");
    // Notificar otras partes si es necesario
    window.dispatchEvent(new CustomEvent("anima:loggedOut"));
  }

  function handleSavePlaylist() {
    // Placeholder: aquí puedes guardar en tu backend el historial del resultado
    alert("Guardar playlist: placeholder");
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
                 emotions={resultsProps.emotions}
                 playlistUrl={resultsProps.playlistUrl}
                 isLoading={resultsProps.isLoading}
                 isAuthenticated={!!user}
                 onSavePlaylist={handleSavePlaylist}
                 onRetry={handleRetry}
                 onGoLogin={handleGoLoginFromResults}
                 onGoHome={() => setMode("home")} 
               />
             : <div style={{color:"#fff", padding:24}}>Cargando Resultados…</div>)
     )}
     {mode === "history" && (
        historialErr
          ? <div style={{color:"#fff", padding:24}}>Error: {historialErr}</div>
          : (HistorialC
              ? <HistorialC
                  onGoBack={() => setMode("account")}
                  onGoHome={() => setMode("home")}
                  onViewResult={handleViewHistoryResult}
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
  // Paleta y estilos inline (compatibles con tu setup)
  const C = {
    bg1:"#2A1541", bg2:"#120F1E", bg3:"#1A1230",
    mor:"#6C63FF", mag:"#FF2DAA",
    text:"#FFFFFF", text2:"#C9C9D1", card:"#1B1727",
    border:"rgba(255,255,255,.10)"
  };
  const S = {
    page:{
      minHeight:"100vh", color:C.text,
      background:`linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
      fontFamily:"system-ui, Segoe UI, Inter, Roboto, Arial"
    },
    container:{maxWidth:1200, margin:"0 auto", padding:"0 24px"},
    halo:(side)=>({
      position:"absolute", [side]:-120, top:side==="left"?40:"auto", bottom:side==="right"?-120:"auto",
      width:380, height:380, borderRadius:9999, filter:"blur(90px)",
      background:`radial-gradient(circle,${side==="left"?C.mor:C.mag} 0%, transparent 60%)`,
      opacity:.45, pointerEvents:"none"
    }),
    header:{
      position:"sticky", top:0, zIndex:20,
      backdropFilter:"saturate(120%) blur(6px)",
      background:"rgba(0,0,0,.12)", borderBottom:`1px solid ${C.border}`
    },
    navA:{color:"#cfcfe6", textDecoration:"none", padding:"10px 12px", borderRadius:10},
    btn:(kind)=>({
      display:"inline-block", padding:"10px 16px", borderRadius:14, textDecoration:"none",
      color:"#fff", fontWeight:600, cursor:"pointer",
      ...(kind==="ghost" && { border:`1px solid ${C.border}`, color:"#e5e5f5", background:"transparent" }),
      ...(kind==="grad"  && { background:`linear-gradient(90deg,${C.mag},${C.mor})` })
    }),
    hero:{ padding:"48px 0 12px" },
    h1:{ fontSize:40, lineHeight:1.2, margin:"12px 0 8px 0" },
    lead:{ color:C.text2, maxWidth:820, fontSize:18 },
    heroBar:{ display:"flex", gap:12, flexWrap:"wrap", marginTop:18 },
    scanChip:{
      padding:"10px 16px", borderRadius:999, background:"rgba(255,255,255,.06)",
      border:`1px solid ${C.border}`, cursor:"pointer"
    },
    section:{ padding:"28px 0" },
    gridCards:{ display:"grid", gap:18, gridTemplateColumns:"1fr", marginTop:18 },
    card:{
      background:`color-mix(in oklab, ${C.card} 82%, transparent)`,
      border:`1px solid ${C.border}`, borderRadius:18, overflow:"hidden"
    },
    media:(grad)=>({ height:160, background:grad }),
    cardBody:{ padding:16 },
    small:{ fontSize:12, color:"#A7A7BD", letterSpacing:.2 },
    split:{ display:"grid", gap:24, gridTemplateColumns:"1fr", alignItems:"start" },
    faqItem:{ border:`1px solid ${C.border}`, borderRadius:14, padding:"12px 14px", background:"rgba(255,255,255,.04)" },
    ctaWrap:{ padding:"36px 0 64px" },
    cta:{ textAlign:"center", border:`1px solid ${C.border}`, borderRadius:24, background:`linear-gradient(90deg,${C.mag}22,${C.mor}22)`, padding:"28px 20px" },
    bigBtn:{ display:"inline-block", padding:"14px 28px", borderRadius:999, background:`linear-gradient(90deg,${C.mag},${C.mor})`, color:"#fff", fontWeight:700, letterSpacing:.5, fontSize:18 }
  };
  const twoCols = typeof window!=="undefined" && window.innerWidth>=992;
  if (twoCols){ S.gridCards.gridTemplateColumns="repeat(3, 1fr)"; S.split.gridTemplateColumns="1.2fr .8fr"; }

  return (
    <div style={S.page}>
      <div style={{position:"relative"}}>
        <div style={S.halo("left")} />
        <div style={S.halo("right")} />
      </div>

      {/* HEADER */}
      <header style={S.header}>
        <div style={{...S.container, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px"}}>
          <a href="#" onClick={(e)=>e.preventDefault()} style={{display:"flex", alignItems:"center", gap:12, color:"#fff", textDecoration:"none"}}>
            <div style={{width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${C.mag},${C.mor})`, boxShadow:"0 10px 30px rgba(0,0,0,.4)"}} />
            <strong>Ánima</strong>
          </a>

        
          <div style={{display:"flex", gap:8}}>
            <button style={S.btn("ghost")} onClick={onTryTest}>Escanear</button>

            {/* Mostrar botones de login/registro solo si NO está autenticado */}
            {!isAuthenticated && (
              <>
                <button style={S.btn("ghost")} onClick={onGoLogin}>Iniciar sesión</button>
                <button style={S.btn("grad")}  onClick={onGoRegister}>Crear cuenta</button>
              </>
            )}

            {/* Mostrar Mi cuenta siempre */}
            {isAuthenticated && (
              <button style={S.btn("ghost")} onClick={onGoAccount}>Mi cuenta ▾</button>
            )}
            {/* Mostrar Cerrar sesión solo si está autenticado */}
            {isAuthenticated && (
              <button style={S.btn("ghost")} onClick={onLogout}>Cerrar sesión</button>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{...S.container, ...S.hero}}>
       {/*
        <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
          <span style={S.scanChip} onClick={onTryTest}>Escanear</span>
        </div>*/}

        <h1 style={S.h1}>Desde usuarios hasta equipos, Ánima es la forma moderna de elegir música con emociones</h1>
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
      </section>

      {/* EXPLORAR — Cards con “fotos” (gradientes) */}
      <section style={{...S.container, ...S.section}}>
        <h3>Explorar por emoción</h3>
        <div style={S.gridCards}>
          {[
            {tag:"Información ejecutiva", title:"Escucha inteligente lista para usar", grad:`linear-gradient(135deg, ${C.mor}, ${C.bg1})`},
            {tag:"Agentes de IA",       title:"Cómo recomendamos canciones con emociones", grad:`linear-gradient(135deg, ${C.mag}, ${C.mor})`},
            {tag:"Modelos de IA",       title:"Ajusta la recomendación a tu objetivo", grad:`linear-gradient(135deg, ${C.bg1}, ${C.mag})`},
          ].map((c, i)=>(
            <article key={i} style={S.card}>
              <div style={S.media(c.grad)} />
              <div style={S.cardBody}>
                <div style={{...S.small, marginBottom:6}}>{c.tag}</div>
                <div style={{fontWeight:600}}>{c.title}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ¿Por qué Ánima? + FAQ */}
      <section style={{...S.container, ...S.section}}>
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
      </section>

      {/* CTA FINAL */}
      <section style={{...S.container, ...S.ctaWrap}}>
        <div style={S.cta}>
          <h3 style={{margin:"0 0 8px 0"}}>¿Listo para probarlo?</h3>
          <p style={{color:C.text2, marginTop:0}}>Haz el test y recibí tu primera playlist personalizada.</p>
          <button style={S.bigBtn} onClick={onTryTest}>PRUÉBALO</button>
          <div style={{marginTop:16}}>

            {!isAuthenticated && (
              <button style={{...S.btn("ghost"), marginRight:8}} onClick={onGoRegister}>Crear una cuenta</button>
            )}

          </div>
        </div>
      </section>

      <footer style={{...S.container, color:"#A0A0BE", fontSize:13, padding:"0 0 24px"}}>
        © {new Date().getFullYear()} Ánima · Privacidad · Términos · Preferencias de cookies
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

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current);
    };
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
      <img src="./images/Logo-Anima.jpg" alt="Logo Ánima" className="logo-img" width="128" height="128" loading="eager" />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
