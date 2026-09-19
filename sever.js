const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_FOOTBALL_KEY;

const API_URL = "https://v3.football.api-sports.io";

app.use(express.json());

app.use(
  express.static(path.join(__dirname, "public"))
);

async function apiFutebol(endpoint) {
  if (!API_KEY) {
    throw new Error(
      "API_FOOTBALL_KEY não definida."
    );
  }

  const resposta = await fetch(
    `${API_URL}${endpoint}`,
    {
      method: "GET",
      headers: {
        "x-apisports-key": API_KEY,
        "Accept": "application/json"
      }
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok) {
    throw new Error(
      dados.message ||
      `Erro na API: ${resposta.status}`
    );
  }

  if (dados.errors && Object.keys(dados.errors).length > 0) {
    throw new Error(
      JSON.stringify(dados.errors)
    );
  }

  return dados;
}


/* ================================
   TESTE DA API
================================ */

app.get("/api/status", async (req, res) => {

  try {

    await apiFutebol("/status");

    res.json({
      ok: true,
      mensagem: "API-Football online."
    });

  } catch (erro) {

    res.status(500).json({
      ok: false,
      erro: erro.message
    });

  }

});


/* ================================
   BUSCAR PARTIDAS
================================ */

app.get("/api/fixtures", async (req, res) => {

  try {

    const date = req.query.date;
    const league = req.query.league;

    if (!date) {
      return res.status(400).json({
        error: "Informe a data."
      });
    }

    let endpoint =
      `/fixtures?date=${encodeURIComponent(date)}`;

    if (league) {
      endpoint +=
        `&league=${encodeURIComponent(league)}`;
    }

    const dados = await apiFutebol(endpoint);

    res.json(dados);

  } catch (erro) {

    console.error("Erro ao buscar partidas:", erro);

    res.status(500).json({
      error: erro.message
    });

  }

});


/* ================================
   ANÁLISE DA PARTIDA
================================ */

app.get("/api/analysis/:fixtureId", async (req, res) => {

  try {

    const fixtureId = req.params.fixtureId;

    if (!fixtureId) {
      return res.status(400).json({
        error: "ID da partida não informado."
      });
    }

    const predictionData =
      await apiFutebol(
        `/predictions?fixture=${fixtureId}`
      );

    let oddsData = null;

    try {

      oddsData =
        await apiFutebol(
          `/odds?fixture=${fixtureId}`
        );

    } catch (erroOdds) {

      console.log(
        "Odds não disponíveis:",
        erroOdds.message
      );

    }


    const prediction =
      predictionData.response &&
      predictionData.response.length > 0
        ? predictionData.response[0]
        : null;


    if (!prediction) {

      return res.status(404).json({
        error:
          "Não foi possível obter a previsão desta partida."
      });

    }


    /* ================================
       ORGANIZAR ODDS
    ================================= */

    let odds = null;

    if (
      oddsData &&
      oddsData.response &&
      oddsData.response.length > 0
    ) {

      const bookmakers =
        oddsData.response[0].bookmakers || [];

      for (const bookmaker of bookmakers) {

        const bets = bookmaker.bets || [];

        for (const bet of bets) {

          if (
            bet.name === "Match Winner" ||
            bet.id === 1
          ) {

            const valores = bet.values || [];

            const encontrado = {};

            for (const valor of valores) {

              if (valor.value === "Home") {
                encontrado.home = valor.odd;
              }

              if (valor.value === "Draw") {
                encontrado.draw = valor.odd;
              }

              if (valor.value === "Away") {
                encontrado.away = valor.odd;
              }

            }

            if (
              encontrado.home ||
              encontrado.draw ||
              encontrado.away
            ) {

              odds = encontrado;

              break;
            }

          }

        }

        if (odds) {
          break;
        }

      }

    }


    res.json({

      prediction,

      odds

    });


  } catch (erro) {

    console.error(
      "Erro na análise:",
      erro
    );

    res.status(500).json({
      error: erro.message
    });

  }

});


/* ================================
   CALCULADORA DE VALOR
================================ */

app.post("/api/calcular", (req, res) => {

  try {

    const probabilidade =
      Number(req.body.probabilidade);

    const odd =
      Number(req.body.odd);


    if (
      !Number.isFinite(probabilidade) ||
      !Number.isFinite(odd)
    ) {

      return res.status(400).json({
        error:
          "Probabilidade ou odd inválida."
      });

    }


    if (
      probabilidade <= 0 ||
      probabilidade > 100 ||
      odd <= 1
    ) {

      return res.status(400).json({
        error:
          "Probabilidade deve estar entre 0 e 100 e a odd deve ser maior que 1."
      });

    }


    const probabilidadeDecimal =
      probabilidade / 100;


    const valorEsperado =
      (
        probabilidadeDecimal * odd - 1
      ) * 100;


    const oddJusta =
      1 / probabilidadeDecimal;


    res.json({

      probabilidade,

      odd,

      oddJusta:
        Number(oddJusta.toFixed(2)),

      valorEsperado:
        Number(valorEsperado.toFixed(2))

    });


  } catch (erro) {

    res.status(500).json({
      error: erro.message
    });

  }

});


/* ================================
   PÁGINA PRINCIPAL
================================ */

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* ================================
   FALLBACK
================================ */

app.use((req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );

});


/* ================================
   INICIAR SERVIDOR
================================ */

app.listen(PORT, () => {

  console.log(
    `ApostaSmart rodando na porta ${PORT}`
  );

});
