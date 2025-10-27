/*
  MiCuenta.js — Pestaña "Mi cuenta" (Perfil)
  - Mantiene estilo morado/negro (sin depender de Tailwind)
  - No usa foto de perfil; genera avatar con iniciales
  - Área para mostrar datos del usuario
  - Botones para: Inicio, Cerrar sesión, Cambiar Contraseña, Ver Historial

  INTEGRACIÓN BACKEND:
  ====================
  window.AnimaProfile.set({ displayName, username, email, lastLogin })
  window.AnimaProfile.setStats({ period: '7d'|'30d'|'6m', stats: { Alegre: 50, Triste: 10, ... } })

  NAVEGACIÓN:
  ===========
  - Emite eventos personalizados para App.js:
    • anima:goHome
    • anima:loggedOut
    • anima:changePassword (con detail: { email, isAuthenticated: true })
    • anima:goHistory
*/

/* global React */
(function () {
  "use strict";

  const { useState, useEffect } = React;

  function MiCuenta() {
    // Perfil (placeholder, editable por backend con window.AnimaProfile.set({...}))
    const [profile, setProfile] = useState({
      displayName: "Usuario Ánima",
      username: "usuario",
      email: "sin-correo@anima.app",
      lastLogin: null
    });

    // Estadísticas (placeholder)
    const [period, setPeriod] = useState("7d"); // 7d | 30d | 6m
    const [stats, setStats] = useState({
      Alegre: 62,
      Neutral: 24,
      Triste: 14
    });

    // Punto único de integración para backend
    useEffect(function () {
      function mapUserToProfile(u) {
        if (!u) u = {};
        return {
          displayName: u.displayName || u.nombre || u.name || profile.displayName,
          username: u.username || u.userName || (u.email ? u.email.split("@")[0] : profile.username),
          email: u.email || profile.email,
          lastLogin: u.lastLogin || u.ultimaSesion || u.updatedAt || profile.lastLogin
        };
      }

      window.AnimaProfile = {
        set: function (u) {
          setProfile(function (p) {
            return Object.assign({}, p, mapUserToProfile(u));
          });
        },
        setStats: function (payload) {
          if (!payload) payload = {};
          if (payload.period) setPeriod(payload.period);
          if (payload.stats && typeof payload.stats === "object") setStats(payload.stats);
        }
      };

      return function () {
        delete window.AnimaProfile;
      };
    }, []);

    // Helpers
    function initialsFrom(name) {
      if (!name) name = "";
      const parts = name.trim().split(/\s+/).filter(Boolean);
      const a = (parts[0] && parts[0][0]) || "A";
      const b = (parts[1] && parts[1][0]) || (parts[0] && parts[0][1]) || "N";
      return (a + b).toUpperCase();
    }

    function prettyDate(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
    }

    // Navegación
    function goHome(e) {
      if (e && e.preventDefault) e.preventDefault();
      window.dispatchEvent(new CustomEvent("anima:goHome"));
    }

    function handleLogout() {
      const ok = window.confirm("¿Estás seguro que quieres cerrar sesión?");
      if (!ok) return;

      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        // variantes legacy
        localStorage.removeItem("anima.token");
        localStorage.removeItem("anima.user");
        sessionStorage.removeItem("anima.token");
        sessionStorage.removeItem("anima.user");
      } catch (err) {
        console.error(err);
      }

      window.dispatchEvent(new CustomEvent("anima:loggedOut"));
      window.dispatchEvent(new CustomEvent("anima:goHome"));
    }

    function goChangePassword(e) {
      if (e && e.preventDefault) e.preventDefault();
      const currentUser = {
        email: profile.email,
        isAuthenticated: true
      };
      window.dispatchEvent(new CustomEvent("anima:changePassword", { detail: currentUser }));
    }

    function goHistory(e) {
      if (e && e.preventDefault) e.preventDefault();
      window.dispatchEvent(new CustomEvent("anima:goHistory"));
    }

    // Estilos
    const styles = {
      page: {
        minHeight: "100vh",
        background: "linear-gradient(180deg, #1A0B2E 0%, #2A103F 42%, #0E071C 100%)",
        color: "#EAEAF6",
        display: "flex",
        flexDirection: "column",
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        background: "rgba(10,10,16,0.7)",
        backdropFilter: "blur(8px)",
        zIndex: 10,
      },
      backBtn: {
        appearance: "none",
        border: "1px solid rgba(167,139,250,0.4)",
        background: "transparent",
        color: "#E6DCFF",
        padding: "8px 12px",
        borderRadius: "14px",
        cursor: "pointer",
        fontWeight: 600,
        transition: "transform .08s ease, background .2s ease, border .2s ease",
      },
      title: {
        fontSize: "20px",
        fontWeight: 700,
        letterSpacing: "0.4px",
      },
      container: {
        maxWidth: "980px",
        width: "100%",
        margin: "24px auto",
        padding: "0 20px 80px",
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "20px",
      },
      card: {
        background: "linear-gradient(180deg, rgba(120,75,160,0.14), rgba(255,60,172,0.08))",
        border: "1px solid rgba(167,139,250,0.22)",
        borderRadius: "18px",
        padding: "18px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35) inset, 0 10px 20px rgba(26,11,46,0.45)",
      },
      sectionTitle: {
        fontSize: "14px",
        letterSpacing: "1.2px",
        textTransform: "uppercase",
        color: "#C9B8FF",
        marginBottom: "10px",
      },
      profileRow: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "10px 0",
      },
      avatar: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontWeight: 800,
        letterSpacing: "1px",
        background: "radial-gradient(80% 80% at 20% 20%, #FF7BC1 0%, #9B5CF6 45%, #3A1578 100%)",
        border: "2px solid rgba(255,255,255,0.2)",
      },
      fieldGrid: {
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        rowGap: "8px",
        columnGap: "12px",
        alignItems: "center",
        marginTop: "6px",
      },
      keyLabel: { color: "#C9B8FF", fontSize: "13px" },
      value: { fontSize: "15px", fontWeight: 600 },
      actionsRow: { display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "14px" },
      secondary: {
        background: "transparent",
        color: "#EBDDF9",
        border: "1px solid rgba(255,255,255,0.18)",
        padding: "10px 14px",
        borderRadius: "12px",
        fontWeight: 700,
        cursor: "pointer",
      },
      tertiary: {
        background: "transparent",
        color: "#EBD7FF",
        border: "1px solid rgba(142, 36, 170, 0.65)",
        padding: "10px 14px",
        borderRadius: "12px",
        fontWeight: 700,
        cursor: "pointer",
      },
      chipsRow: { display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 10px" },
      chip: {
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(167,139,250,0.28)",
        color: "#EAEAF6",
        background: "rgba(255,255,255,0.04)",
        fontSize: 12,
        cursor: "pointer",
      },
      chipActive: {
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.38)",
        color: "#fff",
        background: "linear-gradient(90deg, rgba(255,60,172,0.25), rgba(108,99,255,0.28))",
        fontSize: 12,
        cursor: "default",
      },
      barRow: {
        display: "grid",
        gridTemplateColumns: "140px 1fr 46px",
        alignItems: "center",
        gap: "10px",
        margin: "8px 0",
      },
      barLabel: { fontSize: 13, color: "#D7CFF7" },
      barTrack: {
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.12)",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
      },
      barFillBase: {
        height: "100%",
        borderRadius: 999,
        background: "linear-gradient(90deg, #FF2DAA, #6C63FF)",
      },
      note: { marginTop: 10, fontSize: 12, color: "#D4C5EC", opacity: 0.85 },
    };

    const periodLabel =
      period === "7d"
        ? "Últimos 7 días"
        : period === "30d"
        ? "Últimos 30 días"
        : "Últimos 6 meses";

    function setPeriodUI(p) {
      setPeriod(p);
      // Placeholder: backend puede actualizar con window.AnimaProfile.setStats
    }

    function barColorFor(label) {
      switch (label.toLowerCase()) {
        case "alegre":
          return "linear-gradient(90deg,#FFD166,#EF476F)";
        case "neutral":
          return "linear-gradient(90deg,#A0AEC0,#718096)";
        case "triste":
          return "linear-gradient(90deg,#6B9AC4,#3B5B92)";
        case "enojado":
          return "linear-gradient(90deg,#FF6B6B,#C81E1E)";
        case "sorpresa":
          return "linear-gradient(90deg,#84FAB0,#8FD3F4)";
        case "miedo":
          return "linear-gradient(90deg,#B794F4,#553C9A)";
        case "disgusto":
          return "linear-gradient(90deg,#9AE6B4,#2F855A)";
        default:
          return styles.barFillBase.background;
      }
    }

    return React.createElement(
      "div",
      { style: styles.page },

      // Header
      React.createElement(
        "header",
        { style: styles.header },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "12px" } },
          React.createElement(
            "button",
            {
              style: styles.backBtn,
              onClick: goHome,
              "aria-label": "Regresar al inicio",
            },
            "← Inicio"
          ),
          React.createElement("div", { style: styles.title }, "Mi cuenta")
        ),
        React.createElement(
          "button",
          {
            style: styles.secondary,
            onClick: handleLogout,
          },
          "Cerrar sesión"
        )
      ),

      // Main container
      React.createElement(
        "main",
        { style: styles.container },

        // Card de perfil
        React.createElement(
          "section",
          { style: styles.card },
          React.createElement("div", { style: styles.sectionTitle }, "Perfil"),
          React.createElement(
            "div",
            { style: styles.profileRow },
            React.createElement(
              "div",
              {
                style: styles.avatar,
                "aria-label": "Avatar de " + profile.displayName,
              },
              initialsFrom(profile.displayName)
            ),
            React.createElement(
              "div",
              null,
              React.createElement(
                "div",
                { style: { fontSize: 18, fontWeight: 800 } },
                profile.displayName
              ),
              React.createElement(
                "div",
                { style: { color: "#D4C5EC", fontSize: 12, opacity: 0.8 } },
                "Tu música, tu emoción."
              )
            )
          ),
          React.createElement(
            "div",
            { style: styles.fieldGrid },
            React.createElement("div", { style: styles.keyLabel }, "Usuario"),
            React.createElement("div", { style: styles.value }, "@" + profile.username),

            React.createElement("div", { style: styles.keyLabel }, "Correo"),
            React.createElement("div", { style: styles.value }, profile.email),

            React.createElement("div", { style: styles.keyLabel }, "Último acceso"),
            React.createElement("div", { style: styles.value }, prettyDate(profile.lastLogin))
          )
        ),

        // Card de estadísticas
        React.createElement(
          "section",
          { style: styles.card },
          React.createElement("div", { style: styles.sectionTitle }, "Estadísticas de emociones"),
          React.createElement(
            "div",
            { style: styles.chipsRow },
            React.createElement(
              "span",
              {
                style: period === "7d" ? styles.chipActive : styles.chip,
                onClick: function () {
                  if (period !== "7d") setPeriodUI("7d");
                },
              },
              "Últimos 7 días"
            ),
            React.createElement(
              "span",
              {
                style: period === "30d" ? styles.chipActive : styles.chip,
                onClick: function () {
                  if (period !== "30d") setPeriodUI("30d");
                },
              },
              "Últimos 30 días"
            ),
            React.createElement(
              "span",
              {
                style: period === "6m" ? styles.chipActive : styles.chip,
                onClick: function () {
                  if (period !== "6m") setPeriodUI("6m");
                },
              },
              "Últimos 6 meses"
            )
          ),

          // Barras de emociones
          Object.keys(stats).map(function (label) {
            const value = stats[label];
            const v = Math.max(0, Math.min(100, Number(value) || 0));
            return React.createElement(
              "div",
              { key: label, style: styles.barRow },
              React.createElement("div", { style: styles.barLabel }, label),
              React.createElement(
                "div",
                { style: styles.barTrack },
                React.createElement("div", {
                  style: Object.assign({}, styles.barFillBase, {
                    width: v + "%",
                    background: barColorFor(label),
                  }),
                })
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: 12,
                    opacity: 0.85,
                    textAlign: "right",
                  },
                },
                v + "%"
              )
            );
          }),

          React.createElement(
            "div",
            { style: styles.note },
            "Período: " +
              periodLabel +
              ". Placeholder — el backend puede llamar window.AnimaProfile.setStats({ period: '7d', stats: { Alegre: 50, Neutral: 30, Triste: 20 } })."
          )
        ),

        // Card de privacidad
        React.createElement(
          "section",
          { style: styles.card },
          React.createElement("div", { style: styles.sectionTitle }, "Privacidad y seguridad"),
          React.createElement(
            "div",
            {
              style: { fontSize: 14, lineHeight: 1.6, opacity: 0.95 },
            },
            "Tu información de cuenta se usa para personalizar tu experiencia en Ánima. Puedes cambiar tu contraseña y revisar sesiones activas en la sección de seguridad cuando esté disponible."
          ),
          React.createElement(
            "div",
            { style: { marginTop: 12 } },
            React.createElement(
              "button",
              {
                style: styles.secondary,
                onClick: goChangePassword,
              },
              "Cambiar Contraseña"
            )
          )
        ),

        // Card de análisis (historial)
        React.createElement(
          "section",
          { style: styles.card },
          React.createElement("div", { style: styles.sectionTitle }, "Mis análisis"),
          React.createElement(
            "div",
            {
              style: { fontSize: 14, lineHeight: 1.6, opacity: 0.95, marginBottom: 12 },
            },
            "Revisa el historial de tus análisis de emociones y playlists generadas."
          ),
          React.createElement(
            "button",
            {
              style: styles.secondary,
              onClick: goHistory,
            },
            "Ver historial"
          )
        )
      )
    );
  }

  // Export para que App.js lo monte dinámicamente
  window.MiCuenta = MiCuenta;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.MiCuenta = MiCuenta;
})();

// Ejemplos para backend (en consola):
// window.AnimaProfile.set({ displayName: "Paula", username: "paula", email: "paula@ejemplo.com", lastLogin: "2025-10-05T20:33:00Z" });
// window.AnimaProfile.setStats({ period: '30d', stats: { Alegre: 48, Neutral: 32, Triste: 12, Sorpresa: 8 } });