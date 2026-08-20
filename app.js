/* global Chart, REPORT */
(function () {
  const R = window.REPORT;
  const K = R.kpis;

  const money = (n, digits = 0) =>
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    }).format(n);

  const rub = (n) => `${money(Math.round(n))} ₽`;
  const mln = (n) => `${money(n / 1e6, 1)} млн ₽`;
  const iso = (s) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-");
    return `${d}.${m}.${y}`;
  };

  const selfNames = /малеев алексей/i;
  const internetShop = /интернет\s*магазин/i;

  const pill = (status) => {
    const map = {
      пропал: "gone",
      уходит: "leaving",
      тишина: "silent",
      живой: "alive",
    };
    const cls = map[status] || "silent";
    return `<span class="pill ${cls}">${status}</span>`;
  };

  document.getElementById("as-of").textContent = `На ${R.as_of}`;
  document.getElementById("lede").textContent =
    `Только склад «Магазин №11/п.Березняковский, Омутинская 26а/». Реализации ${iso(R.period.from)} — ${iso(R.period.to)}. ${money(K.docs)} отгрузок, ${K.clients} контрагентов. Другие магазины и РЦ в расчёт не входят.`;

  document.getElementById("a-lost").textContent =
    `Да: ${K.lost_significant} значимых из ${K.clients}`;
  document.getElementById("a-lost-p").textContent =
    `90+ дней без покупки, сумма от 100 тыс. ₽ или от 3 отгрузок. Их история — ${mln(K.lost_revenue)}. Сейчас живых (покупка за 60 дней) только ${K.alive}. Ещё ${K.leaving} «уходят» (90–179 дней), ${K.gone} молчат 180+ дней.`;

  const checkUp = K.avg_check_delta_pct >= 0;
  document.getElementById("a-check").textContent = checkUp
    ? `Нет: +${Math.abs(K.avg_check_delta_pct)}% к 2024`
    : `Да: −${Math.abs(K.avg_check_delta_pct)}% к 2024`;
  document.getElementById("a-check-p").textContent = checkUp
    ? `Средний чек отгрузки ${rub(K.avg_check_2024)} в 2024 → ${rub(K.avg_check_2026)} в 2026. У ${K.like_clients} клиентов, кто покупал в оба года, чек ${K.like_delta_pct > 0 ? "+" : ""}${K.like_delta_pct}%. Падают не все — падают конкретные.`
    : `Средний чек отгрузки ${rub(K.avg_check_2024)} в 2024 → ${rub(K.avg_check_2026)} в 2026.`;

  const mgrs = R.managers.filter((m) => m.role === "b2b");
  const lead = mgrs[0];
  const floorRev = R.managers
    .filter((m) => m.role === "floor")
    .reduce((s, m) => s + m.revenue, 0);
  document.getElementById("a-mgr").textContent = lead
    ? `${lead.short}: ${mln(lead.revenue)}`
    : "Менеджеры";
  document.getElementById("a-mgr-p").textContent = lead
    ? `${lead.short} — ${money(lead.clients)} клиентов, ${money(lead.docs)} отгрузок, ${Math.round((lead.revenue / K.revenue) * 100)}% выручки склада. Зал (Чащина, Важенина и др.) — ещё ${mln(floorRev)}.`
    : "";

  const y24 = R.years.find((y) => y.year === "2024");
  const y25 = R.years.find((y) => y.year === "2025");
  const y26 = R.years.find((y) => y.year === "2026");
  document.getElementById("stats").innerHTML = [
    [`${mln(K.revenue)}`, "Выручка за период"],
    [`${mln(y24.revenue)}`, "2024"],
    [`${mln(y25.revenue)}`, "2025"],
    [`${mln(y26.revenue)}`, "2026 по 19 авг", true],
    [`${K.alive}`, "Живых клиентов", true],
  ]
    .map(
      ([v, l, hl]) =>
        `<article${hl ? ' class="hl"' : ""}><b>${v}</b><span>${l}</span></article>`
    )
    .join("");

  document.getElementById("top-months").innerHTML = R.top_months
    .map(
      (m) =>
        `<li><span>${m.label}</span><span class="num">${mln(m.revenue)}</span></li>`
    )
    .join("");
  document.getElementById("low-months").innerHTML = R.low_months
    .map(
      (m) =>
        `<li><span>${m.label}</span><span class="num">${mln(m.revenue)}</span></li>`
    )
    .join("");

  const may26 = R.months.find((m) => m.key === "2026-05");
  const may25 = R.months.find((m) => m.key === "2025-05");
  const aug24 = R.months.find((m) => m.key === "2024-08");
  const aug26 = R.months.find((m) => m.key === "2026-08");
  document.getElementById("yoy-note").textContent =
    `Май к маю: ${mln(may25.revenue)} (2025) → ${mln(may26.revenue)} (2026, ${may26.yoy_pct}%). Август 2024 был ${mln(aug24.revenue)}; август 2026 по 19-е — ${mln(aug26.revenue)}. Зима слабее лета каждый год: дно среди закрытых месяцев — январь 2024, январь 2025 и февраль 2024.`;

  document.getElementById("like-note").textContent =
    `Like-for-like: ${K.like_clients} клиентов с покупками в 2024 и 2026. Их средний чек ${rub(K.like_avg_2024)} → ${rub(K.like_avg_2026)} (${K.like_delta_pct > 0 ? "+" : ""}${K.like_delta_pct}%). У ${K.like_down} из них чек всё же просел больше чем на 15% — Теремъ, Рогачев, Промдорсервис, Неострой.`;

  const colors = R.months.map((m) => {
    if (m.incomplete) return "#c4b5e0";
    if (m.peak) return "#c81e3a";
    if (m.slump) return "#c4a000";
    return "#4208a8";
  });

  new Chart(document.getElementById("revChart"), {
    type: "bar",
    data: {
      labels: R.months.map((m) => m.label),
      datasets: [
        {
          label: "Выручка, ₽",
          data: R.months.map((m) => m.revenue),
          backgroundColor: colors,
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const m = R.months[ctx.dataIndex];
              return [
                `Выручка: ${rub(m.revenue)}`,
                `Отгрузок: ${m.docs}`,
                `Средний чек: ${rub(m.avg_check)}`,
                `Клиентов: ${m.clients}`,
                m.yoy_pct == null ? "" : `К прошлому году: ${m.yoy_pct}%`,
              ].filter(Boolean);
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { maxRotation: 90, minRotation: 60, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            callback: (v) => (v / 1e6).toFixed(1) + " млн",
          },
          title: { display: true, text: "Выручка, млн ₽" },
          grid: { color: "rgba(66,8,168,0.08)" },
        },
      },
    },
  });

  new Chart(document.getElementById("checkChart"), {
    type: "line",
    data: {
      labels: R.months.map((m) => m.label),
      datasets: [
        {
          label: "Средний чек, ₽",
          data: R.months.map((m) => m.avg_check),
          borderColor: "#c81e3a",
          backgroundColor: "rgba(200,30,58,0.08)",
          fill: true,
          tension: 0.25,
          pointRadius: 3,
          pointBackgroundColor: "#c81e3a",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxRotation: 90, minRotation: 60, font: { size: 10 } },
          grid: { display: false },
        },
        y: {
          ticks: { callback: (v) => money(v) },
          title: { display: true, text: "Средний чек отгрузки, ₽" },
          grid: { color: "rgba(66,8,168,0.08)" },
        },
      },
    },
  });

  const lostBody = document.getElementById("lost-rows");
  const lostCount = document.getElementById("lost-count");
  const renderLost = () => {
    const q = document.getElementById("lost-q").value.trim().toLowerCase();
    const st = document.getElementById("lost-status").value;
    const rows = R.lost_clients.filter((c) => {
      if (st && c.status !== st) return false;
      if (!q) return true;
      return (
        c.client.toLowerCase().includes(q) ||
        (c.manager_short || "").toLowerCase().includes(q)
      );
    });
    lostCount.textContent = `${rows.length} из ${R.lost_clients.length}`;
    lostBody.innerHTML = rows
      .map(
        (c) => `<tr class="${c.status === "пропал" ? "gone" : "leaving"}">
        <td>${c.client}</td>
        <td>${pill(c.status)}</td>
        <td>${c.manager_short}</td>
        <td class="num">${rub(c.revenue)}</td>
        <td class="num">${c.docs}</td>
        <td>${iso(c.last)}</td>
        <td class="num">${c.silent_days} дн.</td>
      </tr>`
      )
      .join("");
  };
  document.getElementById("lost-q").addEventListener("input", renderLost);
  document.getElementById("lost-status").addEventListener("change", renderLost);
  renderLost();

  const focusMgrs = R.managers.filter(
    (m) => m.role !== "other" || m.short === "Касса / прочие"
  );
  let currentMgr = focusMgrs[0];
  const cards = document.getElementById("mgr-cards");
  const mgrRows = document.getElementById("mgr-rows");
  const mgrCount = document.getElementById("mgr-count");

  const whoLabel = (m) => {
    if (m.role === "b2b") return "B2B сейчас";
    if (m.role === "former") return "Бывший лидер";
    if (m.role === "floor") return "Зал / интернет";
    return "Остальные авторы";
  };

  const drawCards = () => {
    cards.innerHTML = focusMgrs
      .map((m) => {
        const on = m.short === currentMgr.short ? " on" : "";
        const extra = m.role === "floor" ? " former" : "";
        return `<button type="button" class="mgr${on}${extra}" data-short="${m.short}">
          <p class="who">${whoLabel(m)}</p>
          <h3>${m.short}</h3>
          <div class="sum">${mln(m.revenue)}</div>
          <div class="meta">${m.clients} кл. · ${money(m.docs)} док. · чек ${rub(m.avg_check)}</div>
        </button>`;
      })
      .join("");
    cards.querySelectorAll(".mgr").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentMgr = focusMgrs.find((m) => m.short === btn.dataset.short);
        drawCards();
        renderMgr();
      });
    });
  };

  const renderMgr = () => {
    const q = document.getElementById("mgr-q").value.trim().toLowerCase();
    const list = currentMgr.all_clients || currentMgr.top_clients || [];
    const rows = list.filter((c) => !q || c.client.toLowerCase().includes(q));
    mgrCount.textContent = `${rows.length} клиентов · ${currentMgr.short}`;
    if (!list.length) {
      mgrRows.innerHTML = `<tr><td colspan="4">По кассе и мелким авторам клиентская книга не разворачивается — это не закреплённый B2B.</td></tr>`;
      return;
    }
    mgrRows.innerHTML = rows
      .map(
        (c) => `<tr>
        <td>${c.client}</td>
        <td class="num">${rub(c.revenue)}</td>
        <td class="num">${c.docs}</td>
        <td>${iso(c.last)}</td>
      </tr>`
      )
      .join("");
  };

  document.getElementById("mgr-q").addEventListener("input", renderMgr);
  drawCards();
  renderMgr();

  document.getElementById("fall-rows").innerHTML = R.falling_check
    .map((c) => {
      const delta = c.avg_delta;
      const cls = delta < 0 ? "delta-neg" : "delta-pos";
      return `<tr>
        <td>${c.client}</td>
        <td>${c.manager_short}</td>
        <td class="num">${rub(c.avg_first)}</td>
        <td class="num">${rub(c.avg_last)}</td>
        <td class="num ${cls}">${delta < 0 ? "−" : "+"}${rub(Math.abs(delta))}</td>
        <td>${pill(c.status)}</td>
      </tr>`;
    })
    .join("");

  const leavingNow = R.lost_clients
    .filter(
      (c) =>
        c.status === "уходит" &&
        c.revenue >= 20000 &&
        !selfNames.test(c.client) &&
        !internetShop.test(c.client)
    )
    .slice(0, 12);
  document.getElementById("act-leaving").innerHTML = leavingNow
    .map(
      (c) => `<tr class="leaving">
        <td>${c.client}</td>
        <td>${c.manager_short}</td>
        <td class="num">${rub(c.revenue)}</td>
        <td class="num">${c.silent_days} дн.</td>
      </tr>`
    )
    .join("");

  const goneBook = R.lost_clients
    .filter(
      (c) =>
        c.status === "пропал" &&
        c.revenue >= 100000 &&
        !selfNames.test(c.client) &&
        !internetShop.test(c.client)
    )
    .slice(0, 12);
  document.getElementById("act-gone").innerHTML = goneBook
    .map(
      (c) => `<tr class="gone">
        <td>${c.client}</td>
        <td class="num">${rub(c.revenue)}</td>
        <td>${iso(c.last)}</td>
      </tr>`
    )
    .join("");

  document.getElementById("foot").textContent =
    `«У Михалыча» · только Магазин №11 / п. Березняковский, Омутинская 26а · реализации 1С ${iso(R.period.from)} — ${iso(R.period.to)} · собрано ${R.as_of}. Другие магазины и РЦ исключены.`;
})();
