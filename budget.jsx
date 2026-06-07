/* budget.jsx — budget-vs-spend hero summary (full-year 2026).
   53-week bar (month-separated, no per-bar text) + 12 month chips.
   Exports to window: BudgetSummary. Uses global fmtEuro/fmtNum/niceTicks + onHover. */

const _be = React.createElement;

function signEuro(v) {
  return (v >= 0 ? "+" : "−") + fmtEuro(Math.abs(v), true);
}

function BudgetChart({ b, onHover }) {
  const W = 660, H = 188, padL = 46, padR = 8, padT = 12, padB = 26;
  const n = b.weeks.length;
  const maxV = Math.max(...b.weeks.map(w => Math.max(w.budget, w.forecast)));
  const bw = (W - padL - padR) / n;
  const base = H - padB;
  const innerH = base - padT;
  const yOf = v => base - innerH * (v / (maxV * 1.04));

  const ticks = niceTicks(maxV, 3);
  const grid = ticks.map((t, i) =>
    _be("g", { key: "g" + i },
      _be("line", { x1: padL, y1: yOf(t), x2: W - padR, y2: yOf(t), stroke: "var(--hair-2)" }),
      _be("text", { x: padL - 6, y: yOf(t) + 3, textAnchor: "end", className: "bc-axis" }, fmtEuro(t, true))
    ));

  // month separators + labels
  const seps = [];
  b.weeks.forEach((w, i) => {
    if (i > 0 && w.m !== b.weeks[i - 1].m) {
      const xsep = padL + i * bw;
      seps.push(_be("line", { key: "s" + i, x1: xsep, y1: padT, x2: xsep, y2: base, stroke: "var(--hair)", strokeWidth: 1 }));
    }
  });
  const mlabels = [];
  let curM = -1;
  b.weeks.forEach((w, i) => {
    if (w.m !== curM) { curM = w.m; mlabels.push(_be("text", { key: "ml" + i, x: padL + i * bw + 2, y: H - 8, className: "bc-mlabel" }, b.monthsShort[w.m])); }
  });

  const cx = i => padL + i * bw + bw / 2;
  const barW = Math.min(11, bw * 0.62);

  // spend bars (overage above the budget line in red)
  const cols = b.weeks.map((w, i) => {
    const over = w.forecast > w.budget;
    const underTop = yOf(Math.min(w.forecast, w.budget));
    const enter = (ev) => onHover(ev, {
      title: w.code + " · " + shortDate(w.start) + " – " + shortDate(w.end),
      rows: [
        { k: "Budget", v: fmtEuro(w.budget, false) },
        { k: "Verwacht", v: fmtEuro(w.forecast, false), cls: over ? "over" : "" },
        { k: "Ruimte", v: signEuro(w.ruimte), cls: w.ruimte < 0 ? "over" : "ok" }
      ]
    });
    return _be("g", { key: w.code, onMouseEnter: enter, onMouseLeave: () => onHover(null) },
      _be("rect", { x: padL + i * bw, y: padT, width: bw, height: base - padT, fill: "transparent" }),
      _be("rect", { x: cx(i) - barW / 2, y: underTop, width: barW, height: base - underTop, rx: 1.5, fill: "var(--cost)", opacity: 0.82 }),
      over ? _be("rect", { x: cx(i) - barW / 2, y: yOf(w.forecast), width: barW, height: yOf(w.budget) - yOf(w.forecast), rx: 1.5, fill: "var(--flag)" }) : null
    );
  });

  // continuous budget line — a stepped path that holds each week's budget
  // flat across its bar, then steps to the next week (one unbroken stroke).
  let dline = "";
  b.weeks.forEach((w, i) => {
    const x0 = padL + i * bw, x1 = padL + (i + 1) * bw, yb = yOf(w.budget);
    dline += (i === 0 ? "M" : "L") + x0.toFixed(1) + " " + yb.toFixed(1) +
             " L" + x1.toFixed(1) + " " + yb.toFixed(1) + " ";
  });
  const budgetLine = _be("path", { d: dline.trim(), fill: "none", stroke: "var(--ink)", strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" });

  return _be("svg", { viewBox: `0 0 ${W} ${H}`, className: "budget-svg", preserveAspectRatio: "none" },
    grid, seps, cols, budgetLine, mlabels);
}

function MonthChips({ months }) {
  const max = Math.max(...months.map(m => Math.max(m.budget, m.forecast)));
  return _be("div", { className: "mchips" },
    months.map(m => {
      const over = m.ruimte < 0;
      const label = m.name.replace(/\s*2026/, "");
      return _be("div", { className: "mchip" + (over ? " over" : ""), key: m.name },
        _be("div", { className: "mchip-top" },
          _be("span", { className: "mchip-name" }, label),
          _be("span", { className: "mchip-var " + (over ? "over" : "ok") }, signEuro(m.ruimte))
        ),
        _be("div", { className: "mchip-bar" },
          _be("div", { className: "mb-budget", style: { width: (m.budget / max * 100) + "%" } }),
          _be("div", { className: "mb-fore " + (over ? "over" : "ok"), style: { width: (m.forecast / max * 100) + "%" } })
        )
      );
    })
  );
}

function BudgetSummary({ b, onHover }) {
  const pct = (b.totalForecast / b.totalBudget - 1) * 100;
  const over = b.totalRuimte < 0;
  return _be("section", { className: "budget-band" },
    _be("div", { className: "bb-grid" },
      _be("div", { className: "bb-stats" },
        _be("div", { className: "bb-eyebrow" }, "Budget vs. verwachte uitgave · heel 2026"),
        _be("div", { className: "bb-hero" },
          _be("div", { className: "bb-hero-val " + (over ? "over" : "ok") }, signEuro(b.totalRuimte)),
          _be("div", { className: "bb-hero-meta" },
            _be("span", { className: "bb-pill " + (over ? "over" : "ok") }, Math.abs(pct).toFixed(1).replace(".", ",") + "% " + (over ? "over budget" : "onder budget")),
            _be("span", { className: "bb-hero-lbl" }, "ruimte over " + b.weeks.length + " weken")
          )
        ),
        _be("div", { className: "bb-mini" },
          _be("div", { className: "bb-m" },
            _be("span", { className: "bb-m-lbl" }, "Budget"),
            _be("span", { className: "bb-m-val" }, fmtEuro(b.totalBudget, false))),
          _be("div", { className: "bb-m" },
            _be("span", { className: "bb-m-lbl" }, "Verwachte uitgave"),
            _be("span", { className: "bb-m-val" + (over ? " over-ink" : "") }, fmtEuro(b.totalForecast, false))),
          _be("div", { className: "bb-m" },
            _be("span", { className: "bb-m-lbl" }, "Weken over budget"),
            _be("span", { className: "bb-m-val" }, b.weeksOver + " / " + b.weeks.length))
        )
      ),
      _be("div", { className: "bb-chart" },
        _be("div", { className: "bb-chart-head" },
          _be("span", { className: "bc-legend" }, _be("i", { className: "bc-tick" }), "Budget"),
          _be("span", { className: "bc-legend" }, _be("i", { className: "bc-sw cost" }), "Binnen budget"),
          _be("span", { className: "bc-legend" }, _be("i", { className: "bc-sw over" }), "Overschrijding")
        ),
        _be(BudgetChart, { b, onHover })
      )
    ),
    _be("div", { className: "bb-months" },
      _be("div", { className: "bb-eyebrow" }, "Ruimte per maand"),
      _be(MonthChips, { months: b.months })
    )
  );
}

Object.assign(window, { BudgetSummary });
