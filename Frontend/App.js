const { useState } = React;

function App(){
  return (
    <div className="min-h-screen">
      <LoginScreen />
    </div>
  );
}

function LoginScreen(){
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
      const res = await fetch((window.API_URL || "") + "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res.ok){
        const msg = await res.text();
        throw new Error(msg || "Credenciales inválidas");
      }
      const data = await res.json();
      localStorage.setItem("token", data.token);
      alert("¡Login exitoso! (token guardado)");
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
        <footer className="brand-footer">© {new Date().getFullYear()} Equipo José & Paula</footer>
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
              <a className="link" href="#">¿Olvidaste tu contraseña?</a>
            </div>

            {error && <div className="error">{error}</div>}

            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <p className="foot">¿No tienes cuenta? <a className="link" href="#">Crear cuenta</a></p>
          </form>
        </div>
      </main>
    </div>
  );
}

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
