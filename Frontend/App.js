/* global React, ReactDOM */
const { useState } = React;
const API_BASE = window.API_URL || "http://localhost:4000";

/* =================== APP ROOT =================== */
function App(){
  const [mode, setMode] = useState("home"); // "home" | "login" | "register"

  const handlers = {
    onGoLogin:    () => setMode("login"),
    onGoRegister: () => setMode("register"),
    onGoAccount:  () => alert("Mi cuenta (pendiente)"),
    onGoScan:     () => alert("Escanear (pendiente)"),
    onTryTest:    () => alert("Ir al Test (pendiente)")
  };

  return (
    <div className="min-h-screen">
      {mode === "home" && (
        <HomeScreen {...handlers} />
      )}
      {mode === "login" && (
        <LoginScreen
          onGoRegister={() => setMode("register")}
          onGoHome={() => setMode("home")}
        />
      )}
      {mode === "register" && (
        <RegisterScreen
          onGoLogin={() => setMode("login")}
          onGoHome={() => setMode("home")}
        />
      )}
    </div>
  );
}

/* =================== HOME — Estilo AWS/Ánima (sin “Analizar emoción”) =================== */
function HomeScreen({
  onGoLogin,
  onGoRegister,
  onGoAccount,
  onGoScan,
  onTryTest
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
          <nav style={{display:"flex", gap:4}}>
            <a href="#" onClick={(e)=>e.preventDefault()} style={S.navA}>Inicio</a>
            <a href="#" onClick={(e)=>e.preventDefault()} style={S.navA}>Analizar</a>
            <a href="#" onClick={(e)=>e.preventDefault()} style={S.navA}>Historial</a>
            <a href="#" onClick={(e)=>e.preventDefault()} style={S.navA}>Soporte</a>
          </nav>
          <div style={{display:"flex", gap:8}}>
            <button style={S.btn("ghost")} onClick={onGoScan}>Escanear</button>
            <button style={S.btn("ghost")} onClick={onGoLogin}>Iniciar sesión</button>
            <button style={S.btn("grad")}  onClick={onGoRegister}>Crear cuenta</button>
            <button style={S.btn("ghost")} onClick={onGoAccount}>Mi cuenta ▾</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{...S.container, ...S.hero}}>
        <div style={{display:"flex", gap:16, alignItems:"center", flexWrap:"wrap"}}>
          <span style={S.scanChip} onClick={onGoScan}>Escanear</span>
        </div>
        <h1 style={S.h1}>Desde usuarios hasta equipos, Ánima es la forma moderna de elegir música con emociones</h1>
        <p style={S.lead}>
          Únete a la comunidad que ya descubre playlists personalizadas con un simple escaneo.
          Detectamos tu emoción y te sugerimos música para acompañar o transformar tu estado de ánimo.
        </p>
        <div style={S.heroBar}>
          <button style={S.btn("ghost")} onClick={onGoLogin}>Iniciar sesión</button>
          <button style={S.btn("grad")}  onClick={onGoRegister}>Crear cuenta</button>
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
            <button style={{...S.btn("ghost"), marginRight:8}} onClick={onGoRegister}>Crear una cuenta</button>
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
function LoginScreen({ onGoRegister, onGoHome }){
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

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      alert("¡Login exitoso! (token guardado)");
      // window.location.href = "/analizar";
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
              <a className="link" href="#" onClick={(e)=>e.preventDefault()}>¿Olvidaste tu contraseña?</a>
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
function RegisterScreen({ onGoLogin, onGoHome }){
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [okMsg, setOkMsg]   = useState("");

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
      setOkMsg("¡Cuenta creada! Ahora inicia sesión.");
    }catch(err){
      setOkMsg("");
      setError(err.message || "Error al registrar");
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
      <img src="./Logo-Anima.jpg" alt="Logo Ánima" className="logo-img" width="128" height="128" loading="eager" />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
