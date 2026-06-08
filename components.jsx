/* components.jsx — presentational pieces for the slate overview (full-year 2026).
   Exports to window: fmtEuro, fmtNum, shortDate, niceTicks, GENRE_COLORS,
   KpiStrip, TrendChart, MatrixView, ScatterView. */

const _e = React.createElement;

/* ---------- formatting ---------- */
function fmtEuro(v, compact) {
  if (v == null) return "—";
  if (compact) {
    if (Math.abs(v) >= 1000000) return "€" + (v / 1000000).toFixed(Math.abs(v) >= 10000000 ? 0 : 1).replace(".", ",") + "M";
    if (Math.abs(v) >= 1000) return "€" + Math.round(v / 1000) + "k";
    return "€" + Math.round(v);
  }
  return "€" + Math.round(v).toLocaleString("nl-NL");
}
function fmtNum(v) {
  if (v == null) return "—";
  return Math.round(v).toLocaleString("nl-NL");
}
const NL_MONTHS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
function shortDate(d) {
  if (!d) return "";
  const p = d.split("-");
  return parseInt(p[2], 10) + " " + NL_MONTHS[parseInt(p[1], 10) - 1];
}
function niceTicks(max, target) {
  target = target || 4;
  const raw = max / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  step *= mag;
  const ticks = [];
  for (let v = 0; v <= max + 1e-6; v += step) ticks.push(v);
  return ticks;
}

const GENRE_COLORS = {
  "True Crime": "oklch(0.56 0.15 22)",
  "Voetbal & Sport": "oklch(0.64 0.14 58)",
  "Comedy & Talk": "oklch(0.55 0.14 268)",
  "Maatschappij & Geschiedenis": "oklch(0.56 0.11 168)",
  "Overig": "oklch(0.6 0.02 260)"
};

/* perceptual bar scaling so small values stay visible */
function scaleW(v, max) {
  if (!v || !max) return 0;
  return Math.max(0.06, Math.pow(v / max, 0.62));
}

/* ---------- KPI strip ---------- */
function KpiStrip({ data, flagged }) {
  const nShows = data.shows.length;
  const items = [
    { label: "Totale kosten", value: fmtEuro(data.grandCost, false), sub: "heel 2026 · " + nShows + " shows", accent: "var(--cost)" },
    { label: "Totaal first listens", value: fmtNum(data.grandFL), sub: "forecast over het jaar", accent: "var(--fl)" },
    { label: "Gem. kosten / maand", value: fmtEuro(data.grandCost / 12, true), sub: "over 12 maanden", accent: "var(--ink-2)" },
    { label: "Gemarkeerde shows", value: String(flagged.size), sub: "veel kosten · weinig luisteraars", accent: "var(--flag)" }
  ];
  return _e("div", { className: "kpis" },
    items.map((it, i) =>
      _e("div", { className: "kpi", key: i },
        _e("div", { className: "kpi-label" }, it.label),
        _e("div", { className: "kpi-value", style: { color: it.accent } }, it.value),
        _e("div", { className: "kpi-sub" }, it.sub)
      )
    )
  );
}

/* ---------- monthly dual trend (cost bars + FL line) ---------- */
function TrendChart({ data }) {
  const W = 560, H = 138, padL = 8, padR = 8, padT = 14, padB = 28;
  const n = data.months.length; // 12
  const maxC = Math.max(...data.monthlyCost);
  const maxF = Math.max(...data.monthlyFL);
  const bw = (W - padL - padR) / n;
  const innerH = H - padT - padB;
  const yF = v => padT + innerH * (1 - v / maxF);
  const xMid = i => padL + i * bw + bw / 2;

  const bars = data.monthlyCost.map((v, i) => {
    const h = innerH * (v / maxC);
    return _e("rect", { key: i, x: padL + i * bw + bw * 0.18, y: padT + innerH - h, width: bw * 0.64, height: h, rx: 1, fill: "var(--cost)", opacity: 0.26 });
  });
  const linePts = data.monthlyFL.map((v, i) => [xMid(i), yF(v)]);
  const path = linePts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");

  const mlabels = data.months.map((m, i) =>
    _e("text", { key: i, x: xMid(i), y: H - 9, textAnchor: "middle", className: "trend-x" }, m.short));

  return _e("div", { className: "trend" },
    _e("div", { className: "trend-head" },
      _e("span", null, "Slate per maand"),
      _e("span", { className: "trend-legend" },
        _e("i", { className: "sw", style: { background: "var(--cost)", opacity: 0.5 } }), "Kosten",
        _e("i", { className: "sw", style: { background: "var(--fl)", marginLeft: 10 } }), "First listens"
      )
    ),
    _e("svg", { viewBox: `0 0 ${W} ${H}`, className: "trend-svg", preserveAspectRatio: "none" },
      bars,
      _e("path", { d: path, fill: "none", stroke: "var(--fl)", strokeWidth: 1.75 }),
      mlabels
    )
  );
}

/* ---------- matrix cell ---------- */
function Cell({ c, f, mode, maxCellCost, maxCellFL, title, show, monthStart, onHover }) {
  const enter = (ev) => onHover(ev, { title, show, cost: c, fl: f });
  const leave = () => onHover(null);
  const ms = monthStart ? " month-start" : "";

  if (c === 0 && f === 0) {
    return _e("td", { className: "cell empty" + ms, onMouseEnter: enter, onMouseLeave: leave }, _e("span", { className: "dash" }, "·"));
  }
  if (mode === "both") {
    return _e("td", { className: "cell" + ms, onMouseEnter: enter, onMouseLeave: leave },
      _e("div", { className: "dual" },
        _e("div", { className: "track" }, _e("div", { className: "fill cost", style: { width: (scaleW(c, maxCellCost) * 100) + "%" } })),
        _e("div", { className: "track" }, _e("div", { className: "fill fl", style: { width: (scaleW(f, maxCellFL) * 100) + "%" } }))
      )
    );
  }
  const v = mode === "cost" ? c : f;
  const mx = mode === "cost" ? maxCellCost : maxCellFL;
  const cls = mode === "cost" ? "cost" : "fl";
  return _e("td", { className: "cell num " + cls + ms, onMouseEnter: enter, onMouseLeave: leave },
    _e("div", { className: "heat " + cls, style: { width: (scaleW(v, mx) * 100) + "%" } }),
    _e("span", { className: "cval" }, mode === "cost" ? fmtEuro(v, true) : fmtNum(v))
  );
}

/* ---------- one show row ---------- */
function ShowRow({ s, series, mode, units, maxCellCost, maxCellFL, maxTotalCost, maxTotalFL, flag, onHover, showGenreTag }) {
  return _e("tr", { className: "show-row" + (flag ? " flagged" : "") },
    _e("th", { className: "rowhead", scope: "row" },
      _e("div", { className: "rh-inner" },
        flag ? _e("span", { className: "flag-dot", title: flag }, "!") : null,
        _e("span", { className: "show-name", title: s.name }, s.name),
        showGenreTag ? _e("span", { className: "genre-pill", style: { "--gc": GENRE_COLORS[s.genre] } }, s.genre) : null
      )
    ),
    units.map((u, i) => _e(Cell, {
      key: i, c: series.cost[i], f: series.fl[i], mode, maxCellCost, maxCellFL,
      title: u.label + (u.sub ? " · " + u.sub : ""), show: s.name, monthStart: u.monthStart, onHover
    })),
    _e("td", { className: "total-cell" },
      _e("div", { className: "tot cost" },
        _e("div", { className: "tbar" }, _e("div", { className: "tbar-fill cost", style: { width: (scaleW(s.totalCost, maxTotalCost) * 100) + "%" } })),
        _e("span", null, fmtEuro(s.totalCost, true))
      ),
      _e("div", { className: "tot fl" },
        _e("div", { className: "tbar" }, _e("div", { className: "tbar-fill fl", style: { width: (scaleW(s.totalFL, maxTotalFL) * 100) + "%" } })),
        _e("span", null, fmtNum(s.totalFL))
      )
    )
  );
}

/* ---------- matrix view (gran: 'maand' | 'week') ---------- */
function MatrixView({ data, gran, mode, sort, flagged, flagReason, onHover }) {
  const isMonth = !gran || gran === "maand";

  // column units + per-show accessor
  let units, footTotals;
  if (isMonth) {
    units = data.months.map(m => ({ key: m.index, label: m.name, code: m.short, sub: m.actual ? "gerealiseerd" : "gepland", monthStart: false }));
    footTotals = { cost: data.monthlyCost, fl: data.monthlyFL };
  } else {
    units = data.weeks.map((w, i) => ({
      key: w.code, label: w.code, code: w.code.replace("W", ""), sub: shortDate(w.date),
      monthStart: i > 0 && w.m !== data.weeks[i - 1].m
    }));
    footTotals = { cost: data.weeklyCost, fl: data.weeklyFL };
  }
  const seriesOf = s => isMonth ? { cost: s.monthCost, fl: s.monthFL } : { cost: s.cost, fl: s.fl };

  let maxCellCost = 0, maxCellFL = 0, maxTotalCost = 0, maxTotalFL = 0;
  data.shows.forEach(s => {
    maxTotalCost = Math.max(maxTotalCost, s.totalCost);
    maxTotalFL = Math.max(maxTotalFL, s.totalFL);
    const sr = seriesOf(s);
    for (let i = 0; i < units.length; i++) { maxCellCost = Math.max(maxCellCost, sr.cost[i]); maxCellFL = Math.max(maxCellFL, sr.fl[i]); }
  });

  const headerRow = _e("tr", null,
    _e("th", { className: "corner" }, _e("span", null, "Show"),
      _e("span", { className: "corner-sub" }, mode === "both" ? "kosten / first listens" : mode === "cost" ? "kosten" : "first listens")),
    units.map((u, i) =>
      _e("th", { key: i, className: "wk" + (u.monthStart ? " month-start" : "") },
        _e("span", { className: "wk-code" }, u.code),
        _e("span", { className: "wk-date" }, isMonth ? u.sub : u.sub)
      )
    ),
    _e("th", { className: "tot-head" }, "Totaal")
  );

  const rows = [];
  const pushShow = (s, tag) => rows.push(_e(ShowRow, {
    key: s.name, s, series: seriesOf(s), mode, units, maxCellCost, maxCellFL, maxTotalCost, maxTotalFL,
    flag: flagged.has(s.name) ? flagReason[s.name] : null, onHover, showGenreTag: tag
  }));

  if (sort === "genre") {
    data.genreOrder.forEach(g => {
      const list = data.shows.filter(s => s.genre === g).sort((a, b) => b.totalCost - a.totalCost);
      if (!list.length) return;
      const subCost = list.reduce((a, s) => a + s.totalCost, 0);
      const subFL = list.reduce((a, s) => a + s.totalFL, 0);
      rows.push(_e("tr", { className: "group-row", key: "g-" + g },
        _e("th", { className: "group-head", style: { "--gc": GENRE_COLORS[g] } },
          _e("span", { className: "g-name" }, g),
          _e("span", { className: "g-count" }, list.length)
        ),
        _e("td", { className: "group-fill", colSpan: units.length }),
        _e("td", { className: "group-tot" },
          _e("div", { className: "tot cost" }, _e("span", null, fmtEuro(subCost, true))),
          _e("div", { className: "tot fl" }, _e("span", null, fmtNum(subFL)))
        )
      ));
      list.forEach(s => pushShow(s, false));
    });
  } else {
    let list = data.shows.slice();
    if (sort === "spend") list.sort((a, b) => b.totalCost - a.totalCost);
    else if (sort === "listens") list.sort((a, b) => b.totalFL - a.totalFL);
    else if (sort === "flagged") list.sort((a, b) => (flagged.has(b.name) - flagged.has(a.name)) || (b.totalCost - a.totalCost));
    list.forEach(s => pushShow(s, true));
  }

  const footer = _e("tr", { className: "foot-row" },
    _e("th", { className: "foot-head" }, "Slate totaal"),
    units.map((u, i) =>
      _e("td", { key: i, className: "foot-cell" + (u.monthStart ? " month-start" : "") },
        _e("div", { className: "foot-c" }, fmtEuro(footTotals.cost[i], true)),
        _e("div", { className: "foot-f" }, fmtNum(footTotals.fl[i]))
      )
    ),
    _e("td", { className: "foot-total" },
      _e("div", { className: "foot-c" }, fmtEuro(data.grandCost, true)),
      _e("div", { className: "foot-f" }, fmtNum(data.grandFL))
    )
  );

  const colgroup = _e("colgroup", null,
    _e("col", { className: "col-show" }),
    units.map((u, i) => _e("col", { key: i, className: isMonth ? "col-month" : "col-wk" })),
    _e("col", { className: "col-tot" })
  );

  return _e("div", { className: "matrix-wrap" + (isMonth ? " gran-month" : " gran-week") },
    _e("table", { className: "matrix" },
      colgroup,
      _e("thead", null, headerRow),
      _e("tbody", null, rows),
      _e("tfoot", null, footer)
    )
  );
}

/* ---------- scatter: cost (x) vs first listens (y) ---------- */
function ScatterView({ data, flagged, onHover }) {
  const W = 1060, H = 520, padL = 84, padR = 44, padT = 26, padB = 60;
  const maxCv = Math.max(...data.shows.map(s => s.totalCost));
  const maxFv = Math.max(...data.shows.map(s => s.totalFL));
  const maxC = maxCv * 1.06, maxF = maxFv * 1.08;
  const x = v => padL + (W - padL - padR) * (v / maxC);
  const y = v => H - padB - (H - padT - padB) * (v / maxF);

  const sortedC = data.shows.map(s => s.totalCost).sort((a, b) => a - b);
  const sortedF = data.shows.map(s => s.totalFL).sort((a, b) => a - b);
  const medC = sortedC[Math.floor(sortedC.length / 2)];
  const medF = sortedF[Math.floor(sortedF.length / 2)];

  const gridC = niceTicks(maxCv, 4);
  const gridF = niceTicks(maxFv, 4);

  const dots = data.shows.map(s => {
    const fl = flagged.has(s.name);
    const r = 5 + 6 * Math.sqrt(s.totalCost / maxC);
    return _e("g", {
      key: s.name,
      onMouseEnter: (ev) => onHover(ev, { title: s.name, scatter: true, cost: s.totalCost, fl: s.totalFL, genre: s.genre }),
      onMouseLeave: () => onHover(null), style: { cursor: "default" }
    },
      _e("circle", { cx: x(s.totalCost), cy: y(s.totalFL), r, fill: GENRE_COLORS[s.genre], fillOpacity: fl ? 0.95 : 0.6, stroke: fl ? "var(--flag)" : "white", strokeWidth: fl ? 2.5 : 1 }),
      fl ? _e("circle", { cx: x(s.totalCost), cy: y(s.totalFL), r: r + 4, fill: "none", stroke: "var(--flag)", strokeWidth: 1, strokeDasharray: "2 2", opacity: 0.7 }) : null
    );
  });

  const labelSet = new Set([...flagged]);
  data.shows.slice().sort((a, b) => b.totalCost - a.totalCost).slice(0, 7).forEach(s => labelSet.add(s.name));
  const labels = data.shows.filter(s => labelSet.has(s.name)).map(s =>
    _e("text", { key: s.name, x: x(s.totalCost) + 9, y: y(s.totalFL) + 3, className: "sc-label" },
      s.name.length > 24 ? s.name.slice(0, 23) + "…" : s.name));

  return _e("div", { className: "scatter-wrap" },
    _e("svg", { viewBox: `0 0 ${W} ${H}`, className: "scatter-svg" },
      _e("rect", { x: x(medC), y: y(medF), width: W - padR - x(medC), height: (H - padB) - y(medF), fill: "var(--flag)", opacity: 0.05 }),
      _e("line", { x1: x(medC), y1: padT, x2: x(medC), y2: H - padB, stroke: "var(--hair)", strokeDasharray: "3 4" }),
      _e("line", { x1: padL, y1: y(medF), x2: W - padR, y2: y(medF), stroke: "var(--hair)", strokeDasharray: "3 4" }),
      gridC.map((g, i) => _e("g", { key: "cx" + i },
        _e("line", { x1: x(g), y1: padT, x2: x(g), y2: H - padB, stroke: "var(--hair)", opacity: 0.5 }),
        _e("text", { x: x(g), y: H - padB + 20, textAnchor: "middle", className: "sc-axis" }, fmtEuro(g, true)))),
      gridF.map((g, i) => _e("g", { key: "fy" + i },
        _e("line", { x1: padL, y1: y(g), x2: W - padR, y2: y(g), stroke: "var(--hair)", opacity: 0.5 }),
        _e("text", { x: padL - 10, y: y(g) + 4, textAnchor: "end", className: "sc-axis" }, fmtNum(g)))),
      _e("text", { x: (padL + W - padR) / 2, y: H - 14, textAnchor: "middle", className: "sc-axis-title" }, "Totale kosten (€) →"),
      _e("text", { x: -((padT + H - padB) / 2), y: 20, textAnchor: "middle", transform: "rotate(-90)", className: "sc-axis-title" }, "Totaal first listens →"),
      _e("text", { x: W - padR - 8, y: y(medF) + 22, textAnchor: "end", className: "sc-quad" }, "veel kosten · weinig luisteraars"),
      dots,
      labels
    )
  );
}

Object.assign(window, { fmtEuro, fmtNum, shortDate, niceTicks, GENRE_COLORS, KpiStrip, TrendChart, MatrixView, ScatterView });
