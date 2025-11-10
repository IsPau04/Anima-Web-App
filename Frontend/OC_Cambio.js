
/**
 * Pantalla de "Nueva contraseña" para Ánima
 * - Mismo fondo degradado morado que login/registro
 * - Card centrado con 2 campos: nueva contraseña y repetir contraseña
 * - Botón "Aceptar" (deshabilitado hasta que sea válido)
 * - Validaciones básicas de seguridad + coincidencia
 * - Sin lógica de backend (se integra después). Ver TODO en handleSubmit.
 */

/**
 * Pestaña: Nueva contraseña (Paso 2: Cambiar contraseña)
 * Flujo: 
 *   A) Código validado → Cambiar contraseña → Login
 *   B) Usuario autenticado → Cambiar contraseña → Volver a Mi Cuenta
 * 
 * INTEGRACIÓN BACKEND:
 * ====================
 * Props esperadas:
 * - resetData: { email: string, code?: string, resetToken?: string, isAuthenticated?: boolean }
 * - onGoLogin: () => void - Volver al login (si no está autenticado)
 * - onGoBack: () => void - Volver a Mi Cuenta (si está autenticado)
 * - onPasswordChanged: () => void - (opcional) callback de éxito
 * 
 * ENDPOINTS SUGERIDOS:
 * ====================
 * POST /auth/reset-password (sin autenticación)
 *   Body: { email: string, code: string, resetToken?: string, newPassword: string }
 *   Response: { success: boolean, message?: string }
 * 
 * POST /auth/change-password (con autenticación)
 *   Headers: { Authorization: "Bearer TOKEN" }
 *   Body: { currentPassword?: string, newPassword: string }
 *   Response: { success: boolean, message?: string }
 */

/* global React */
(function () {
  "use strict";

  const { useState, useMemo } = React;

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

  function NuevaContrasenaPage(props) {
    const resetData = props.resetData || {};
    const onGoLogin = props.onGoLogin;
    const onGoBack = props.onGoBack;
    const onPasswordChanged = props.onPasswordChanged;

    const API_BASE = window.API_URL || "http://localhost:4000";
    const isAuthenticated = resetData.isAuthenticated || false;

    const [pwd, setPwd] = useState("");
    const [pwd2, setPwd2] = useState("");
    const [currentPwd, setCurrentPwd] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showPwd2, setShowPwd2] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const rules = useMemo(
      function () {
        return {
          minLen: pwd.length >= 8,
          upper: /[A-ZÁÉÍÓÚÑ]/.test(pwd),
          lower: /[a-záéíóúñ]/.test(pwd),
          digit: /\d/.test(pwd),
          special: /[^\w\s]/.test(pwd),
        };
      },
      [pwd]
    );

    const allSecure = Object.values(rules).every(Boolean);
    const match = pwd.length > 0 && pwd === pwd2;

    const strength = useMemo(
      function () {
        const score = Object.values(rules).filter(Boolean).length;
        if (!pwd) return { label: "", width: "0%", color: "transparent" };
        if (score <= 2) return { label: "Débil", width: "33%", color: "#FCA5A5" };
        if (score === 3 || score === 4)
          return { label: "Media", width: "66%", color: "#FCD34D" };
        return { label: "Fuerte", width: "100%", color: "#86EFAC" };
      },
      [rules, pwd]
    );

    async function handleSubmit(e) {
      e.preventDefault();
      if (!allSecure || !match) return;

      if (isAuthenticated && !currentPwd) {
        setError("Ingresa tu contraseña actual");
        return;
      }

      setError("");
      setLoading(true);

      try {
        let endpoint, body;
        const headers = { "Content-Type": "application/json" };

        if (isAuthenticated) {
          const token =
            localStorage.getItem("token") || sessionStorage.getItem("token");
          endpoint = API_BASE + "/auth/change-password";
          headers.Authorization = "Bearer " + token;
          body = { currentPassword: currentPwd, newPassword: pwd };
        } else {
          endpoint = API_BASE + "/auth/reset-password";
          body = {
            email: resetData.email,
            code: resetData.code,
            resetToken: resetData.resetToken,
            newPassword: pwd,
          };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: headers,
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(function () {
          return {};
        });

        if (!res.ok) {
          throw new Error(data.message || "No se pudo cambiar la contraseña");
        }

        setSuccess(true);
        if (typeof onPasswordChanged === "function") onPasswordChanged();

        setTimeout(function () {
          if (isAuthenticated && typeof onGoBack === "function") {
            onGoBack();
          } else if (typeof onGoLogin === "function") {
            onGoLogin();
          }
        }, 2000);
      } catch (err) {
        setError(err.message || "Error al cambiar contraseña");
      } finally {
        setLoading(false);
      }
    }

    const S = {
      page: {
        minHeight: "100vh",
        color: C.text,
        background:
          "linear-gradient(120deg," + C.bg1 + " 0%, " + C.bg2 + " 55%, " + C.bg3 + " 100%)",
        fontFamily: "system-ui, Segoe UI, Inter, Roboto, Arial",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      },
      card: {
        maxWidth: 480,
        width: "100%",
        background: "color-mix(in oklab, " + C.card + " 82%, transparent)",
        border: "1px solid " + C.border,
        borderRadius: 18,
        padding: 32,
        backdropFilter: "blur(12px)",
        boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
      },
      title: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
      subtitle: {
        color: C.text2,
        fontSize: 15,
        lineHeight: 1.6,
        marginBottom: 24,
      },
      label: { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 },
      inputWrap: { position: "relative", marginBottom: 16 },
      input: {
        width: "100%",
        padding: "12px 50px 12px 16px",
        borderRadius: 12,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.08)",
        color: C.text,
        fontSize: 15,
        outline: "none",
        transition: "border 0.2s ease",
      },
      inputMatch: { borderColor: "#86EFAC" },
      inputNoMatch: { borderColor: "#FCA5A5" },
      toggleBtn: {
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        color: C.text2,
        cursor: "pointer",
        fontSize: 13,
        padding: "4px 8px",
      },
      strengthBar: {
        height: 8,
        width: "100%",
        background: "rgba(255,255,255,0.1)",
        borderRadius: 999,
        overflow: "hidden",
        marginTop: 8,
      },
      strengthFill: {
        height: "100%",
        transition: "width 0.3s ease",
        borderRadius: 999,
      },
      strengthLabel: { fontSize: 12, color: C.text2, marginTop: 4 },
      ruleList: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 8,
        marginTop: 12,
        fontSize: 12,
      },
      error: {
        color: "#FCA5A5",
        fontSize: 13,
        marginTop: 8,
        marginBottom: 8,
      },
      success: {
        color: "#86EFAC",
        fontSize: 14,
        padding: 12,
        background: "rgba(134, 239, 172, 0.1)",
        border: "1px solid rgba(134, 239, 172, 0.3)",
        borderRadius: 8,
        marginTop: 12,
      },
      btn: function (disabled) {
        return {
          width: "100%",
          padding: "12px 18px",
          borderRadius: 12,
          fontWeight: 600,
          cursor: disabled ? "not-allowed" : "pointer",
          border: "none",
          transition: "all 0.2s ease",
          fontSize: 15,
          marginTop: 16,
          background: disabled
            ? "rgba(255,255,255,0.2)"
            : "linear-gradient(90deg," + C.mag + "," + C.mor + ")",
          color: "#fff",
          opacity: disabled ? 0.5 : 1,
        };
      },
      backLink: {
        display: "block",
        textAlign: "center",
        marginTop: 16,
        fontSize: 14,
        color: C.text2,
        textDecoration: "underline",
        cursor: "pointer",
      },
      devNote: {
        marginTop: 16,
        padding: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid " + C.border,
        borderRadius: 8,
        fontSize: 12,
        color: C.text2,
        lineHeight: 1.5,
      },
    };

    function Rule(ruleProps) {
      const ok = ruleProps.ok;
      const text = ruleProps.text;
      const style = ruleProps.style || {};

      const ruleS = {
        rule: Object.assign({ display: "flex", alignItems: "center", gap: 8 }, style),
        dot: {
          width: 10,
          height: 10,
          borderRadius: "50%",
          flexShrink: 0,
          background: ok ? "#86EFAC" : "rgba(255,255,255,0.3)",
        },
        text: { fontSize: 12, color: ok ? C.text : C.text2 },
      };

      return React.createElement(
        "li",
        { style: ruleS.rule },
        React.createElement("span", { style: ruleS.dot }),
        React.createElement("span", { style: ruleS.text }, text)
      );
    }

    return React.createElement(
      "div",
      { style: S.page },
      React.createElement(
        "div",
        { style: S.card },
        React.createElement(
          "h1",
          { style: S.title },
          isAuthenticated ? "Cambiar contraseña" : "Nueva contraseña"
        ),
        React.createElement(
          "p",
          { style: S.subtitle },
          isAuthenticated
            ? "Actualiza tu contraseña de forma segura."
            : "Elige una contraseña segura y repítela para confirmar."
        ),

        React.createElement(
          "form",
          { onSubmit: handleSubmit, noValidate: true },

          isAuthenticated &&
            React.createElement(
              "div",
              { style: { marginBottom: 20 } },
              React.createElement(
                "label",
                { htmlFor: "currentPwd", style: S.label },
                "Contraseña actual"
              ),
              React.createElement(
                "div",
                { style: S.inputWrap },
                React.createElement("input", {
                  id: "currentPwd",
                  type: showCurrentPwd ? "text" : "password",
                  value: currentPwd,
                  onChange: function (e) {
                    setCurrentPwd(e.target.value);
                  },
                  placeholder: "Tu contraseña actual",
                  style: S.input,
                  autoComplete: "current-password",
                  required: true,
                }),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: function () {
                      setShowCurrentPwd(function (v) {
                        return !v;
                      });
                    },
                    style: S.toggleBtn,
                    "aria-label": showCurrentPwd
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña",
                  },
                  showCurrentPwd ? "Ocultar" : "Mostrar"
                )
              )
            ),

          React.createElement(
            "div",
            null,
            React.createElement(
              "label",
              { htmlFor: "pwd", style: S.label },
              "Nueva contraseña"
            ),
            React.createElement(
              "div",
              { style: S.inputWrap },
              React.createElement("input", {
                id: "pwd",
                type: showPwd ? "text" : "password",
                value: pwd,
                onChange: function (e) {
                  setPwd(e.target.value);
                },
                placeholder: "Mínimo 8 caracteres",
                style: S.input,
                autoComplete: "new-password",
                required: true,
              }),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function () {
                    setShowPwd(function (v) {
                      return !v;
                    });
                  },
                  style: S.toggleBtn,
                  "aria-label": showPwd
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña",
                },
                showPwd ? "Ocultar" : "Mostrar"
              )
            ),

            strength.label &&
              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  { style: S.strengthBar },
                  React.createElement("div", {
                    style: Object.assign({}, S.strengthFill, {
                      width: strength.width,
                      background: strength.color,
                    }),
                  })
                ),
                React.createElement(
                  "p",
                  { style: S.strengthLabel },
                  "Fuerza: ",
                  React.createElement("strong", null, strength.label)
                )
              ),

            React.createElement(
              "ul",
              { style: S.ruleList },
              React.createElement(Rule, {
                ok: rules.minLen,
                text: "Mínimo 8 caracteres",
              }),
              React.createElement(Rule, { ok: rules.upper, text: "Una mayúscula" }),
              React.createElement(Rule, { ok: rules.lower, text: "Una minúscula" }),
              React.createElement(Rule, { ok: rules.digit, text: "Un número" }),
              React.createElement(Rule, {
                ok: rules.special,
                text: "Un símbolo (!@#$)",
                style: { gridColumn: "1 / -1" },
              })
            )
          ),

          React.createElement(
            "div",
            { style: { marginTop: 20 } },
            React.createElement(
              "label",
              { htmlFor: "pwd2", style: S.label },
              "Repite la contraseña"
            ),
            React.createElement(
              "div",
              { style: S.inputWrap },
              React.createElement("input", {
                id: "pwd2",
                type: showPwd2 ? "text" : "password",
                value: pwd2,
                onChange: function (e) {
                  setPwd2(e.target.value);
                },
                style: Object.assign(
                  {},
                  S.input,
                  pwd2 && (match ? S.inputMatch : S.inputNoMatch)
                ),
                autoComplete: "new-password",
                required: true,
              }),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: function () {
                    setShowPwd2(function (v) {
                      return !v;
                    });
                  },
                  style: S.toggleBtn,
                  "aria-label": showPwd2
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña",
                },
                showPwd2 ? "Ocultar" : "Mostrar"
              )
            ),
            pwd2 &&
              !match &&
              React.createElement(
                "p",
                { style: S.error },
                "Las contraseñas no coinciden."
              )
          ),

          error && React.createElement("p", { style: S.error }, error),

          success &&
            React.createElement(
              "div",
              { style: S.success },
              isAuthenticated
                ? "✓ Contraseña actualizada exitosamente. Redirigiendo..."
                : "✓ Contraseña cambiada exitosamente. Redirigiendo al login..."
            ),

          React.createElement(
            "button",
            {
              type: "submit",
              disabled:
                !allSecure ||
                !match ||
                loading ||
                success ||
                (isAuthenticated && !currentPwd),
              style: S.btn(
                !allSecure ||
                  !match ||
                  loading ||
                  success ||
                  (isAuthenticated && !currentPwd)
              ),
            },
            loading ? "Guardando..." : success ? "¡Listo!" : "Aceptar"
          ),

          isAuthenticated &&
            React.createElement(
              "a",
              {
                href: "#",
                onClick: function (e) {
                  e.preventDefault();
                  if (typeof onGoBack === "function") onGoBack();
                },
                style: S.backLink,
              },
              "← Volver a Mi Cuenta"
            )
        ),

       
      )
    );
  }

  window.NuevaContrasenaPage = NuevaContrasenaPage;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.NuevaContrasenaPage = NuevaContrasenaPage;
})();
