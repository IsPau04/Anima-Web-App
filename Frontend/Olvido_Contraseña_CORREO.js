/**
 * Pestaña: Olvidé mi contraseña (Paso 1: Correo y Código)
 * Flujo: Login → Olvidé contraseña → Ingresa correo → Recibe código → Valida → Nueva contraseña
 * 
 * INTEGRACIÓN BACKEND:
 * ====================
 * Props esperadas:
 * - onGoLogin: () => void - Volver al login
 * - onCodeValidated: (data) => void - Llamado cuando el código es validado
 *   data = { email: string, code: string, resetToken?: string }
 * 
 * ENDPOINTS SUGERIDOS (usa API_BASE de App.js):
 * ====================
 * POST /auth/forgot-password
 *   Body: { email: string }
 *   Response: { success: boolean, message?: string }
 * 
 * POST /auth/verify-reset-code
 *   Body: { email: string, code: string }
 *   Response: { success: boolean, resetToken?: string, message?: string }
 * 
 * ESTADOS:
 * - sent: boolean - Si ya se envió el código
 * - sending: boolean - Enviando código
 * - validating: boolean - Validando código
 * - seconds: number - Countdown para reenvío (60s)
 * - error/success: string - Mensajes de feedback
 */

/* global React */
(function () {
  const { useState, useEffect, useRef } = React;

  // Paleta Ánima
  const C = {
    bg1: "#2A1541",
    bg2: "#120F1E",
    bg3: "#1A1230",
    mor: "#6C63FF",
    mag: "#FF2DAA",
    text: "#FFFFFF",
    text2: "#C9C9D1",
    card: "#1B1727",
    border: "rgba(255,255,255,.12)",
  };

  function ForgotPasswordPage({ onGoLogin, onCodeValidated }) {
    // Obtener API_BASE desde window (definido en App.js)
    const API_BASE = window.API_URL || "http://localhost:4000";

    const [email, setEmail] = useState("");
    const [emailTouched, setEmailTouched] = useState(false);
    const [code, setCode] = useState(["", "", "", ""]);
    const inputsRef = useRef([]);

    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [validating, setValidating] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const isEmailValid = /\S+@\S+\.\S+/.test(email);
    const isCodeComplete = code.every((c) => c.length === 1);

    // Countdown para reenviar código
    useEffect(() => {
      if (seconds <= 0) return;
      const t = setInterval(() => setSeconds((s) => s - 1), 1000);
      return () => clearInterval(t);
    }, [seconds]);

    const handleSendCode = async () => {
      if (!isEmailValid) {
        setEmailTouched(true);
        setError("Ingresa un correo válido.");
        return;
      }

      setError("");
      setSuccess("");
      setSending(true);

      try {
        // Llamada al backend para enviar código
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "No se pudo enviar el código");
        }

        setSent(true);
        setSeconds(60);
        setSuccess("Código enviado. Revisa tu correo (incluso spam).");
        
        // Enfocar primer input de código
        setTimeout(() => inputsRef.current[0]?.focus(), 200);
      } catch (err) {
        setError(err.message || "Error al enviar código");
      } finally {
        setSending(false);
      }
    };

    const handleCodeChange = (idx, value) => {
      const v = value.replace(/[^0-9]/g, "").slice(0, 1);
      const next = [...code];
      next[idx] = v;
      setCode(next);

      if (v && idx < inputsRef.current.length - 1) {
        inputsRef.current[idx + 1]?.focus();
      }
    };

    const handleCodeKeyDown = (idx, e) => {
      if (e.key === "Backspace" && !code[idx] && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
      }
      if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && idx > 0) {
        inputsRef.current[idx - 1]?.focus();
        e.preventDefault();
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowDown") && idx < 3) {
        inputsRef.current[idx + 1]?.focus();
        e.preventDefault();
      }
    };

    const handleCodePaste = (e) => {
      const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 4);
      if (paste.length) {
        e.preventDefault();
        const arr = paste.split("");
        const filled = [arr[0] || "", arr[1] || "", arr[2] || "", arr[3] || ""];
        setCode(filled);
        const nextIndex = filled.findIndex((c) => c === "");
        const target = nextIndex === -1 ? 3 : nextIndex;
        inputsRef.current[target]?.focus();
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setEmailTouched(true);
      setError("");
      setSuccess("");

      if (!isEmailValid) {
        setError("Ingresa un correo válido.");
        return;
      }
      if (!isCodeComplete) {
        setError("Completa el código de 4 dígitos.");
        return;
      }

      setValidating(true);

      try {
        const codeStr = code.join("");

        const res = await fetch(`${API_BASE}/auth/verify-reset-code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase(), code: codeStr }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.message || "Código inválido o expirado");
        }

        setSuccess("¡Código validado! Redirigiendo...");

        // Pasar al siguiente paso (Nueva contraseña)
        setTimeout(() => {
          if (typeof onCodeValidated === "function") {
            onCodeValidated({ 
              email: email.trim().toLowerCase(), 
              code: codeStr, 
              resetToken: data.resetToken 
            });
          }
        }, 800);
      } catch (err) {
        setError(err.message || "Error al validar código");
      } finally {
        setValidating(false);
      }
    };

    const emailError = emailTouched && !isEmailValid ? "Ingresa un correo válido (ej. usuario@dominio.com)." : "";

    const S = {
      page: {
        minHeight: "100vh",
        color: C.text,
        background: `linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
        fontFamily: "system-ui, Segoe UI, Inter, Roboto, Arial",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      },
      card: {
        maxWidth: 480,
        width: "100%",
        background: `color-mix(in oklab, ${C.card} 82%, transparent)`,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 32,
        backdropFilter: "blur(12px)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
      },
      title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
      subtitle: { color: C.text2, fontSize: 15, lineHeight: 1.6, marginBottom: 24 },
      label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 },
      input: {
        width: "100%",
        padding: "12px 16px",
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.08)",
        color: C.text,
        fontSize: 15,
        outline: "none",
        transition: "border 0.2s ease, background 0.2s ease",
      },
      error: { color: "#FCA5A5", fontSize: 13, marginTop: 6 },
      success: { color: "#86EFAC", fontSize: 13, marginTop: 6 },
      btnRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 12, flexWrap: "wrap" },
      btn: (kind) => ({
        padding: "10px 18px",
        borderRadius: 12,
        fontWeight: 600,
        cursor: "pointer",
        border: "none",
        transition: "all 0.2s ease",
        fontSize: 14,
        ...(kind === "primary" && {
          background: `linear-gradient(90deg,${C.mag},${C.mor})`,
          color: "#fff",
        }),
        ...(kind === "disabled" && {
          opacity: 0.5,
          cursor: "not-allowed",
        }),
      }),
      codeRow: { display: "flex", gap: 12, marginTop: 8 },
      codeInput: {
        width: 56,
        height: 56,
        textAlign: "center",
        fontSize: 24,
        fontWeight: 700,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        background: "rgba(255,255,255,0.08)",
        color: C.text,
        outline: "none",
      },
      hint: { fontSize: 12, color: C.text2, marginTop: 6 },
      link: {
        display: "block",
        textAlign: "center",
        marginTop: 20,
        fontSize: 14,
        color: C.text2,
        textDecoration: "underline",
        cursor: "pointer",
      },
      devNote: {
        marginTop: 24,
        padding: 12,
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        fontSize: 12,
        color: C.text2,
        lineHeight: 1.5
      }
    };

    return React.createElement(
      "div",
      { style: S.page },
      React.createElement(
        "div",
        { style: S.card },
        React.createElement("h1", { style: S.title }, "¿Olvidaste tu contraseña?"),
        React.createElement(
          "p",
          { style: S.subtitle },
          "Escribe tu correo y te enviaremos un ",
          React.createElement("strong", null, "código de 4 dígitos"),
          " para verificar tu identidad."
        ),

        React.createElement(
          "form",
          { onSubmit: handleSubmit, noValidate: true },

          // Campo de correo
          React.createElement(
            "div",
            { style: { marginBottom: 20 } },
            React.createElement("label", { htmlFor: "email", style: S.label }, "Correo electrónico"),
            React.createElement("input", {
              id: "email",
              type: "email",
              inputMode: "email",
              autoComplete: "email",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              onBlur: () => setEmailTouched(true),
              placeholder: "usuario@dominio.com",
              style: S.input,
              "aria-invalid": !!emailError,
              "aria-describedby": emailError ? "email-error" : undefined,
            }),
            emailError && React.createElement("p", { id: "email-error", style: S.error }, emailError),

            React.createElement(
              "div",
              { style: S.btnRow },
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleSendCode,
                  disabled: seconds > 0 || sending,
                  style: S.btn(seconds > 0 || sending ? "disabled" : "primary"),
                },
                sending
                  ? "Enviando..."
                  : seconds > 0
                  ? `Reenviar en ${seconds}s`
                  : sent
                  ? "Reenviar código"
                  : "Enviar código"
              ),
              sent &&
                React.createElement(
                  "span",
                  { style: { fontSize: 13, color: C.text2 } },
                  "Revisa tu bandeja de entrada o spam."
                )
            ),
            success && React.createElement("p", { style: S.success }, success)
          ),

          // Código de 4 dígitos
          React.createElement(
            "div",
            { style: { marginBottom: 20 } },
            React.createElement("label", { style: S.label }, "Código de verificación (4 dígitos)"),
            React.createElement(
              "div",
              { style: S.codeRow, role: "group", "aria-label": "Código de verificación de cuatro dígitos" },
              [0, 1, 2, 3].map((i) =>
                React.createElement("input", {
                  key: i,
                  ref: (el) => (inputsRef.current[i] = el),
                  type: "text",
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 1,
                  value: code[i],
                  onChange: (e) => handleCodeChange(i, e.target.value),
                  onKeyDown: (e) => handleCodeKeyDown(i, e),
                  onPaste: i === 0 ? handleCodePaste : undefined,
                  style: S.codeInput,
                  "aria-label": `Dígito ${i + 1} del código`,
                  disabled: !sent || validating
                })
              )
            ),
            React.createElement(
              "p",
              { style: S.hint },
              "Puedes pegar los 4 dígitos completos en el primer cuadro."
            )
          ),

          // Mensaje de error/validación
          error &&
            React.createElement(
              "p",
              { style: { ...S.error, marginBottom: 12 } },
              error
            ),

          // Botón de validar
          React.createElement(
            "button",
            {
              type: "submit",
              disabled: !isEmailValid || !isCodeComplete || validating,
              style: {
                ...S.btn(!isEmailValid || !isCodeComplete || validating ? "disabled" : "primary"),
                width: "100%",
              },
            },
            validating ? "Validando..." : "Validar código y continuar"
          ),

          // Link para regresar
          React.createElement(
            "a",
            {
              href: "#",
              onClick: (e) => {
                e.preventDefault();
                if (typeof onGoLogin === "function") onGoLogin();
              },
              style: S.link,
            },
            "← Regresar al inicio de sesión"
          )
        ),

        // Nota de integración para backend
        React.createElement(
          "div",
          { style: S.devNote },
          React.createElement("strong", null, "📋 Integración Backend:"),
          React.createElement("br", null),
          "• POST /auth/forgot-password → { email }",
          React.createElement("br", null),
          "• POST /auth/verify-reset-code → { email, code }",
          React.createElement("br", null),
          "• Usa API_BASE de App.js: ", API_BASE
        )
      )
    );
  }

  // Exposición global para App.js (carga dinámica)
  window.ForgotPasswordPage = ForgotPasswordPage;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.ForgotPasswordPage = ForgotPasswordPage;
})();
