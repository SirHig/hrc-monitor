import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const BASELINE_2025 = 850.19;
const ALERT_LEVEL = 1100;

const RANGES = [
  { label: 'Since Jan 2026', key: '2026' },
  { label: 'Since 2025', key: '2025' },
  { label: 'Max (2008+)', key: 'max' },
  { label: 'Custom', key: 'custom' },
];

function filterByRange(data, range, customStart, customEnd) {
  if (!data.length) return data;
  if (range === 'custom') {
    return data.filter(
      (d) =>
        (!customStart || d.date >= customStart) &&
        (!customEnd || d.date <= customEnd)
    );
  }
  if (range === '2026') return data.filter((d) => d.date >= '2026-01-01');
  if (range === '2025') return data.filter((d) => d.date >= '2025-01-01');
  return data;
}

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

function ChangeChip({ value, suffix = '%', decimals = 2 }) {
  const pos = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold px-1.5 py-0.5 rounded ${
        pos ? 'text-emerald-400' : 'text-red-400'
      }`}
    >
      {pos ? '▲' : '▼'} {pos ? '+' : ''}{fmt(value, decimals)}{suffix}
    </span>
  );
}

function KpiCard({ title, main, sub, children }) {
  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5 flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
      <p className="text-3xl font-bold text-white font-mono">{main}</p>
      {sub && <p className="text-sm text-slate-400">{sub}</p>}
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-lg p-3 text-sm shadow-xl">
      <p className="text-slate-400 mb-1">{fmtDate(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-mono font-semibold">
          {p.name}: {fmt(p.value)}
          {p.dataKey === 'index' ? '' : ' USD/T'}
        </p>
      ))}
    </div>
  );
}

function ChartSection({ title, dailyData, monthlyData, dataKey, lineColor, refLine, refLabel, yLabel, yDomain }) {
  const [range, setRange] = useState('2026');
  // slider indices into the active dataset
  const [sliderStart, setSliderStart] = useState(0);
  const [sliderEnd, setSliderEnd] = useState(0);

  // pick dataset: monthly only for 'max', daily otherwise
  const data = range === 'max' ? monthlyData : dailyData;

  // reset sliders when data or range changes
  useEffect(() => {
    setSliderStart(0);
    setSliderEnd(Math.max(0, data.length - 1));
  }, [range, data.length]);

  const filtered = useMemo(() => {
    if (!data.length) return data;
    if (range === '2026') return data.filter((d) => d.date >= '2026-01-01');
    if (range === '2025') return data.filter((d) => d.date >= '2025-01-01');
    if (range === 'custom') return data.slice(sliderStart, sliderEnd + 1);
    return data; // max
  }, [data, range, sliderStart, sliderEnd]);

  const tickCount = Math.min(filtered.length, 8);

  const xTickFormatter = (val) => {
    if (!val) return '';
    const d = new Date(val + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                range === r.key
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#2a2a32] text-slate-300 hover:bg-[#3a3a44]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {range === 'custom' && data.length > 1 && (
        <div className="mb-4 space-y-2 px-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{fmtDate(data[sliderStart]?.date)}</span>
            <span>{fmtDate(data[sliderEnd]?.date)}</span>
          </div>
          <div className="relative flex flex-col gap-2">
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={sliderStart}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v < sliderEnd) setSliderStart(v);
              }}
              className="w-full accent-amber-500 h-1 bg-transparent"
            />
            <input
              type="range"
              min={0}
              max={data.length - 1}
              value={sliderEnd}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (v > sliderStart) setSliderEnd(v);
              }}
              className="w-full accent-amber-500 h-1 bg-transparent"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">{filtered.length} data points</p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={filtered} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a32" />
          <XAxis
            dataKey="date"
            tickFormatter={xTickFormatter}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            interval={Math.max(0, Math.floor(filtered.length / 8) - 1)}
            stroke="#2a2a32"
          />
          <YAxis
            domain={yDomain || ['auto', 'auto']}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            stroke="#2a2a32"
            tickFormatter={(v) => fmt(v, 0)}
            label={
              yLabel
                ? { value: yLabel, angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11, offset: 10 }
                : undefined
            }
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          {refLine != null && (
            <ReferenceLine
              y={refLine}
              stroke="#ef4444"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: refLabel || `$${refLine}`, fill: '#ef4444', fontSize: 11, position: 'right' }}
            />
          )}
          <Line
            type="linear"
            dataKey={dataKey}
            stroke={lineColor}
            dot={false}
            strokeWidth={2}
            activeDot={{ r: 4, fill: lineColor }}
            name={dataKey === 'index' ? 'Index' : 'Close'}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Home() {
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/hrc-data')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(({ daily, monthly, fetchedAt: fa }) => {
        setDailyData(daily || []);
        setMonthlyData(monthly || []);
        setFetchedAt(fa);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const indexedData = useMemo(
    () =>
      dailyData.map((d) => ({
        ...d,
        index: d.close != null ? Math.round((d.close / BASELINE_2025) * 100 * 100) / 100 : null,
      })),
    [dailyData]
  );

  const kpi = useMemo(() => {
    if (!dailyData.length) return null;

    const last = dailyData[dailyData.length - 1];
    const prev = dailyData.length > 1 ? dailyData[dailyData.length - 2] : null;

    const dayChange = prev ? last.close - prev.close : 0;
    const dayChangePct = prev ? (dayChange / prev.close) * 100 : 0;

    const vsBaseline = ((last.close - BASELINE_2025) / BASELINE_2025) * 100;

    const ytd = dailyData.filter((d) => d.date >= '2026-01-01');
    const ytdFirst = ytd[0];
    const ytdChangePct = ytdFirst
      ? ((last.close - ytdFirst.close) / ytdFirst.close) * 100
      : null;
    const ytdHigh = ytd.length ? Math.max(...ytd.map((d) => d.close)) : null;
    const ytdLow = ytd.length ? Math.min(...ytd.map((d) => d.close)) : null;

    const aboveAlert = last.close >= ALERT_LEVEL;

    return {
      lastClose: last.close,
      lastDate: last.date,
      dayChange,
      dayChangePct,
      vsBaseline,
      ytdChangePct,
      ytdHigh,
      ytdLow,
      aboveAlert,
    };
  }, [dailyData]);

  const lastUpdatedStr = fetchedAt
    ? new Date(fetchedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <span className="text-amber-500">HRC</span> Steel Futures{' '}
              <span className="text-slate-400">·</span> Monitor
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              U.S. Midwest Domestic Hot-Rolled Coil Steel (CRU) Index Futures · CME front-month
              continuous (HRC=F)
            </p>
          </div>
          {lastUpdatedStr && (
            <p className="text-xs text-slate-500 mt-1">
              Last updated: <span className="text-slate-300">{lastUpdatedStr}</span>
            </p>
          )}
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Fetching HRC=F data…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-5">
            <p className="text-red-300 font-semibold">Failed to load data</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        {!loading && !error && kpi && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Last Close"
                main={`$${fmt(kpi.lastClose)}`}
                sub={fmtDate(kpi.lastDate)}
              >
                <ChangeChip value={kpi.dayChange} suffix=" USD" />
                <ChangeChip value={kpi.dayChangePct} />
              </KpiCard>

              <KpiCard
                title="VS 2025 Baseline"
                main={`${kpi.vsBaseline >= 0 ? '+' : ''}${fmt(kpi.vsBaseline)}%`}
                sub={`Baseline: $${fmt(BASELINE_2025)} avg`}
              >
                <ChangeChip value={kpi.vsBaseline} />
              </KpiCard>

              <KpiCard
                title="YTD 2026"
                main={
                  kpi.ytdChangePct != null
                    ? `${kpi.ytdChangePct >= 0 ? '+' : ''}${fmt(kpi.ytdChangePct)}%`
                    : '—'
                }
                sub={
                  kpi.ytdHigh != null
                    ? `H: $${fmt(kpi.ytdHigh, 0)}  ·  L: $${fmt(kpi.ytdLow, 0)}`
                    : 'No 2026 data yet'
                }
              />

              <KpiCard
                title={`Alert Level $${ALERT_LEVEL.toLocaleString()}`}
                main={`$${fmt(kpi.lastClose)}`}
                sub={`${Math.abs(kpi.lastClose - ALERT_LEVEL).toFixed(2)} USD ${
                  kpi.aboveAlert ? 'above' : 'below'
                } threshold`}
              >
                <span
                  className={`inline-block text-xs font-bold px-2 py-1 rounded uppercase tracking-widest ${
                    kpi.aboveAlert
                      ? 'bg-red-900 text-red-300 border border-red-700'
                      : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {kpi.aboveAlert ? `ABOVE ${ALERT_LEVEL}` : `BELOW ${ALERT_LEVEL}`}
                </span>
              </KpiCard>
            </div>

            {/* Chart 1: Settlement Price */}
            <ChartSection
              title="Settlement Price (USD/T)"
              dailyData={dailyData}
              monthlyData={monthlyData}
              dataKey="close"
              lineColor="#f59e0b"
              refLine={ALERT_LEVEL}
              refLabel="$1,100"
              yLabel="USD/T"
            />

            {/* Chart 2: Indexed vs 2025 Baseline */}
            <ChartSection
              title="Indexed vs 2025 Baseline (2025 avg = 100)"
              dailyData={indexedData}
              monthlyData={monthlyData.map((d) => ({
                ...d,
                index: d.close != null ? Math.round((d.close / BASELINE_2025) * 100 * 100) / 100 : null,
              }))}
              dataKey="index"
              lineColor="#3b82f6"
              refLine={100}
              refLabel="Base 100"
              yLabel="Index"
            />
          </>
        )}

        {/* Footer */}
        <footer className="border-t border-[#2a2a32] pt-4 pb-2 text-xs text-slate-500 flex flex-wrap justify-between gap-2">
          <span>Source: Yahoo Finance (HRC=F) · 2025 baseline: avg $850.19</span>
          <span>HRC Steel Futures Monitor</span>
        </footer>
      </div>
    </div>
  );
}
