/* global React, ReactDOM */
const { useState } = React;
const API_BASE = window.API_URL || "http://localhost:4000";


function App(){
  const [mode, setMode] = useState("login"); // "login" | "register"
  return (
    <div className="min-h-screen">
      {mode === "login"
        ? <LoginScreen onGoRegister={() => setMode("register")} />
        : <RegisterScreen onGoLogin={() => setMode("login")} />
      }
    </div>
  );
}

/* =================== LOGIN =================== */
function LoginScreen({ onGoRegister }){
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

    if(!res.ok){
      throw new Error(data?.message || "Credenciales inválidas");
    }

    // Guarda sesión
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    alert("¡Login exitoso! (token guardado)");
    // TODO: aquí puedes redirigir a /analizar o /historial
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

            <p className="foot">¿No tienes cuenta?{" "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoRegister();}}>
                Crear cuenta
              </a>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =================== REGISTRO =================== */
function RegisterScreen({ onGoLogin }){
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const [okMsg, setOkMsg]   = useState("");

  async function handleSubmit(e){
  e.preventDefault();
  setError(""); setOkMsg("");

  const formEl = e.currentTarget;              // ⬅️ guarda la referencia al <form>
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
    if(!res.ok){
      throw new Error(data?.message || "No se pudo crear la cuenta");
    }

    // ✅ ahora sí: usar la referencia guardada
    formEl.reset();
    setShowPwd(false);
    setError("");
    setOkMsg("¡Cuenta creada! Ahora inicia sesión.");
    // opcional: pasar directo a login
    // onGoLogin();
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
            {okMsg && <div className="error" style={{borderColor:'#54d6a155', background:'#0f1a14', color:'#c9ffe3'}}>{okMsg}</div>}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Creando cuenta…" : "Crear cuenta"}
            </button>

            <p className="foot">¿Ya tienes cuenta?{" "}
              <a className="link" href="#" onClick={(e)=>{e.preventDefault(); onGoLogin();}}>
                Inicia sesión
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
