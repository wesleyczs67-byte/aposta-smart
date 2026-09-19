const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_FOOTBALL_KEY;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_URL = "https://v3.football.api-sports.io";

async function apiFootball(endpoint) {
  if (!API_KEY) {
    throw new Error("API_FOOTBALL_KEY não configurada.");
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      "x-apisports-key": API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.status}`);
  }

  return response.json();
}

// Teste da API
app.get("/api/status", async (req, res) => {
  try {
    await apiFootball("/status");
    res.json({
      ok: true,
      message: "API-Football conectada."
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// Buscar jogos
app.get("/api/fixtures", async (req, res) => {
  try {
    const date =
      req.query.date ||
      new Date().toISOString().slice(0, 10);

    let endpoint = `/fixtures?date=${date}`;

    if (req.query.league) {
      endpoint += `&league=${encodeURIComponent(req.query.league)}`;
    }

    const data = await apiFootball(endpoint);

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Análise de uma partida
app.get("/api/analysis/:fixtureId", async (req, res) => {
  try {
    const fixtureId = req.params.fixtureId;

    const [prediction, odds, statistics] = await Promise.all([
      apiFootball(`/predictions?fixture=${fixtureId}`),
      apiFootball(`/odds?fixture=${fixtureId}`),
      apiFootball(`/fixtures/statistics?fixture=${fixtureId}`)
    ]);

    res.json({
      prediction,
      odds,
      statistics
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Calculadora de valor esperado
app.post("/api/calculate", (req, res) => {
  try {
    const probability = Number(req.body.probability);
    const odd = Number(req.body.odd);

    if (
      !Number.isFinite(probability) ||
      !Number.isFinite(odd) ||
      probability < 0 ||
      probability > 100 ||
      odd <= 0
    ) {
      return res.status(400).json({
        error: "Probabilidade ou odd inválida."
      });
    }

    const probabilityDecimal = probability / 100;

    const expectedValue =
      (probabilityDecimal * odd - 1) * 100;

    res.json({
      probability,
      odd,
      expectedValue: Number(expectedValue.toFixed(2))
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

// Página principal
app.use((req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(`ApostaSmart rodando na porta ${PORT}`);
});
