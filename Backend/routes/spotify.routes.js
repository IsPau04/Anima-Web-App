// routes/spotify.routes.js
import { Router } from "express";

const router = Router();

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const MARKET = process.env.SPOTIFY_MARKET || "US";

// Cache sencillo de token app
let _appToken = null;
let _appTokenExp = 0;

async function getAppToken(){
  const now = Date.now();
  if (_appToken && now < _appTokenExp - 60_000) return _appToken;

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || "spotify_token_failed");
  _appToken = json.access_token;
  _appTokenExp = Date.now() + (json.expires_in * 1000);
  return _appToken;
}

// Mapeo emoción → consulta de búsqueda de playlists
const EMOTION_TO_QUERY = {
  HAPPY: "happy upbeat",
  SAD: "sad melancholic",
  CALM: "chill relax calm",
  ANGRY: "aggressive rock workout",
  SURPRISED: "party electronic upbeat",
  CONFUSED: "focus study concentration",
  FEAR: "ambient dark cinematic",
  DISGUSTED: "detox calm cleanse",
  UNKNOWN: "chill focus"
};

// GET /api/spotify/playlists?mood=HAPPY
router.get("/playlists", async (req, res) => {
  try {
    const mood = String(req.query.mood || "UNKNOWN").toUpperCase();
    const pref = String(req.query.pref || "").trim();
    const MARKET = process.env.SPOTIFY_MARKET || "US";

    const token = await getAppToken();

    const Q = {
      HAPPY:     ["happy", "good vibes", "feel good", "positive", "sunny"],
      SAD:       ["sad", "rainy day", "melancholy", "heartbreak", "chill sad"],
      CALM:      ["chill", "calm", "lofi", "soft pop", "ambient"],   // ← CALM
      ANGRY:     ["workout", "aggressive rock", "metal", "pump up", "rage"],
      SURPRISED: ["party", "dance hits", "electronic", "edm", "fresh finds"],
      CONFUSED:  ["focus", "study", "instrumental", "brain food", "deep focus"],
      FEAR:      ["dark ambient", "cinematic", "noir", "moody"],
      DISGUSTED: ["detox", "cleanse", "peaceful", "calming"],
      UNKNOWN:   ["chill", "focus", "indie mix"]
    }[mood] || ["chill"];

    const baseQueries = [...Q];
    if (pref) {
      baseQueries.unshift(`${pref} ${Q[0]}`);
      baseQueries.push(pref);
    }

    async function searchOnce(q, useMarket = true) {
      const url = new URL("https://api.spotify.com/v1/search");
      url.searchParams.set("q", q);
      url.searchParams.set("type", "playlist");
      url.searchParams.set("limit", "10");
      url.searchParams.set("offset", String(Math.floor(Math.random() * 200)));
      if (useMarket) url.searchParams.set("market", MARKET);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const j = await r.json();
      return { items: j?.playlists?.items || [] };
    }

    let items = [];
    for (const q of baseQueries) {
      const { items: its } = await searchOnce(q, true);
      if (its.length) { items = its; break; }
    }
    if (!items.length) {
      for (const q of baseQueries) {
        const { items: its } = await searchOnce(q, false);
        if (its.length) { items = its; break; }
      }
    }

    if (!items.length) {
      // FALLBACK asegurado:
      const FALLBACKS = {
        HAPPY:     "37i9dQZF1DXdPec7aLTmlC",
        SAD:       "37i9dQZF1DX3YSRoSdA634",
        CALM:      "37i9dQZF1DX4WYpdgoIcn6", // Chill Hits
        ANGRY:     "37i9dQZF1DX76Wlfdnj7AP",
        SURPRISED: "37i9dQZF1DXa3LlXtETKqH",
        CONFUSED:  "37i9dQZF1DX8Uebhn9wzrS",
        FEAR:      "37i9dQZF1DX59NCqCqJtoH",
        DISGUSTED: "37i9dQZF1DXci7j0DJQgGp",
        UNKNOWN:   "37i9dQZF1DX4WYpdgoIcn6"
      };
      const id = process.env[`SPOTIFY_FALLBACK_${mood}`] || FALLBACKS.UNKNOWN;
      return res.json({
        id,
        name: `Editorial fallback (${mood})`,
        description: "",
        owner: "Spotify",
        images: [],
        externalUrl: `https://open.spotify.com/playlist/${id}`,
        embedUrl: `https://open.spotify.com/embed/playlist/${id}`,
        mood, query: baseQueries[0] || "", fallback: true
      });
    }

    const p = items[Math.floor(Math.random() * items.length)];
    const id = p.id;
    res.json({
      id,
      name: p.name,
      description: p.description,
      owner: p.owner?.display_name,
      images: p.images || [],
      externalUrl: `https://open.spotify.com/playlist/${id}`,
      embedUrl: `https://open.spotify.com/embed/playlist/${id}`,
      mood, query: baseQueries[0] || "", fallback: false
    });
  } catch (err) {
    console.error("spotify/playlists error:", err);
    res.status(500).json({ error: "spotify_error", message: err.message });
  }
});


export default router;
