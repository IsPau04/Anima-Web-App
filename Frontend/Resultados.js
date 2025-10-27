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

/* global React */
(function () {
  const { useMemo } = React;

  // Paleta Ánima (igual que MediaCapture/MiCuenta)
  const C = {
    bg1: "#2A1541", bg2: "#120F1E", bg3: "#1A1230",
    mor: "#6C63FF", mag: "#FF2DAA",
    text: "#FFFFFF", text2: "#C9C9D1", card: "#1B1727",
    border: "rgba(255,255,255,.12)"
  };

  // PLACEHOLDER: Datos de ejemplo para desarrollo sin backend
  const sampleEmotions = [
    { name: "Alegría", score: 0.62 },
    { name: "Sorpresa", score: 0.21 },
    { name: "Tristeza", score: 0.17 },
  ];

  /**
   * Convierte score a porcentaje
   * Acepta valores 0-1 (ej. 0.85) o 0-100 (ej. 85)
   */
  function toPercent(x) {
    if (x == null) return 0;
    return x <= 1 ? Math.round(x * 100) : Math.round(x);
  }

  /**
   * Convierte URL de Spotify a formato embebible
   * Entrada: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
   * Salida: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator"
   */
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

  function ResultadosTab({
    emotions,           // Array de { name: string, score: number }
    playlistUrl,        // string - URL de Spotify
    isLoading = false,  // boolean - Estado de carga
    isAuthenticated = false, // boolean - Usuario autenticado
    onSavePlaylist,     // function - Guardar playlist en historial
    onRetry,            // function - Volver a captura
    onGoLogin,          // function - Ir a login
    onGoHome,           // function - Ir a inicio
  }) {
    const S = useMemo(() => ({
      page: {
        minHeight: "100vh",
        color: C.text,
        background: `linear-gradient(120deg,${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
        fontFamily: "system-ui, Segoe UI, Inter, Roboto, Arial"
      },
      container: { maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" },
      header: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 32
      },
      title: { fontSize: 32, fontWeight: 700, margin: 0 },
      subtitle: { color: C.text2, fontSize: 15, marginTop: 4 },
      badge: {
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,.08)",
        border: `1px solid ${C.border}`,
        fontSize: 11,
        letterSpacing: 0.5,
        marginLeft: 8
      },
      btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
      btn: (kind) => ({
        display: "inline-block",
        padding: "10px 18px",
        borderRadius: 14,
        textDecoration: "none",
        color: "#fff",
        fontWeight: 600,
        cursor: "pointer",
        border: "none",
        transition: "all 0.2s ease",
        ...(kind === "ghost" && {
          border: `1px solid ${C.border}`,
          color: "#e5e5f5",
          background: "transparent"
        }),
        ...(kind === "grad" && {
          background: `linear-gradient(90deg,${C.mag},${C.mor})`
        })
      }),
      grid: {
        display: "grid",
        gap: 20,
        gridTemplateColumns: "1fr",
        alignItems: "start"
      },
      card: {
        background: `color-mix(in oklab, ${C.card} 82%, transparent)`,
        border: `1px solid ${C.border}`,
        borderRadius: 18,
        padding: 20,
        backdropFilter: "blur(8px)"
      },
      cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, color: C.text },
      emotionList: { display: "flex", flexDirection: "column", gap: 14 },
      emotionItem: {
        background: "rgba(255,255,255,.04)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14
      },
      emotionHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8
      },
      emotionLabel: { display: "flex", alignItems: "center", gap: 10 },
      rank: {
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "rgba(255,255,255,.1)",
        display: "grid",
        placeItems: "center",
        fontSize: 13,
        fontWeight: 700
      },
      emotionName: { fontSize: 16, fontWeight: 600 },
      emotionPct: { fontSize: 16, fontWeight: 700, color: C.text },
      barTrack: {
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,.12)",
        overflow: "hidden",
        border: `1px solid ${C.border}`
      },
      barFill: {
        height: "100%",
        borderRadius: 999,
        background: `linear-gradient(90deg,${C.mag},${C.mor})`,
        transition: "width 0.3s ease"
      },
      skeletonBar: {
        width: "100%",
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,.15)",
        animation: "pulse 1.5s ease-in-out infinite"
      },
      skeletonCard: {
        background: "rgba(255,255,255,.06)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14
      },
      skeletonLine: {
        height: 18,
        width: "60%",
        borderRadius: 8,
        background: "rgba(255,255,255,.15)",
        marginBottom: 10,
        animation: "pulse 1.5s ease-in-out infinite"
      },
      playlistPlaceholder: {
        padding: 20,
        background: "rgba(255,255,255,.04)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        textAlign: "center"
      },
      playlistEmbed: {
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${C.border}`
      },
      note: { fontSize: 12, color: C.text2, marginTop: 12, opacity: 0.8 },
      devHelp: { marginTop: 32, fontSize: 12, color: C.text2, opacity: 0.7 }
    }), []);

    // LÓGICA: Usa datos del backend si existen, sino usa placeholder
    const list = (emotions && emotions.length > 0 ? emotions : sampleEmotions)
      .slice(0, 3) // Top 3
      .map((e) => ({ ...e, pct: toPercent(e.score) }))
      .sort((a, b) => b.pct - a.pct); // Ordenar por score descendente

    const embedUrl = getEmbedUrl(playlistUrl);

    // Responsive: 2 columnas en pantallas grandes
    if (typeof window !== "undefined" && window.innerWidth >= 992) {
      S.grid.gridTemplateColumns = "repeat(2, 1fr)";
    }

    // Detectar si estamos en modo placeholder
    const isPlaceholder = !emotions || emotions.length === 0;

    return React.createElement(
      "div",
      { style: S.page },
      React.createElement(
        "div",
        { style: S.container },

        // Header
        React.createElement(
          "header",
          { style: S.header },
          React.createElement(
            "div",
            null,
            React.createElement("h1", { style: S.title }, "Resultados"),
            React.createElement(
              "p",
              { style: S.subtitle },
              "Top 3 emociones detectadas y tu playlist recomendada.",
              isPlaceholder && React.createElement("span", { style: S.badge }, "Modo desarrollo")
            )
          ),
          React.createElement(
            "div",
            { style: S.btnRow },
            React.createElement(
              "button",
              { style: S.btn("ghost"), onClick: onGoHome, type: "button" },
              "← Inicio"
            ),
            React.createElement(
              "button",
              { style: S.btn("ghost"), onClick: onRetry, type: "button" },
              "Reintentar análisis"
            ),
            // Botón "Guardar" solo si está autenticado
            isAuthenticated
              ? React.createElement(
                  "button",
                  { style: S.btn("grad"), onClick: onSavePlaylist, type: "button" },
                  "Guardar playlist"
                )
              : React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" } },
                  React.createElement(
                    "p",
                    { style: { fontSize: 13, color: C.text2, margin: 0 } },
                    "Inicia sesión para guardar tu playlist"
                  ),
                  React.createElement(
                    "button",
                    { style: S.btn("grad"), onClick: onGoLogin, type: "button" },
                    "Iniciar sesión"
                  )
                )
          )
        ),

        // Grid principal
        React.createElement(
          "div",
          { style: S.grid },

          // Panel: Top 3 emociones
          React.createElement(
            "section",
            { style: S.card },
            React.createElement("div", { style: S.cardTitle }, "Top 3 emociones detectadas"),
            isLoading
              ? React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 14 } },
                  [1, 2, 3].map((i) =>
                    React.createElement(
                      "div",
                      { key: i, style: S.skeletonCard },
                      React.createElement("div", { style: S.skeletonLine }),
                      React.createElement("div", { style: S.skeletonBar })
                    )
                  )
                )
              : React.createElement(
                  "ol",
                  { style: S.emotionList },
                  list.map((e, i) =>
                    React.createElement(
                      "li",
                      { key: `${e.name}-${i}`, style: S.emotionItem },
                      React.createElement(
                        "div",
                        { style: S.emotionHeader },
                        React.createElement(
                          "div",
                          { style: S.emotionLabel },
                          React.createElement("span", { style: S.rank }, i + 1),
                          React.createElement("span", { style: S.emotionName }, e.name)
                        ),
                        React.createElement("span", { style: S.emotionPct }, `${e.pct}%`)
                      ),
                      React.createElement(
                        "div",
                        { style: S.barTrack },
                        React.createElement("div", {
                          style: { ...S.barFill, width: `${Math.min(e.pct, 100)}%` }
                        })
                      )
                    )
                  )
                ),
            isPlaceholder && React.createElement(
              "p",
              { style: S.note },
              "⚠️ Modo desarrollo: datos de ejemplo. Conecta el endpoint POST /api/analyze para ver resultados reales."
            )
          ),

          // Panel: Playlist recomendada
          React.createElement(
            "section",
            { style: S.card },
            React.createElement("div", { style: S.cardTitle }, "Tu playlist personalizada"),
            isLoading
              ? React.createElement(
                  "div",
                  { style: { display: "flex", flexDirection: "column", gap: 12 } },
                  React.createElement("div", {
                    style: { ...S.skeletonLine, width: "50%" }
                  }),
                  React.createElement("div", {
                    style: {
                      height: 352,
                      borderRadius: 14,
                      background: "rgba(255,255,255,.08)",
                      animation: "pulse 1.5s ease-in-out infinite"
                    }
                  })
                )
              : embedUrl
              ? React.createElement(
                  "div",
                  { style: S.playlistEmbed },
                  React.createElement("iframe", {
                    title: "Spotify Playlist",
                    src: embedUrl,
                    width: "100%",
                    height: "352",
                    frameBorder: "0",
                    allow: "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
                    loading: "lazy"
                  })
                )
              : React.createElement(
                  "div",
                  { style: S.playlistPlaceholder },
                  React.createElement(
                    "p",
                    { style: { fontWeight: 600, marginBottom: 8 } },
                    "🎵 Playlist no disponible"
                  ),
                  React.createElement(
                    "p",
                    { style: { fontSize: 13, color: C.text2 } },
                    "El backend debe devolver 'playlistUrl' con una URL válida de Spotify."
                  )
                ),
            !embedUrl && React.createElement(
              "p",
              { style: S.note },
              "⚠️ Asegúrate de que el backend devuelva playlistUrl en formato: https://open.spotify.com/playlist/ID"
            )
          )
        ),

        // Guía de integración para backend
        React.createElement(
          "div",
          { style: S.devHelp },
          React.createElement("p", { style: { fontWeight: 600, marginBottom: 6 } }, "📋 Guía de integración (Backend):"),
          React.createElement(
            "ul",
            { style: { listStyle: "disc", marginLeft: 20, lineHeight: 1.6 } },
            React.createElement("li", null, 
              React.createElement("strong", null, "Endpoint de análisis:"), 
              " POST /api/analyze → Body: { image: File } → Response: { emotions: [{name, score}], playlistUrl: string }"
            ),
            React.createElement("li", null, 
              React.createElement("strong", null, "Formato de emociones:"), 
              " Array de objetos con 'name' (string) y 'score' (number 0-1 o 0-100)"
            ),
            React.createElement("li", null, 
              React.createElement("strong", null, "Formato de playlist:"), 
              " URL completa de Spotify (ej. https://open.spotify.com/playlist/37i9dQZF1DX...)"
            ),
            React.createElement("li", null, 
              React.createElement("strong", null, "Guardar playlist:"), 
              " POST /api/playlists/save → Headers: { Authorization: 'Bearer TOKEN' } → Body: { emotions, playlistUrl, timestamp }"
            ),
            React.createElement("li", null, 
              React.createElement("strong", null, "Estados de carga:"), 
              " Usa isLoading=true mientras esperas respuesta del servidor"
            )
          )
        )
      )
    );
  }

  // Exposición global para App.js (carga dinámica)
  window.ResultadosTab = ResultadosTab;
  window.AnimaUI = window.AnimaUI || {};
  window.AnimaUI.ResultadosTab = ResultadosTab;
})();