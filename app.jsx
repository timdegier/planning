/* app.jsx — header, controls, flag logic, view routing, tooltip, tweaks. */

const TWEAK_DEFAULTS = {
  "density": "comfortable",
  "showFlags": true,
  "accent": ["oklch(0.55 0.13 255)", "oklch(0.64 0.11 195)"]
};

function flagShows(data) {
  const costs = data.shows.map(s => s.totalCost).slice().sort((a, b) => a - b);
  const cpls = data.shows.map(s => s.totalCost / Math.max(s.totalFL, 1)).slice().sort((a, b) => a - b);
  const med = arr => arr[Math.floor(arr.length / 2)];
  const medCost = med(costs);
  const medCpl = med(cpls);
  const flagged = new Set();
  const reason = {};
  data.shows.forEach(s => {
    const cpl = s.totalCost / Math.max(s.totalFL, 1);
    if (s.totalCost >= medCost && cpl >= medCpl * 1.3) {
      flagged.add(s.name);
      reason[s.name] = fmtEuro(s.totalCost, true) + " kosten · " + fmtNum(s.totalFL) +
        " first listens — bij de minst efficiënte van de slate";
    }
  });
  return { flagged, reason };
}

function Tooltip({ hover }) {
  if (!hover) return null;
  const i = hover.info;
  const style = {
    left: Math.min(hover.x + 14, window.innerWidth - 230),
    top: Math.max(hover.y - 12, 8)
  };
  let body;
  if (i.rows) {
    body = i.rows.map((r, k) =>
      React.createElement("div", { className: "tt-row", key: k },
        React.createElement("span", { className: "tt-k" }, r.k),
        React.createElement("span", { className: "tt-v " + (r.cls || "") }, r.v)));
  } else if (i.scatter) {
    body = React.createElement(React.Fragment, null,
      React.createElement("div", { className: "tt-row" }, React.createElement("span", { className: "tt-k" }, "Genre"), React.createElement("span", null, i.genre)),
      React.createElement("div", { className: "tt-row" }, React.createElement("span", { className: "tt-k cost" }, "Totale kosten"), React.createElement("span", null, fmtEuro(i.cost, false))),
      React.createElement("div", { className: "tt-row" }, React.createElement("span", { className: "tt-k fl" }, "First listens"), React.createElement("span", null, fmtNum(i.fl)))
    );
  } else {
    body = React.createElement(React.Fragment, null,
      i.show ? React.createElement("div", { className: "tt-sub" }, i.show) : null,
      React.createElement("div", { className: "tt-row" }, React.createElement("span", { className: "tt-k cost" }, "Kosten"), React.createElement("span", null, i.cost ? fmtEuro(i.cost, false) : "—")),
      React.createElement("div", { className: "tt-row" }, React.createElement("span", { className: "tt-k fl" }, "First listens"), React.createElement("span", null, i.fl ? fmtNum(i.fl) : "—"))
    );
  }
  return React.createElement("div", { className: "tooltip", style },
    React.createElement("div", { className: "tt-title" }, i.title),
    body
  );
}

function Seg({ value, options, onChange }) {
  return React.createElement("div", { className: "seg" },
    options.map(o =>
      React.createElement("button", {
        key: o.v, className: "seg-btn" + (value === o.v ? " on" : ""), onClick: () => onChange(o.v)
      }, o.label)
    )
  );
}

function App() {
  const data = window.SLATE_DATA;
  const budget = window.BUDGET_DATA;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = React.useState("matrix");
  const [mode, setMode] = React.useState("both");
  const [sort, setSort] = React.useState("genre");
  const [hover, setHover] = React.useState(null);

  const { flagged, reason } = React.useMemo(() => flagShows(data), [data]);
  const activeFlags = t.showFlags ? flagged : new Set();

  const onHover = React.useCallback((ev, info) => {
    if (!ev) { setHover(null); return; }
    setHover({ x: ev.clientX, y: ev.clientY, info });
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--cost", t.accent[0]);
    root.style.setProperty("--fl", t.accent[1]);
  }, [t.accent]);

  return React.createElement("div", { className: "app density-" + t.density },
    React.createElement("header", { className: "topbar" },
      React.createElement("div", { className: "brand" },
        React.createElement("div", { className: "brand-mark" }),
        React.createElement("div", null,
          React.createElement("h1", null, "Podcast Slate — 2026"),
          React.createElement("div", { className: "brand-sub" },
            "Jaarplanning · jan – dec 2026 · " + data.shows.length + " bevestigd · " + data.placeholders.length + " placeholder · kosten vs. first listens")
        )
      ),
      React.createElement("div", { className: "tabs" },
        React.createElement(Seg, {
          value: view,
          options: [{ v: "matrix", label: "Matrix" }, { v: "scatter", label: "Kosten vs. bereik" }],
          onChange: setView
        })
      )
    ),

    React.createElement(BudgetSummary, { b: budget, onHover }),

    React.createElement("div", { className: "summary slate-summary" },
      React.createElement("div", { className: "slate-summary-head" }, "Bevestigde slate · " + data.shows.length + " shows met first-listen forecast"),
      React.createElement(KpiStrip, { data, flagged: activeFlags }),
      React.createElement(TrendChart, { data })
    ),

    React.createElement("div", { className: "toolbar" },
      view === "matrix"
        ? React.createElement(React.Fragment, null,
            React.createElement("div", { className: "tb-group" },
              React.createElement("span", { className: "tb-label" }, "Toon"),
              React.createElement(Seg, {
                value: mode,
                options: [{ v: "both", label: "Beide" }, { v: "cost", label: "Kosten" }, { v: "fl", label: "First listens" }],
                onChange: setMode
              })
            ),
            React.createElement("div", { className: "tb-group" },
              React.createElement("span", { className: "tb-label" }, "Sorteer"),
              React.createElement(Seg, {
                value: sort,
                options: [{ v: "genre", label: "Genre" }, { v: "spend", label: "Kosten" }, { v: "listens", label: "Luisteraars" }, { v: "flagged", label: "Gemarkeerd" }],
                onChange: setSort
              })
            ),
            React.createElement("div", { className: "legend" },
              React.createElement("span", { className: "lg" }, React.createElement("i", { className: "lg-sw cost" }), "Kosten"),
              React.createElement("span", { className: "lg" }, React.createElement("i", { className: "lg-sw fl" }), "First listens"),
              React.createElement("span", { className: "lg" }, React.createElement("i", { className: "lg-sw ph" }), "Placeholder"),
              React.createElement("span", { className: "lg muted" }, "Jan–Mei gerealiseerd · Jun–Dec gepland"),
              activeFlags.size ? React.createElement("span", { className: "lg" }, React.createElement("i", { className: "lg-flag" }, "!"), "Veel kosten · weinig luisteraars") : null
            )
          )
        : React.createElement("div", { className: "legend scatter-legend" },
            data.genreOrder.map(g =>
              React.createElement("span", { className: "lg", key: g },
                React.createElement("i", { className: "lg-sw", style: { background: GENRE_COLORS[g] } }), g)
            ),
            React.createElement("span", { className: "lg muted" }, "bolgrootte = totale kosten · rode ring = gemarkeerd")
          )
    ),

    React.createElement("main", { className: "stage" },
      view === "matrix"
        ? React.createElement(MatrixView, { data, mode, sort, flagged: activeFlags, flagReason: reason, onHover })
        : React.createElement(ScatterView, { data, flagged: activeFlags, onHover })
    ),

    React.createElement("footer", { className: "foot-note" },
      "Bevestigd = shows In Production / Pre-Production / Launch. Placeholders = onbevestigde shows (In Negotiation, Concept Development, Pitching, Ended, Dead). ",
      "Jan–Mei zijn gerealiseerde releases, Jun–Dec gepland. Genres zijn afgeleid; 'first listens' als absolute aantallen. ",
      "Vrije ruimte = budget − bevestigd − placeholder; overige (niet-exclusieve) uitgaven blijven buiten beschouwing."
    ),

    React.createElement(Tooltip, { hover }),

    React.createElement(TweaksPanel, null,
      React.createElement(TweakSection, { label: "Layout" }),
      React.createElement(TweakRadio, {
        label: "Dichtheid", value: t.density, options: ["compact", "comfortable"],
        onChange: v => setTweak("density", v)
      }),
      React.createElement(TweakToggle, {
        label: "Markeer dure/lage shows", value: t.showFlags,
        onChange: v => setTweak("showFlags", v)
      }),
      React.createElement(TweakSection, { label: "Kleur (kosten / first listens)" }),
      React.createElement(TweakColor, {
        label: "Paar", value: t.accent,
        options: [
          ["oklch(0.55 0.13 255)", "oklch(0.64 0.11 195)"],
          ["oklch(0.5 0.15 285)", "oklch(0.62 0.13 150)"],
          ["oklch(0.52 0.14 245)", "oklch(0.66 0.13 70)"]
        ],
        onChange: v => setTweak("accent", v)
      })
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
