/**
 * Salas O'Brien ESG Platform — Full Frontend
 * Tabbed interface: Upload → Inventory → Scope 1 → Scope 2 → Climate Risk → Reporting
 * Wired to FastAPI backend for real CSV processing.
 *
 * Replace src/App.jsx with this file.
 * Dependencies: npm install recharts lucide-react
 */

import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Upload, BarChart3, Fuel, Zap, Globe, Shield, FileText,
  Leaf, Gauge, CheckCircle2, AlertTriangle, AlertCircle,
  Building2, Target, TrendingUp, DollarSign, ThermometerSun,
  Calendar, Download, Eye, Database, Layers, Lock, RefreshCw,
  CircleDot, ClipboardCheck, Search, FileUp, ChevronRight, Table, Check,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ── Colors ──
const C = {
  bg: "#f8fafc", card: "#fff", bdr: "#e2e8f0", bdrL: "#f1f5f9",
  tx: "#0f172a", tx2: "#64748b", tx3: "#94a3b8",
  bl: "#2563eb", blL: "#eff6ff",
  or: "#ea580c", pu: "#7c3aed", puL: "#f5f3ff", puB: "#ddd6fe",
  gn: "#059669", gnL: "#ecfdf5", gnB: "#a7f3d0",
  rd: "#dc2626", rdL: "#fef2f2",
  am: "#d97706", amL: "#fffbeb", amB: "#fde68a",
  s1: "#ea580c", s2: "#2563eb", s3: "#7c3aed",
};
const PIE_C = [C.or, C.bl, C.pu, C.gn, C.am, "#ec4899"];

// ── Shared UI ──
const fF = n => typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n;

function Card({ children, style = {} }) {
  return <div style={{ background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.bdr}`, boxShadow: "0 1px 3px rgba(0,0,0,.04)", ...style }}>{children}</div>;
}
function SH({ title, sub, right }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}><div><h3 style={{ fontSize: 16, fontWeight: 700, color: C.tx, margin: 0 }}>{title}</h3>{sub && <p style={{ fontSize: 12, color: C.tx2, margin: "4px 0 0" }}>{sub}</p>}</div>{right}</div>;
}
function Badge({ children, color = C.gn }) {
  return <span style={{ padding: "2px 9px", borderRadius: 16, fontSize: 10, fontWeight: 600, background: color + "18", color, border: `1px solid ${color}25` }}>{children}</span>;
}
function Met({ label, value, unit, sub, color, icon: Ic }) {
  return <div style={{ flex: 1, minWidth: 150 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
      {Ic && <div style={{ padding: 5, borderRadius: 7, background: (color || C.bl) + "15" }}><Ic size={14} color={color || C.bl} /></div>}
      <span style={{ fontSize: 10, fontWeight: 600, color: C.tx2, textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: C.tx }}>{value}<span style={{ fontSize: 12, fontWeight: 400, color: C.tx2, marginLeft: 4 }}>{unit}</span></div>
    {sub && <div style={{ fontSize: 11, color: C.tx2, marginTop: 2 }}>{sub}</div>}
  </div>;
}
function TT({ payload, label }) {
  if (!payload?.length) return null;
  return <div style={{ background: "#fff", border: `1px solid ${C.bdr}`, borderRadius: 8, padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,.08)" }}>
    <div style={{ fontSize: 10, fontWeight: 600, color: C.tx2, marginBottom: 4 }}>{label}</div>
    {payload.map((p, i) => <div key={i} style={{ fontSize: 11, display: "flex", justifyContent: "space-between", gap: 14 }}>
      <span style={{ color: p.color || C.tx }}>{p.name || p.dataKey}</span>
      <span style={{ fontWeight: 600 }}>{fF(p.value)} tCO₂e</span>
    </div>)}
  </div>;
}

// ════════════════════════════════
//  TAB: DATA UPLOAD
// ════════════════════════════════
function UploadTab({ data, loading, error, onUpload }) {
  const PIPELINE = [
    { label: "Upload CSV", icon: FileUp, desc: "Structured input" },
    { label: "Schema Check", icon: ClipboardCheck, desc: "Fields, types, enums" },
    { label: "Validation", icon: Search, desc: "Range & logic checks" },
    { label: "Factor Lookup", icon: Database, desc: "eGRID, EPA, GWP" },
    { label: "Calculate", icon: RefreshCw, desc: "GHG Protocol formulas" },
    { label: "Audit Trail", icon: Lock, desc: "Source-tagged output" },
  ];

  const CALC = [
    { scope: "Scope 1 — Natural Gas", formula: "therms × 0.00531 tCO₂e/therm", source: "EPA EF Hub (Table C-1)", color: C.s1 },
    { scope: "Scope 1 — Vehicles", formula: "miles ÷ MPG × 0.008887 tCO₂/gal", source: "EPA EF Hub (Table 2)", color: C.s1 },
    { scope: "Scope 1 — Refrigerants", formula: "lbs × GWP ÷ 2,204.6", source: "IPCC AR5 GWP values", color: C.s1 },
    { scope: "Scope 2 — Electricity", formula: "kWh × eGRID factor ÷ 1,000", source: "EPA eGRID2022", color: C.s2 },
  ];

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    {/* Pipeline */}
    <Card>
      <SH title="Data Ingestion Pipeline" sub="Every value is validated, sourced, and auditable" />
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {PIPELINE.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
            <div style={{ flex: 1, padding: "12px 8px", borderRadius: 10, textAlign: "center", border: `1.5px solid ${data ? C.gn : i === 0 ? C.bl : C.bdr}`, background: data ? C.gnL : i === 0 ? C.blL : C.card }}>
              <s.icon size={16} color={data ? C.gn : i === 0 ? C.bl : C.tx3} style={{ margin: "0 auto" }} />
              <div style={{ fontSize: 10, fontWeight: 600, color: data ? C.gn : i === 0 ? C.bl : C.tx2, marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: C.tx3, marginTop: 1 }}>{s.desc}</div>
            </div>
            {i < PIPELINE.length - 1 && <ChevronRight size={12} color={C.tx3} />}
          </div>
        ))}
      </div>
    </Card>

    {/* Upload Zone */}
    <Card>
      <SH title="Upload Location Data" sub="CSV with location-level GHG data per the schema below" />
      <div style={{ border: `2px dashed ${data ? C.gn : C.bdr}`, borderRadius: 12, padding: 40, textAlign: "center", background: data ? C.gnL : "#fafafa" }}>
        {loading ? <div style={{ fontSize: 14, color: C.tx2 }}>Processing...</div>
          : data ? <div><div style={{ fontSize: 16, fontWeight: 600, color: C.gn }}>✓ Processed successfully</div><div style={{ fontSize: 13, color: C.tx2, marginTop: 4 }}>{data.locations_processed} locations · {data.validation.errors} errors · {data.validation.warnings} warnings</div></div>
            : <div><div style={{ fontSize: 16, fontWeight: 600, color: C.tx2 }}>Drop CSV here or click to browse</div><div style={{ fontSize: 12, color: C.tx3, marginTop: 4 }}>Accepts .csv with the schema defined below</div></div>}
        <label style={{ marginTop: 16, display: "inline-block", padding: "10px 28px", background: C.bl, color: "#fff", borderRadius: 8, fontWeight: 500, fontSize: 13, cursor: "pointer" }}>
          {data ? "Upload New File" : "Browse Files"}
          <input type="file" accept=".csv" onChange={onUpload} style={{ display: "none" }} />
        </label>
      </div>
      {error && <div style={{ marginTop: 12, padding: 12, background: C.rdL, borderRadius: 8, color: C.rd, fontSize: 12 }}>{error}</div>}
    </Card>

    {/* Validation results */}
    {data?.validation?.issues?.length > 0 && <Card>
      <SH title="Validation Results" sub={`${data.validation.errors} errors, ${data.validation.warnings} warnings`} />
      <div style={{ overflowX: "auto", maxHeight: 300, border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead style={{ position: "sticky", top: 0, background: C.card }}><tr>
            {["Location", "Field", "Rule", "Severity", "Detail"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}` }}>{h}</th>)}
          </tr></thead>
          <tbody>{data.validation.issues.map((iss, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}`, background: iss.severity === "error" ? C.rdL : "transparent" }}>
            <td style={{ padding: "7px 10px", fontWeight: 600 }}>{iss.location}</td>
            <td style={{ padding: "7px 10px", fontFamily: "monospace", fontSize: 10, color: C.bl }}>{iss.field}</td>
            <td style={{ padding: "7px 10px" }}>{iss.rule}</td>
            <td style={{ padding: "7px 10px" }}><Badge color={iss.severity === "error" ? C.rd : C.am}>{iss.severity}</Badge></td>
            <td style={{ padding: "7px 10px", color: C.tx2 }}>{iss.detail}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>}

    {/* Methodology */}
    <Card>
      <SH title="Calculation Methodology" sub="Every output traceable to published EPA factors" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CALC.map((c, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", gap: 12, alignItems: "center", padding: "12px 14px", borderRadius: 8, border: `1px solid ${c.color}25`, background: c.color + "06" }}>
          <div style={{ fontWeight: 700, color: c.color, fontSize: 13 }}>{c.scope}</div>
          <div><div style={{ fontSize: 10, color: C.tx3 }}>FORMULA</div><div style={{ fontSize: 11, fontFamily: "monospace" }}>{c.formula}</div></div>
          <div><div style={{ fontSize: 10, color: C.tx3 }}>SOURCE</div><div style={{ fontSize: 11, color: C.tx2 }}>{c.source}</div></div>
        </div>)}
      </div>
    </Card>

    {/* Audit trail */}
    <Card>
      <SH title="Audit Trail & Source Tagging" sub="Every data point versioned, sourced, and attributable" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {[{ title: "Source Classification", icon: CircleDot, items: ["Measured — utility bill, meter, invoice", "Estimated — modeled from proxy", "Missing — gap flagged for resolution"] },
        { title: "Version Control", icon: RefreshCw, items: ["Full upload history with timestamps", "Diff view between uploads", "Rollback to any prior version"] },
        { title: "Audit Export", icon: Lock, items: ["Complete data lineage per value", "Input → factor → output chain", "ISO 14064 verification ready"] }
        ].map((a, i) => <div key={i} style={{ padding: 18, borderRadius: 10, border: `1px solid ${C.bdr}` }}>
          <a.icon size={20} color={C.bl} />
          <div style={{ fontSize: 14, fontWeight: 700, color: C.tx, marginTop: 8 }}>{a.title}</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {a.items.map((item, j) => <div key={j} style={{ fontSize: 11, color: C.tx2, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: 3, background: C.bl, marginTop: 5, flexShrink: 0 }} />{item}
            </div>)}
          </div>
        </div>)}
      </div>
    </Card>
  </div>;
}

// ════════════════════════════════
//  TAB: GHG INVENTORY (Overview)
// ════════════════════════════════
function InventoryTab({ data }) {
  const s = data.summary;
  const scopePie = [{ name: "Scope 1", value: s.total_scope1, color: C.s1 }, { name: "Scope 2", value: s.total_scope2, color: C.s2 }, { name: "Scope 3", value: s.total_scope3, color: C.s3 }];
  const dq = data.data_quality;

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <Card style={{ flex: 1, minWidth: 140 }}><Met label="Total Emissions" value={fF(s.total_emissions)} unit="tCO₂e" icon={Leaf} color={C.gn} /></Card>
      <Card style={{ flex: 1, minWidth: 140 }}><Met label="Scope 1" value={fF(s.total_scope1)} unit="tCO₂e" icon={Fuel} color={C.s1} /></Card>
      <Card style={{ flex: 1, minWidth: 140 }}><Met label="Scope 2" value={fF(s.total_scope2)} unit="tCO₂e" icon={Zap} color={C.s2} /></Card>
      <Card style={{ flex: 1, minWidth: 140 }}><Met label="Scope 3" value={fF(s.total_scope3)} unit="tCO₂e" icon={Globe} color={C.s3} /></Card>
      <Card style={{ flex: 1, minWidth: 140 }}><Met label="Data Quality" value={dq.score} unit="/100" icon={Gauge} color={dq.score >= 70 ? C.gn : C.am} /></Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SH title="Scope Split" sub="Scope 1 vs Scope 2 (tCO₂e)" />
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={scopePie} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value">
            {scopePie.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Tooltip content={<TT />} /></PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
          {scopePie.map((sp, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: sp.color }} />
            <span style={{ color: C.tx2 }}>{sp.name}</span>
            <span style={{ fontWeight: 700 }}>{((sp.value / s.total_emissions) * 100).toFixed(0)}%</span>
          </div>)}
        </div>
      </Card>
      <Card>
        <SH title="Regional Emissions" sub="Scope 1 + 2 by region" />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data.regional} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={C.bdrL} />
            <XAxis type="number" tick={{ fontSize: 10, fill: C.tx2 }} />
            <YAxis type="category" dataKey="region" tick={{ fontSize: 11, fill: C.tx2 }} width={80} />
            <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="s1" name="Scope 1" fill={C.s1} stackId="a" />
            <Bar dataKey="s2" name="Scope 2" fill={C.s2} stackId="a" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>

    {/* Data Quality */}
    <Card>
      <SH title="Data Quality" sub="Source classification across uploaded locations" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
        <div style={{ textAlign: "center", padding: 16, borderRadius: 10, background: C.bdrL }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: dq.score >= 70 ? C.gn : C.am }}>{dq.score}</div>
          <div style={{ fontSize: 11, color: C.tx2 }}>Composite Score</div>
        </div>
        {[{ l: "Measured", ct: dq.counts.measured || 0, c: C.gn }, { l: "Estimated", ct: dq.counts.estimated || 0, c: C.am }, { l: "Partial / Gap", ct: dq.counts.partial || 0, c: C.rd }].map((d, i) =>
          <div key={i} style={{ textAlign: "center", padding: 16, borderRadius: 10, background: d.c + "10", border: `1px solid ${d.c}20` }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: d.c }}>{d.ct}</div>
            <div style={{ fontSize: 11, color: C.tx2 }}>{d.l}</div>
          </div>
        )}
      </div>
    </Card>

    {/* Location Table */}
    <Card>
      <SH title="All Locations" sub="Per-location emissions detail" />
      <div style={{ overflowX: "auto", border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr>{["Location", "Region", "State", "Sq Ft", "S1 Total", "S2 Total", "Total", "Quality"].map(h =>
            <th key={h} style={{ padding: "8px 8px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
          )}</tr></thead>
          <tbody>{data.locations.map((loc, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}`, background: i % 2 ? C.bdrL : "transparent" }}>
            <td style={{ padding: "7px 8px", fontWeight: 600 }}>{loc.location_name}</td>
            <td style={{ padding: "7px 8px" }}>{loc.region}</td>
            <td style={{ padding: "7px 8px" }}>{loc.state}</td>
            <td style={{ padding: "7px 8px" }}>{loc.sqft.toLocaleString()}</td>
            <td style={{ padding: "7px 8px", color: C.s1, fontWeight: 600 }}>{loc.s1_total.toFixed(2)}</td>
            <td style={{ padding: "7px 8px", color: C.s2, fontWeight: 600 }}>{loc.s2_electricity.toFixed(2)}</td>
            <td style={{ padding: "7px 8px", fontWeight: 700 }}>{loc.total_s1_s2.toFixed(2)}</td>
            <td style={{ padding: "7px 8px" }}><Badge color={loc.data_quality === "measured" ? C.gn : loc.data_quality === "estimated" ? C.am : C.rd}>{loc.data_quality}</Badge></td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>
  </div>;
}

// ════════════════════════════════
//  TAB: SCOPE 1 DETAIL
// ════════════════════════════════
function Scope1Tab({ data }) {
  const b = data.summary.s1_breakdown;
  const s1Pie = [{ name: "Natural Gas", value: b.natural_gas }, { name: "Vehicles", value: b.vehicles }, { name: "Refrigerants", value: b.refrigerants }].filter(d => d.value > 0);
  const vehicleLocs = data.locations.filter(l => l.s1_vehicles > 0);

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <Card style={{ flex: 1 }}><Met label="Total Scope 1" value={fF(data.summary.total_scope1)} unit="tCO₂e" icon={Fuel} color={C.s1} /></Card>
      <Card style={{ flex: 1 }}><Met label="Natural Gas" value={fF(b.natural_gas)} unit="tCO₂e" /></Card>
      <Card style={{ flex: 1 }}><Met label="Vehicle Fleet" value={fF(b.vehicles)} unit="tCO₂e" /></Card>
      <Card style={{ flex: 1 }}><Met label="Refrigerants" value={fF(b.refrigerants)} unit="tCO₂e" /></Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <Card>
        <SH title="Scope 1 Breakdown" sub="By emission source" />
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={s1Pie} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
            {s1Pie.map((_, i) => <Cell key={i} fill={PIE_C[i]} />)}</Pie><Tooltip content={<TT />} /></PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 4 }}>
          {s1Pie.map((sp, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
            <div style={{ width: 9, height: 9, borderRadius: 3, background: PIE_C[i] }} /><span style={{ color: C.tx2 }}>{sp.name}</span><span style={{ fontWeight: 700 }}>{fF(sp.value)}</span>
          </div>)}
        </div>
      </Card>
      <Card>
        <SH title="Vehicle Fleet Locations" sub={`${vehicleLocs.length} locations with fleet emissions`} />
        <div style={{ overflowY: "auto", maxHeight: 260 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead><tr>{["Location", "State", "Vehicles tCO₂e", "Quality"].map(h =>
              <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}` }}>{h}</th>
            )}</tr></thead>
            <tbody>{vehicleLocs.sort((a, b) => b.s1_vehicles - a.s1_vehicles).map((loc, i) =>
              <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}` }}>
                <td style={{ padding: "6px 8px", fontWeight: 600 }}>{loc.location_name}</td>
                <td style={{ padding: "6px 8px" }}>{loc.state}</td>
                <td style={{ padding: "6px 8px", fontWeight: 600, color: C.s1 }}>{loc.s1_vehicles.toFixed(2)}</td>
                <td style={{ padding: "6px 8px" }}><Badge color={loc.data_quality === "measured" ? C.gn : C.am}>{loc.data_quality}</Badge></td>
              </tr>
            )}</tbody>
          </table>
        </div>
      </Card>
    </div>

    {/* Per-location Scope 1 bar chart */}
    <Card>
      <SH title="Scope 1 by Location" sub="Natural gas + vehicles + refrigerants" />
      <ResponsiveContainer width="100%" height={Math.max(200, data.locations.filter(l => l.s1_total > 0).length * 36 + 40)}>
        <BarChart data={data.locations.filter(l => l.s1_total > 0).sort((a, b) => b.s1_total - a.s1_total)} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.bdrL} horizontal={true} vertical={true} />
          <XAxis type="number" tick={{ fontSize: 10, fill: C.tx2 }} tickFormatter={v => v.toFixed(0)} label={{ value: "tCO₂e", position: "insideBottomRight", offset: -5, fontSize: 11, fill: C.tx3 }} />
          <YAxis type="category" dataKey="location_name" tick={{ fontSize: 10, fill: C.tx, fontWeight: 500 }} width={140} interval={0} />
          <Tooltip content={<TT />} /><Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="s1_natural_gas" name="Natural Gas" fill={C.or} stackId="a" barSize={20} />
          <Bar dataKey="s1_vehicles" name="Vehicles" fill={C.bl} stackId="a" />
          <Bar dataKey="s1_refrigerants" name="Refrigerants" fill={C.pu} stackId="a" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  </div>;
}

// ════════════════════════════════
//  TAB: SCOPE 2 DETAIL
// ════════════════════════════════
function Scope2Tab({ data }) {
  // Aggregate by state
  const byState = {};
  data.locations.forEach(l => {
    if (!byState[l.state]) byState[l.state] = { state: l.state, kwh: 0, co2: 0, factor: l.egrid_factor, count: 0 };
    byState[l.state].kwh += l.electricity_kwh;
    byState[l.state].co2 += l.s2_electricity;
    byState[l.state].count++;
  });
  const stateData = Object.values(byState).sort((a, b) => b.co2 - a.co2);

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <Card style={{ flex: 1 }}><Met label="Total Scope 2" value={fF(data.summary.total_scope2)} unit="tCO₂e" icon={Zap} color={C.s2} /></Card>
      <Card style={{ flex: 1 }}><Met label="Total Electricity" value={fF(data.locations.reduce((a, l) => a + l.electricity_kwh, 0))} unit="kWh" /></Card>
      <Card style={{ flex: 1 }}><Met label="States Covered" value={stateData.length} unit="states" /></Card>
    </div>

    <Card>
      <SH title="Emissions by eGRID Subregion" sub="kWh × eGRID factor = tCO₂e (location-based method)" />
      <div style={{ overflowX: "auto", border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr>{["State", "eGRID Factor (kg/kWh)", "Locations", "Total kWh", "Emissions (tCO₂e)"].map(h =>
            <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}` }}>{h}</th>
          )}</tr></thead>
          <tbody>{stateData.map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}` }}>
            <td style={{ padding: "8px 10px", fontWeight: 600 }}>{r.state}</td>
            <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 10 }}>{r.factor.toFixed(4)}</td>
            <td style={{ padding: "8px 10px" }}>{r.count}</td>
            <td style={{ padding: "8px 10px" }}>{r.kwh.toLocaleString()}</td>
            <td style={{ padding: "8px 10px", fontWeight: 700, color: C.s2 }}>{r.co2.toFixed(2)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </Card>

    <Card>
      <SH title="How Scope 2 Works" sub="Location-based calculation method" />
      <div style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
        {["Electricity (kWh)", "×", "eGRID Factor (kg/kWh)", "÷ 1,000", "=", "tCO₂e"].map((s, i) => (
          <div key={i} style={i === 1 || i === 3 || i === 4 ? { fontSize: 20, color: C.tx3, fontWeight: 300 }
            : { background: C.blL, border: `1px solid ${C.bl}30`, borderRadius: 8, padding: "10px 16px", fontWeight: 600, color: C.bl, fontSize: 13 }}>{s}</div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: C.tx3, textAlign: "center" }}>Source: EPA eGRID2022. Updated annually. Market-based method (RECs) not yet tracked.</div>
    </Card>

    {/* Bar chart by state */}
    <Card>
      <SH title="Scope 2 by State" sub="All states ranked by emissions" />
      <ResponsiveContainer width="100%" height={stateData.length * 40 + 40}>
        <BarChart data={stateData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.bdrL} horizontal={true} vertical={true} />
          <XAxis type="number" tick={{ fontSize: 11, fill: C.tx2 }} tickFormatter={v => v.toFixed(0)} label={{ value: "tCO₂e", position: "insideBottomRight", offset: -5, fontSize: 11, fill: C.tx3 }} />
          <YAxis type="category" dataKey="state" tick={{ fontSize: 12, fill: C.tx, fontWeight: 600 }} width={40} interval={0} />
          <Tooltip content={<TT />} />
          <Bar dataKey="co2" name="Scope 2 Emissions" fill={C.s2} radius={[0, 4, 4, 0]} barSize={22} label={{ position: "right", fontSize: 10, fill: C.tx2, formatter: v => v.toFixed(1) }} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  </div>;
}

// ════════════════════════════════
//  TAB: CLIMATE RISK (Static)
// ════════════════════════════════
function RiskTab() {
  const PHYS = [
    { risk: "Extreme Heat", exp: "High", reg: "South, West, India", fin: "HVAC costs, productivity", hz: "Near-term", c: C.rd },
    { risk: "Hurricane / Cyclone", exp: "High", reg: "South (Gulf, Atlantic)", fin: "Business interruption", hz: "Near-term", c: C.rd },
    { risk: "Flooding", exp: "Medium", reg: "South, NE coastal", fin: "Office damage, relocation", hz: "Medium-term", c: C.am },
    { risk: "Wildfire / Air Quality", exp: "Medium", reg: "West (CA, OR, CO)", fin: "Evacuation, continuity", hz: "Near-term", c: C.am },
    { risk: "Sea Level Rise", exp: "Low–Med", reg: "FL, NY, LA coastal", fin: "Lease risk", hz: "Long-term", c: C.am },
  ];
  const TRANS = [
    { risk: "CA SB 253", type: "Regulatory", imp: "High", desc: "Mandatory Scope 1-3 disclosure", time: "2026–2027" },
    { risk: "CA SB 261", type: "Regulatory", imp: "High", desc: "Biennial TCFD climate risk report", time: "2026" },
    { risk: "Client ESG Requirements", type: "Market", imp: "High", desc: "RFPs requiring GHG data", time: "Ongoing" },
    { risk: "M&A Due Diligence", type: "Market", imp: "High", desc: "ESG affects deal multiples", time: "Immediate" },
    { risk: "Building Perf. Standards", type: "Regulatory", imp: "Medium", desc: "Tenant pass-through costs", time: "Varies" },
  ];
  const RADAR = [{ s: "Regulatory", A: 85 }, { s: "Physical", A: 62 }, { s: "Transition", A: 45 }, { s: "Data Maturity", A: 68 }, { s: "Market Position", A: 70 }];

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }}>
      <Card>
        <SH title="Risk Radar" sub="Composite profile" />
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={RADAR} cx="50%" cy="50%" outerRadius={90}>
            <PolarGrid stroke={C.bdrL} /><PolarAngleAxis dataKey="s" tick={{ fontSize: 9, fill: C.tx2 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
            <Radar dataKey="A" stroke={C.bl} fill={C.bl} fillOpacity={.12} strokeWidth={2} /><Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <SH title="Executive Risk Summary" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[{ ic: FileText, l: "Regulatory", d: "SB 253 & 261 require full disclosure. SO operates in CA.", lv: "HIGH", c: C.rd },
          { ic: DollarSign, l: "M&A / Valuation", d: "ESG maturity directly affects deal multiples.", lv: "HIGH", c: C.rd },
          { ic: ThermometerSun, l: "Physical — Acute", d: "Offices in extreme heat and hurricane zones.", lv: "MED-HIGH", c: C.am },
          { ic: Building2, l: "Tenant Exposure", d: "Lessee across 100 locations — limited control.", lv: "MEDIUM", c: C.am },
          ].map((ri, i) => <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, borderRadius: 8, background: ri.c + "08", border: `1px solid ${ri.c}18` }}>
            <div style={{ padding: 4, borderRadius: 6, background: ri.c + "15", flexShrink: 0 }}><ri.ic size={14} color={ri.c} /></div>
            <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 12, fontWeight: 700 }}>{ri.l}</span><Badge color={ri.c}>{ri.lv}</Badge></div>
              <div style={{ fontSize: 11, color: C.tx2, marginTop: 2 }}>{ri.d}</div></div>
          </div>)}
        </div>
      </Card>
    </div>

    <Card>
      <SH title="Physical Risk Register" sub="TCFD-aligned" />
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead><tr>{["Risk", "Exposure", "Regions", "Financial Impact", "Horizon"].map(h =>
          <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}` }}>{h}</th>
        )}</tr></thead>
        <tbody>{PHYS.map((p, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}` }}>
          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{p.risk}</td>
          <td style={{ padding: "8px 10px" }}><Badge color={p.c}>{p.exp}</Badge></td>
          <td style={{ padding: "8px 10px", color: C.tx2 }}>{p.reg}</td>
          <td style={{ padding: "8px 10px", color: C.tx2 }}>{p.fin}</td>
          <td style={{ padding: "8px 10px" }}><Badge color={p.hz === "Near-term" ? C.rd : p.hz === "Medium-term" ? C.am : C.bl}>{p.hz}</Badge></td>
        </tr>)}</tbody>
      </table>
    </Card>

    <Card>
      <SH title="Transition Risk Register" />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {TRANS.map((t, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "180px 90px 60px 1fr 90px", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 7, background: i % 2 ? C.bdrL : "transparent", fontSize: 11 }}>
          <span style={{ fontWeight: 600 }}>{t.risk}</span>
          <Badge color={t.type === "Regulatory" ? C.bl : C.am}>{t.type}</Badge>
          <Badge color={t.imp === "High" ? C.rd : C.am}>{t.imp}</Badge>
          <span style={{ color: C.tx2 }}>{t.desc}</span>
          <span style={{ fontSize: 10, color: C.tx3 }}>{t.time}</span>
        </div>)}
      </div>
    </Card>
  </div>;
}

// ════════════════════════════════
//  TAB: REPORTING
// ════════════════════════════════
function ReportingTab() {
  const FW = [
    { n: "GHG Protocol", st: "Core", d: "Foundation methodology", req: true, rd: 95 },
    { n: "CA SB 253", st: "Ready", d: "Scope 1-3 disclosure", req: true, rd: 75 },
    { n: "CA SB 261", st: "Ready", d: "TCFD climate risk report", req: true, rd: 70 },
    { n: "CDP", st: "Ready", d: "Annual disclosure questionnaire", req: false, rd: 65 },
    { n: "SBTi", st: "In Progress", d: "1.5°C target validation", req: false, rd: 55 },
    { n: "TCFD / ISSB", st: "Planned", d: "Climate financial disclosures", req: false, rd: 45 },
  ];
  const REPORTS = [
    { t: "Annual GHG Inventory", d: "Complete Scope 1, 2, 3", ic: BarChart3, rdy: true },
    { t: "SB 253 Filing", d: "CA emissions disclosure", ic: FileText, rdy: true },
    { t: "SB 261 Risk Report", d: "TCFD-aligned risk report", ic: Shield, rdy: true },
    { t: "CDP Questionnaire", d: "Pre-populated responses", ic: Globe, rdy: true },
    { t: "SBTi Progress", d: "Target tracking report", ic: Target, rdy: true },
    { t: "Board Summary", d: "Executive ESG dashboard", ic: Eye, rdy: true },
    { t: "M&A Data Room", d: "ESG due diligence package", ic: Database, rdy: true },
    { t: "Client Report", d: "White-labeled for SaaS", ic: Layers, rdy: false },
  ];

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <Card>
      <SH title="Framework Readiness" sub="Compliance status" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {FW.map((f, i) => <div key={i} style={{ display: "grid", gridTemplateColumns: "120px 90px 1fr 180px", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.bdr}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{f.n}</span>
            {f.req && <span style={{ fontSize: 8, fontWeight: 700, color: C.rd, background: C.rdL, padding: "1px 5px", borderRadius: 3 }}>REQ</span>}
          </div>
          <Badge color={f.st === "Core" ? C.gn : f.st === "Ready" ? C.bl : f.st === "In Progress" ? C.am : C.tx3}>{f.st}</Badge>
          <span style={{ fontSize: 11, color: C.tx2 }}>{f.d}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, background: C.bdrL, borderRadius: 5, height: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 5, background: f.rd >= 70 ? C.gn : f.rd >= 50 ? C.am : C.rd, width: `${f.rd}%` }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.tx2, width: 28, textAlign: "right" }}>{f.rd}%</span>
          </div>
        </div>)}
      </div>
    </Card>

    <Card>
      <SH title="Report Generation" sub="One-click from validated data" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
        {REPORTS.map((rp, i) => <div key={i} style={{ padding: 16, borderRadius: 10, textAlign: "center", border: `1px solid ${rp.rdy ? C.bdr : C.bdrL}`, background: rp.rdy ? C.card : C.bdrL }}>
          <rp.ic size={22} color={rp.rdy ? C.bl : C.tx3} style={{ margin: "0 auto" }} />
          <div style={{ fontSize: 12, fontWeight: 600, color: rp.rdy ? C.tx : C.tx3, marginTop: 8 }}>{rp.t}</div>
          <div style={{ fontSize: 10, color: C.tx2, marginTop: 4 }}>{rp.d}</div>
          <button style={{ marginTop: 10, padding: "6px 16px", borderRadius: 6, border: "none", background: rp.rdy ? C.bl : C.bdr, color: rp.rdy ? "#fff" : C.tx3, fontSize: 11, fontWeight: 600, cursor: rp.rdy ? "pointer" : "default", opacity: rp.rdy ? 1 : .5, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {rp.rdy ? <><Download size={12} />Generate</> : "Coming Soon"}
          </button>
        </div>)}
      </div>
    </Card>
  </div>;
}

// ════════════════════════════════
//  MAIN APP WITH TABS
// ════════════════════════════════
// ════════════════════════════════
//  TAB: SCOPE 3 DETAIL
// ════════════════════════════════
function Scope3Tab({ data }) {
  const b = data.summary.s3_breakdown;
  const s3Pie = [
    { name: "Purchased Goods & Services", value: b.purchased_goods },
    { name: "Capital Goods", value: b.capital_goods },
    { name: "Business Travel", value: b.business_travel },
    { name: "Employee Commuting", value: b.commuting },
    { name: "Waste", value: b.waste },
  ].filter(d => d.value > 0);

  const S3_CATS = [
    { id: 1, n: "Purchased Goods & Services", val: b.purchased_goods, method: "Spend × EEIO (0.00034 tCO₂e/$)", q: "estimated", on: true },
    { id: 2, n: "Capital Goods", val: b.capital_goods, method: "Spend × EEIO (0.00042 tCO₂e/$)", q: "estimated", on: true },
    { id: 3, n: "Fuel & Energy Activities (WTT)", val: 0, method: "Derived from S1 & S2", q: "n/a", on: false, note: "Phase 2" },
    { id: 4, n: "Upstream Transportation", val: 0, method: "Spend-based", q: "n/a", on: false, note: "Phase 2" },
    { id: 5, n: "Waste in Operations", val: b.waste, method: "Tons × 0.459 tCO₂e/ton (EPA WARM)", q: "measured", on: true },
    { id: 6, n: "Business Travel", val: b.business_travel, method: "Spend × 0.00025 tCO₂e/$", q: "measured", on: true },
    { id: 7, n: "Employee Commuting", val: b.commuting, method: "Miles × 0.000404 tCO₂e/mi", q: "estimated", on: true },
    { id: 8, n: "Upstream Leased Assets", val: 0, method: "N/A (SO is lessee)", q: "n/a", on: false, note: "Under S1 & S2" },
    { id: 9, n: "Downstream Transport", val: 0, method: "Not material", q: "n/a", on: false, note: "No physical products" },
    { id: 10, n: "Processing of Sold Products", val: 0, method: "Not material", q: "n/a", on: false, note: "Service company" },
    { id: 11, n: "Use of Sold Products", val: 0, method: "Not material", q: "n/a", on: false, note: "Service company" },
    { id: 12, n: "End-of-Life Treatment", val: 0, method: "Not material", q: "n/a", on: false, note: "Service company" },
    { id: 13, n: "Downstream Leased Assets", val: 0, method: "N/A", q: "n/a", on: false, note: "N/A" },
    { id: 14, n: "Franchises", val: 0, method: "N/A", q: "n/a", on: false, note: "N/A" },
    { id: 15, n: "Investments", val: 0, method: "Not yet tracked", q: "n/a", on: false, note: "Phase 2" },
  ];

  const activeCats = S3_CATS.filter(c => c.on && c.val > 0);

  return <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <Card style={{ flex: 1 }}><Met label="Total Scope 3" value={fF(data.summary.total_scope3)} unit="tCO₂e" icon={Globe} color={C.s3} /></Card>
      <Card style={{ flex: 1 }}><Met label="Purchased Goods" value={fF(b.purchased_goods)} unit="tCO₂e" /></Card>
      <Card style={{ flex: 1 }}><Met label="Business Travel" value={fF(b.business_travel)} unit="tCO₂e" /></Card>
      <Card style={{ flex: 1 }}><Met label="Employee Commuting" value={fF(b.commuting)} unit="tCO₂e" /></Card>
      <Card style={{ flex: 1 }}><Met label="Categories Tracked" value={`${activeCats.length}/15`} unit="" /></Card>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
      <Card>
        <SH title="Scope 3 Breakdown" sub="By GHG Protocol category" />
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={s3Pie} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={C.bdrL} />
            <XAxis type="number" tick={{ fontSize: 10, fill: C.tx2 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.tx2 }} width={180} />
            <Tooltip content={<TT />} />
            <Bar dataKey="value" fill={C.s3} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card>
        <SH title="Category Pie" sub="Relative share of Scope 3" />
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={s3Pie} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={4} dataKey="value">
            {s3Pie.map((_, i) => <Cell key={i} fill={PIE_C[i]} />)}</Pie><Tooltip content={<TT />} /></PieChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 4 }}>
          {s3Pie.map((sp, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 3, background: PIE_C[i] }} /><span style={{ color: C.tx2 }}>{sp.name.split(" ").slice(0, 2).join(" ")}</span>
          </div>)}
        </div>
      </Card>
    </div>

    {/* Full 15 category assessment */}
    <Card>
      <SH title="All 15 GHG Protocol Categories" sub="Materiality assessment for consulting firm" />
      <div style={{ overflowX: "auto", border: `1px solid ${C.bdr}`, borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["", "Category", "Methodology", "Data Quality", "Emissions (tCO₂e)"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.tx2, borderBottom: `2px solid ${C.bdr}`, whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {S3_CATS.map((c, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.bdrL}`, background: c.on ? (i % 2 === 0 ? C.puL : "#faf8ff") : C.bdrL }}>
                <td style={{ padding: "10px 12px", width: 20 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: c.on ? C.pu : "#d1d5db" }} />
                </td>
                <td style={{ padding: "10px 12px", fontWeight: c.on ? 600 : 400, color: c.on ? C.tx : C.tx3 }}>
                  Cat {c.id}. {c.n}
                </td>
                <td style={{ padding: "10px 12px", color: C.tx2, fontSize: 10, fontFamily: "monospace" }}>
                  {c.method}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  {c.on ? <Badge color={c.q === "measured" ? C.gn : C.am}>{c.q}</Badge> : <span style={{ color: C.tx3, fontSize: 10 }}>{c.note}</span>}
                </td>
                <td style={{ padding: "10px 12px", fontWeight: c.on ? 700 : 400, color: c.on ? C.pu : C.tx3, textAlign: "right", fontFamily: "monospace" }}>
                  {c.on ? fF(c.val) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 12, padding: 10, background: C.amL, borderRadius: 8, border: `1px solid ${C.amB}`, fontSize: 11, color: C.am }}>
        <strong>SBTi Requirement:</strong> All material Scope 3 categories must be included in baseline. Financial system API integration planned for Phase 2 to improve Cat 1, 2, and 4 accuracy.
      </div>
    </Card>

    {/* Methodology */}
    <Card style={{ background: C.puL, border: `1px solid ${C.pu}22` }}>
      <SH title="Scope 3 Methodology" sub="Spend-based and activity-based approaches per GHG Protocol" />
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 700, margin: "0 auto" }}>
        {[
          { cat: "Cat 1", name: "Purchased Goods & Services", formula: "spend ($) × 0.00034 tCO₂e/$", source: "EPA USEEIO v2.0" },
          { cat: "Cat 2", name: "Capital Goods", formula: "spend ($) × 0.00042 tCO₂e/$", source: "EPA USEEIO v2.0" },
          { cat: "Cat 5", name: "Waste in Operations", formula: "tons × 0.459 tCO₂e/ton", source: "EPA WARM model" },
          { cat: "Cat 6", name: "Business Travel", formula: "spend ($) × 0.00025 tCO₂e/$", source: "Blended air/hotel/ground" },
          { cat: "Cat 7", name: "Employee Commuting", formula: "miles × 0.000404 tCO₂e/mi", source: "EPA avg passenger vehicle" },
        ].map((m, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "10px 14px", borderRadius: 8, background: "#fff", border: `1px solid ${C.pu}15`, textAlign: "center" }}>
            <span style={{ fontWeight: 700, color: C.pu, fontSize: 12 }}>{m.cat}</span>
            <span style={{ fontWeight: 600, color: C.tx, fontSize: 12 }}>{m.name}</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: C.tx2 }}>{m.formula}</span>
            <span style={{ fontSize: 11, color: C.tx3 }}>{m.source}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>;
}

const TABS = [
  { id: "upload", label: "Data Input", icon: Upload },
  { id: "inventory", label: "GHG Inventory", icon: BarChart3 },
  { id: "scope1", label: "Scope 1", icon: Fuel },
  { id: "scope2", label: "Scope 2", icon: Zap },
  { id: "scope3", label: "Scope 3", icon: Globe },
  { id: "risk", label: "Climate Risk", icon: Shield },
  { id: "reporting", label: "Reporting", icon: FileText },
];

export default function App() {
  const [tab, setTab] = useState("upload");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.error) { setError(json.error); }
      else { setData(json); setTab("inventory"); } // auto-switch to results
    } catch (err) { setError(`Connection failed: ${err.message}`); }
    finally { setLoading(false); }
  }

  const needsData = ["inventory", "scope1", "scope2", "scope3"].includes(tab);

  return (
    <div style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", background: C.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>Salas O'Brien — ESG Platform</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>GHG Emissions Tracking · Climate Risk · Compliance Reporting</div>
        </div>
        {data && <div style={{ display: "flex", gap: 8 }}>
          <span style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", fontSize: 11 }}>{data.locations_processed} Locations</span>
          <span style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #334155", background: "#1e293b", color: "#94a3b8", fontSize: 11 }}>FY 2024</span>
        </div>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.bdr}`, background: C.card, padding: "0 20px", overflowX: "auto" }}>
        {TABS.map(t => {
          const active = tab === t.id;
          const disabled = ["inventory", "scope1", "scope2"].includes(t.id) && !data;
          return <button key={t.id} onClick={() => !disabled && setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "12px 16px", border: "none", background: "none",
            cursor: disabled ? "default" : "pointer", fontSize: 12, fontWeight: active ? 600 : 400,
            color: disabled ? C.tx3 : active ? C.bl : C.tx2, opacity: disabled ? .5 : 1,
            borderBottom: active ? `2px solid ${C.bl}` : "2px solid transparent", whiteSpace: "nowrap",
          }}><t.icon size={15} />{t.label}</button>;
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
        {tab === "upload" && <UploadTab data={data} loading={loading} error={error} onUpload={handleUpload} />}
        {tab === "inventory" && data && <InventoryTab data={data} />}
        {tab === "scope1" && data && <Scope1Tab data={data} />}
        {tab === "scope2" && data && <Scope2Tab data={data} />}
        {tab === "scope3" && data && <Scope3Tab data={data} />}
        {tab === "risk" && <RiskTab />}
        {tab === "reporting" && <ReportingTab />}
        {needsData && !data && <Card><div style={{ textAlign: "center", padding: 40, color: C.tx2 }}>Upload a CSV file first to see emissions data.</div></Card>}
      </div>

      <div style={{ textAlign: "center", padding: 16, fontSize: 10, color: C.tx3 }}>
        Salas O'Brien / Epsten Group ESG Platform · GHG Emissions Tracking Demo
      </div>
    </div>
  );
}