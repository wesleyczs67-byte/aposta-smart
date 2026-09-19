
const form = document.getElementById("searchForm");
const dateInput = document.getElementById("date");
const leagueInput = document.getElementById("league");
const matchesContainer = document.getElementById("matches");

const analysisBox = document.getElementById("analysis");

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

const today = new Date();
dateInput.value = formatDate(today);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  matchesContainer.innerHTML = `
    <div class="loading">
      Buscando partidas reais...
    </div>
  `;

  try {
    const date = dateInput.value;
    const league = leagueInput.value;

    const response = await fetch(
      `/api/fixtures?date=${date}&league=${league}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao buscar partidas.");
    }

    if (!data.response || data.response.length === 0) {
      matchesContainer.innerHTML = `
        <div class="empty">
          Nenhuma partida encontrada para esta data.
        </div>
      `;
      return;
    }

    matchesContainer.innerHTML = "";

    data.response.forEach((item) => {
      const fixture = item.fixture;
      const teams = item.teams;

      const card = document.createElement("div");

      card.className = "match-card";

      card.innerHTML = `
        <div class="match-info">
          <span>${teams.home.name}</span>
          <strong> x </strong>
          <span>${teams.away.name}</span>
        </div>

        <div class="match-date">
          ${new Date(fixture.date).toLocaleString("pt-BR")}
        </div>

        <button onclick="analisarPartida(${fixture.id})">
          📊 Analisar partida
        </button>
      `;

      matchesContainer.appendChild(card);
    });

  } catch (error) {
    matchesContainer.innerHTML = `
      <div class="error">
        Erro: ${error.message}
      </div>
    `;
  }
});

async function analisarPartida(fixtureId) {
  analysisBox.innerHTML = `
    <div class="loading">
      Analisando partida...
    </div>
  `;

  try {
    const response = await fetch(`/api/analysis/${fixtureId}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro na análise.");
    }

    const prediction = data.prediction;

    analysisBox.innerHTML = `
      <div class="analysis-card">

        <h2>📊 Análise da partida</h2>

        <h3>
          ${prediction.teams.home.name}
          x
          ${prediction.teams.away.name}
        </h3>

        <div class="probabilities">

          <div>
            <strong>Casa</strong>
            <span>${prediction.percent.home || "0%"}</span>
          </div>

          <div>
            <strong>Empate</strong>
            <span>${prediction.percent.draw || "0%"}</span>
          </div>

          <div>
            <strong>Fora</strong>
            <span>${prediction.percent.away || "0%"}</span>
          </div>

        </div>

        <p>
          <strong>Palpite da API:</strong>
          ${prediction.predictions?.winner?.name || "Não disponível"}
        </p>

        <h3>💰 Odds</h3>

        ${
          data.odds
            ? `
              <div class="odds">
                <p>Casa: ${data.odds.home || "N/D"}</p>
                <p>Empate: ${data.odds.draw || "N/D"}</p>
                <p>Fora: ${data.odds.away || "N/D"}</p>
              </div>
            `
            : `<p>Odds não disponíveis.</p>`
        }

      </div>
    `;

    analysisBox.scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    analysisBox.innerHTML = `
      <div class="error">
        Erro na análise: ${error.message}
      </div>
    `;
  }
}
