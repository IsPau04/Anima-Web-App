/**
 * Pestaña: Historial de análisis
 * Flujo: Usuario autenticado → Mi Cuenta → Ver Historial → Lista de análisis previos
 * 
 * INTEGRACIÓN BACKEND:
 * ====================
 * Props esperadas:
 * - onGoBack: () => void - Volver a Mi Cuenta
 * - onGoHome: () => void - Ir al inicio
 * - onViewResult: (historyItem) => void - Ver detalles de un análisis
 * 
 * ENDPOINT SUGERIDO:
 * ====================
 * GET /api/history
 *   Headers: { Authorization: "Bearer TOKEN" }
 *   Response: { 
 *     success: boolean, 
 *     history: [
 *       {
 *         id: string,
 *         timestamp: string (ISO 8601),
 *         emotions: [{ name: string, score: number }],
 *         playlistUrl?: string,
 *         imageUrl?: string
 *       }
 *     ]
 *   }
 * 
 * DELETE /api/history/:id
 *   Headers: { Authorization: "Bearer TOKEN" }
 *   Response: { success: boolean, message?: string }
 * 
 * CARACTERÍSTICAS:
 * - Lista paginada de análisis previos
 * - Filtros por fecha/emoción
 * - Botón para eliminar análisis
 * - Click en item para ver detalles completos
 * - Indicador de carga
 * - Manejo de lista vacía
 */

/* global React */
(function () {
  "use strict";

  const { useState, useEffect, useMemo } = React;

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

  function HistorialTab(props) {
    const onGoBack = props.onGoBack;
    const onGoHome = props.onGoHome;
    const onViewResult = props.onViewResult;

    const API_BASE = window.API_URL || "http://localhost:4000";

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all"); // all, week, month
    const [deleting, setDeleting] = useState(null); // ID del item siendo eliminado

    // Cargar historial al montar
    useEffect(function () {
      loadHistory();
    }, []);

    async function loadHistory() {
      setLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        
        if (!token) {
          throw new Error("No hay sesión activa");
        }

        const res = await fetch(API_BASE + "/api/history", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
          },
        });

        const data = await res.json().catch(function () {
          return {};
        });

        if (!res.ok) {
          throw new Error(data.message || "No se pudo cargar el historial");
        }

        // Ordenar por fecha (más reciente primero)
        const sorted = (data.history || []).sort(function (a, b) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        setHistory(sorted);
      } catch (err) {
        setError(err.message || "Error al cargar historial");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    async function handleDelete(id) {
      if (!confirm("¿Eliminar este análisis del historial?")) return;

      setDeleting(id);

      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");

        const res = await fetch(API_BASE + "/api/history/" + id, {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        const data = await res.json().catch(function () {
          return {};
        });

        if (!res.ok) {
          throw new Error(data.message || "No se pudo eliminar");
        }

        // Actualizar lista local
        setHistory(function (prev) {
          return prev.filter(function (item) {
            return item.id !== id;
          });
        });
      } catch (err) {
        alert(err.message || "Error al eliminar");
      } finally {
        setDeleting(null);
      }
    }

    function handleView(item) {
      if (typeof onViewResult === "function") {
        onViewResult(item);
      }
    }

    // Filtrar por fecha
    const filtered = useMemo(
      function () {
        if (filter === "all") return history;

        const now = new Date();
        const limit = new Date();

        if (filter === "week") {
          limit.setDate(now.getDate() - 7);
        } else if (filter === "month") {
          limit.setMonth(now.getMonth() - 1);
        }

        return history.filter(function (item) {
          return new Date(item.timestamp) >= limit;
        });
      },
      [history, filter]
    );

    const S = {
      page: {
        minHeight: "100vh",
        color: C.text,
        background:
          "linear-gradient(120deg," +
          C.bg1 +
          " 0%, " +
          C.bg2 +
          " 55%, " +
          C.bg3 +
          " 100%)",
        fontFamily: "system-ui, Segoe UI, Inter, Roboto, Arial",
        padding: "20px",
      },
      container: { maxWidth: 900, margin: "0 auto" },
      header: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 32,
      },
      title: { fontSize: 32, fontWeight: 700, margin: 0 },
      subtitle: { color: C.text2, fontSize: 15, marginTop: 4 },
      btnRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" },
      btn: function (kind) {
        return {
          display: "inline-block",
          padding: "10px 18px",
          borderRadius: 14,
          textDecoration: "none",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer",
          border: "none",
          transition: "all 0.2s ease",
          fontSize: 14,
          background:
            kind === "primary"
              ? "linear-gradient(90deg," + C.mag + "," + C.mor + ")"
              : kind === "ghost"
              ? "transparent"
              : "rgba(255,255,255,0.1)",
        };
      },
      filterBtn: function (active) {
        return {
          padding: "8px 16px",
          borderRadius: 12,
          border: "1px solid " + (active ? C.mor : C.border),
          background: active ? "rgba(108, 99, 255, 0.2)" : "transparent",
          color: active ? C.mor : C.text2,
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 600,
          transition: "all 0.2s ease",
        };
      },
      list: { display: "flex", flexDirection: "column", gap: 16 },
      card: {
        background: "color-mix(in oklab, " + C.card + " 82%, transparent)",
        border: "1px solid " + C.border,
        borderRadius: 18,
        padding: 20,
        backdropFilter: "blur(8px)",
        cursor: "pointer",
        transition: "all 0.2s ease",
      },
      cardHover: {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 24px rgba(108, 99, 255, 0.3)",
      },
      cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 12,
      },
      date: { fontSize: 13, color: C.text2 },
      deleteBtn: {
        padding: "6px 12px",
        borderRadius: 8,
        border: "1px solid rgba(252, 165, 165, 0.3)",
        background: "rgba(252, 165, 165, 0.1)",
        color: "#FCA5A5",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 600,
      },
      emotions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
      emotionBadge: {
        padding: "4px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.1)",
        border: "1px solid " + C.border,
        fontSize: 12,
        fontWeight: 600,
      },
      empty: {
        textAlign: "center",
        padding: 60,
        color: C.text2,
        fontSize: 15,
      },
      loader: {
        textAlign: "center",
        padding: 40,
        fontSize: 15,
        color: C.text2,
      },
      error: {
        padding: 20,
        background: "rgba(252, 165, 165, 0.1)",
        border: "1px solid rgba(252, 165, 165, 0.3)",
        borderRadius: 12,
        color: "#FCA5A5",
        fontSize: 14,
      },
      devNote: {
        marginTop: 32,
        padding: 16,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid " + C.border,
        borderRadius: 12,
        fontSize: 12,
        color: C.text2,
        lineHeight: 1.6,
      },
    };

    function formatDate(isoString) {
      try {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return "Hace " + minutes + " min";
        if (hours < 24) return "Hace " + hours + " h";
        if (days < 7) return "Hace " + days + " días";

        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      } catch (e) {
        return isoString;
      }
    }

    function HistoryCard(cardProps) {
      const item = cardProps.item;
      const [hover, setHover] = useState(false);

      const topEmotion =
        item.emotions && item.emotions.length > 0
          ? item.emotions.reduce(function (max, e) {
              return e.score > max.score ? e : max;
            })
          : null;

      return React.createElement(
        "div",
        {
          style: Object.assign({}, S.card, hover ? S.cardHover : {}),
          onMouseEnter: function () {
            setHover(true);
          },
          onMouseLeave: function () {
            setHover(false);
          },
          onClick: function () {
            handleView(item);
          },
        },
        React.createElement(
          "div",
          { style: S.cardHeader },
          React.createElement(
            "div",
            null,
            React.createElement("div", { style: S.date }, formatDate(item.timestamp)),
            topEmotion &&
              React.createElement(
                "div",
                { style: { fontSize: 18, fontWeight: 700, marginTop: 4 } },
                topEmotion.name
              )
          ),
          React.createElement(
            "button",
            {
              style: S.deleteBtn,
              onClick: function (e) {
                e.stopPropagation();
                handleDelete(item.id);
              },
              disabled: deleting === item.id,
            },
            deleting === item.id ? "Eliminando..." : "Eliminar"
          )
        ),
        item.emotions &&
          item.emotions.length > 0 &&
          React.createElement(
            "div",
            { style: S.emotions },
            item.emotions.slice(0, 3).map(function (e, i) {
              return React.createElement(
                "span",
                { key: i, style: S.emotionBadge },
                e.name + " " + Math.round(e.score * 100) + "%"
              );
            })
          )
      );
    }

    return React.createElement(
      "div",
      { style: S.page },
      React.createElement(
        "div",
        { style: S.container },

        React.createElement(
          "header",
          { style: S.header },
          React.createElement(
            "div",
            null,
            React.createElement("h1", { style: S.title }, "Historial de análisis"),
            React.createElement(
              "p",
              { style: S.subtitle },
              "Revisa tus análisis de emociones y playlists anteriores."
            )
          ),

          React.createElement(
            "div",
            { style: S.btnRow },
            React.createElement(
              "button",
              {
                style: S.btn("ghost"),
                onClick: function () {
                  if (typeof onGoBack === "function") onGoBack();
                },
              },
              "← Volver a Mi Cuenta"
            ),
            React.createElement(
              "button",
              {
                style: S.btn("primary"),
                onClick: function () {
                  if (typeof onGoHome === "function") onGoHome();
                },
              },
              "Ir al inicio"
            )
          ),

          React.createElement(
            "div",
            { style: { display: "flex", gap: 8 } },
            React.createElement(
              "button",
              {
                style: S.filterBtn(filter === "all"),
                onClick: function () {
                  setFilter("all");
                },
              },
              "Todos"
            ),
            React.createElement(
              "button",
              {
                style: S.filterBtn(filter === "week"),
                onClick: function () {
                  setFilter("week");
                },
              },
              "Última semana"
            ),
            React.createElement(
              "button",
              {
                style: S.filterBtn(filter === "month"),
                onClick: function () {
                  setFilter("month");
                },
              },
              "Último mes"
            )
          )
        ),

        error &&
          React.createElement(
            "div",
            { style: S.error },
            error + " ",
            React.createElement(
              "button",
              {
                onClick: loadHistory,
                style: {
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  color: "#FCA5A5",
                  cursor: "pointer",
                },
              },
              "Reintentar"
            )
          ),

        loading &&
          React.createElement("div", { style: S.loader }, "Cargando historial..."),

        !loading &&
          !error &&
          filtered.length === 0 &&
          React.createElement(
            "div",
            { style: S.empty },
            React.createElement("p", null, "📋 No hay análisis en tu historial."),
            React.createElement(
              "button",
              {
                style: Object.assign({}, S.btn("primary"), { marginTop: 16 }),
                onClick: function () {
                  if (typeof onGoHome === "function") onGoHome();
                },
              },
              "Hacer un análisis"
            )
          ),

        !loading &&
          !error &&
          filtered.length > 0 &&
          React.createElement(
            "div",
            { style: S.list },
            filtered.map(function (item) {
              return React.createElement(HistoryCard, { key: item.id, item: item });
            })
          ),

        React.createElement(
          "div",
          { style: S.devNote },
          React.createElement("strong", null, "📋 Integración Backend:"),
          React.createElement("br", null),
          "• GET /api/history → { history: [{ id, timestamp, emotions, playlistUrl }] }",
          React.createElement("br", null),
          "• DELETE /api/history/:id → { success: boolean }",
          React.createElement("br", null),
          "• Requiere token de autenticación en headers",
          React.createElement("br", null),
          "• Items actuales: " + history.length
        )
      )
    );
  }

  window.HistorialTab = HistorialTab;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.HistorialTab = HistorialTab;
})();