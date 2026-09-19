const $ = (id) => document.getElementById(id);

const dateInput = $("date");
const leagueInput = $("league");
const searchButton = $("search");
const gamesContainer = $("games");
const message = $("message");

function todayISO() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 10);
}

dateInput.value = todayISO();

function showMessage(text, type = "") {
  message.className = type;
  message.textContent = text;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function renderGames(games) {
  if (!games || games.length === 0) {
    gamesContainer.innerHTML = `
      <div class="card">
        <p>Nenhum jogo encontrado para os filtros selecionados.</p>
      </div>
    `;
    return;
  }

  gamesContainer.innerHTML = games.map(game => `
    <div class="game">
      <div class="game-header">
        <div>
          <div class="teams">
            ${game.teams.home.name}
            <span> x </span>
            ${game.teams.away.name}
          </div>

          <div class="league">
            ${game.league.name} — ${game.league.country}
          </div>
        </div>

        <button onclick="analyzeGame(${game.fixture.id})">
          Analisar
        </button>
      </div>

      <div class="league">
        ${new Date(game.fixture.date).toLocaleString("pt-BR")}
      </div>
    </div>
  `).join("");
}

async function loadGames() {
  showMessage("Buscando jogos...", "loading");
  gamesContainer.innerHTML = "";

  try {
    const date = dateInput.value;
    const league = leagueInput.value;

    let url = `/api/fixtures?date=${date}`;

    if (league) {
      url += `&league=${league}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao buscar jogos.");
    }

    showMessage("");
    renderGames(data.response || []);

  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function analyzeGame(fixtureId) {
  showMessage("Calculando análise...", "loading");

  try {
    const response = await fetch(`/api/analysis/${fixtureId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao analisar partida.");
    }

    const game = data.fixture;

    const analysisHTML = `
      <div class="card">
        <h2>
          ${game.teams.home.name} x ${game.teams.away.name}
        </h2>

        <p class="league">
          ${game.league.name} — ${game.league.country}
        </p>

        <div class="analysis">

          <div class="stat">
            <strong>${percent(data.predictions.home)}</strong>
            <span>Vitória ${game.teams.home.name}</span>
          </div>

          <div class="stat">
            <strong>${percent(data.predictions.draw)}</strong>
            <span>Empate</span>
          </div>

          <div class="stat">
            <strong>${percent(data.predictions.away)}</strong>
            <span>Vitória ${game.teams.away.name}</span>
          </div>

        </div>

        <h3 style="margin-top:20px;">
          Odds e valor esperado
        </h3>

        ${renderOdds(data.odds, data.predictions)}

        <h3 style="margin-top:20px;">
          Estatísticas
        </h3>

        ${renderStats(data.statistics)}
      </div>
    `;

    gamesContainer.insertAdjacentHTML(
      "afterbegin",
      analysisHTML
    );

    showMessage("");

  } catch (error) {
    showMessage(error.message, "error");
  }
}

function renderOdds(odds, predictions) {
  if (!odds) {
    return `
      <p style="margin-top:10px;">
        Odds não disponíveis para esta partida.
      </p>
    `;
  }

  const rows = [];

  if (odds.home) {
    rows.push(createOddRow(
      "Casa",
      odds.home,
      predictions.home
    ));
  }

  if (odds.draw) {
    rows.push(createOddRow(
      "Empate",
      odds.draw,
      predictions.draw
    ));
  }

  if (odds.away) {
    rows.push(createOddRow(
      "Fora",
      odds.away,
      predictions.away
    ));
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Mercado</th>
          <th>Odd</th>
          <th>Probabilidade</th>
          <th>EV</th>
        </tr>
      </thead>

      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
}

function createOddRow(name, odd, probability) {
  const ev = ((Number(probability) / 100) * Number(odd) - 1) * 100;

  const className =
    ev >= 0
      ? "value-positive"
      : "value-negative";

  return `
    <tr>
      <td>${name}</td>
      <td>${Number(odd).toFixed(2)}</td>
      <td>${percent(probability)}</td>
      <td class="${className}">
        ${ev.toFixed(2)}%
      </td>
    </tr>
  `;
}

function renderStats(statistics) {
  if (!statistics || statistics.length === 0) {
    return `
      <p>
        Estatísticas detalhadas não disponíveis.
      </p>
    `;
  }

  return statistics.map(team => `
    <div style="margin-top:15px;">
      <strong>${team.team.name}</strong>

      <div class="analysis">

        ${team.statistics
          .slice(0, 6)
          .map(stat => `
            <div class="stat">
              <strong>${stat.value ?? "-"}</strong>
              <span>${stat.type}</span>
            </div>
          `)
          .join("")}

      </div>
    </div>
  `).join("");
}

searchButton.addEventListener("click", loadGames);

loadGames();
