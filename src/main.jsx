import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calculator, Database, Gauge, Info, Search, Sparkles } from "lucide-react";
import { dataStats, eggData } from "./eggData";
import "./styles.css";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const center = (min, max) => (min + max) / 2;
const span = (min, max) => Math.max(0.000001, max - min);

function normalizedDistance(item, size, weight) {
  const sizeCenter = center(item.sizeMin, item.sizeMax);
  const weightCenter = center(item.weightMin, item.weightMax);
  const sizeDistance = Math.abs(size - sizeCenter) / span(dataStats.sizeMin, dataStats.sizeMax);
  const weightDistance = Math.abs(weight - weightCenter) / span(dataStats.weightMin, dataStats.weightMax);
  return Math.hypot(sizeDistance, weightDistance);
}

function predict(sizeValue, weightValue, k) {
  const size = Number(sizeValue);
  const weight = Number(weightValue);
  if (!Number.isFinite(size) || !Number.isFinite(weight)) return [];

  const neighbors = eggData
    .map((item) => {
      const distance = normalizedDistance(item, size, weight);
      const sizeHit = size >= item.sizeMin && size <= item.sizeMax;
      const weightHit = weight >= item.weightMin && weight <= item.weightMax;
      const rangeFactor = (sizeHit ? 1.45 : 1) * (weightHit ? 1.45 : 1);
      const score = (1 / Math.pow(distance + 0.015, 2)) * rangeFactor;
      return {
        ...item,
        distance,
        score,
        sizeHit,
        weightHit
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  const totalScore = neighbors.reduce((sum, item) => sum + item.score, 0);
  return neighbors.map((item) => ({
    ...item,
    probability: totalScore ? (item.score / totalScore) * 100 : 0
  }));
}

function fmt(value, digits = 3) {
  return Number(value).toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0
  });
}

function App() {
  const [size, setSize] = useState("0.23");
  const [weight, setWeight] = useState("2.1");
  const [k, setK] = useState(7);
  const [query, setQuery] = useState("");

  const predictions = useMemo(() => predict(size, weight, k), [size, weight, k]);
  const top = predictions[0];
  const filteredData = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return eggData;
    return eggData.filter((item) => `${item.id}${item.name}`.toLowerCase().includes(keyword));
  }, [query]);

  const confidence = top ? clamp(Math.round(top.probability), 1, 99) : 0;

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="panel input-panel">
          <div className="brand-row">
            <span className="mark"><Sparkles size={22} /></span>
            <div>
              <h1>洛克王国孵蛋概率计算器</h1>
              <p>KNN 精灵种类预测</p>
            </div>
          </div>

          <label className="field">
            <span>蛋尺寸</span>
            <input value={size} onChange={(event) => setSize(event.target.value)} inputMode="decimal" placeholder="例如 0.23" />
          </label>

          <label className="field">
            <span>蛋重量</span>
            <input value={weight} onChange={(event) => setWeight(event.target.value)} inputMode="decimal" placeholder="例如 2.10" />
          </label>

          <label className="field">
            <span>K 值：{k}</span>
            <input
              type="range"
              min="3"
              max="15"
              step="2"
              value={k}
              onChange={(event) => setK(Number(event.target.value))}
            />
          </label>

          <div className="metric-grid">
            <div>
              <Database size={18} />
              <strong>{eggData.length}</strong>
              <span>参考种类</span>
            </div>
            <div>
              <Gauge size={18} />
              <strong>{confidence}%</strong>
              <span>最高概率</span>
            </div>
          </div>

          <p className="note">
            <Info size={16} />
            概率来自最近 K 个邻居的距离权重；如果尺寸和重量同时落入某个种类范围，会获得额外贴合度。
          </p>
        </aside>

        <section className="panel result-panel">
          <div className="section-title">
            <Calculator size={22} />
            <div>
              <h2>预测结果</h2>
              <p>按概率从高到低展示最接近的孵化种类</p>
            </div>
          </div>

          {top ? (
            <div className="hero-result">
              <div>
                <span className="tag">最可能</span>
                <h3>{top.name}</h3>
                <p>序列 {top.id} · 距离 {fmt(top.distance, 4)}</p>
              </div>
              <strong>{fmt(top.probability, 1)}%</strong>
            </div>
          ) : (
            <div className="empty">输入尺寸和重量后开始预测</div>
          )}

          <div className="rank-list">
            {predictions.map((item, index) => (
              <article className="rank-item" key={item.id}>
                <div className="rank-index">{index + 1}</div>
                <div className="rank-body">
                  <div className="rank-head">
                    <strong>{item.name}</strong>
                    <span>{fmt(item.probability, 1)}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${clamp(item.probability, 1, 100)}%` }} />
                  </div>
                  <div className="range-line">
                    <span className={item.sizeHit ? "hit" : ""}>尺寸 {fmt(item.sizeMin)}-{fmt(item.sizeMax)}</span>
                    <span className={item.weightHit ? "hit" : ""}>重量 {fmt(item.weightMin)}-{fmt(item.weightMax)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel data-panel">
        <div className="data-toolbar">
          <div className="section-title compact">
            <Database size={20} />
            <div>
              <h2>参考数据</h2>
              <p>来自你提供的孵蛋尺寸、重量范围表</p>
            </div>
          </div>
          <label className="search">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索序列或名称" />
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>序列</th>
                <th>名称</th>
                <th>尺寸下</th>
                <th>尺寸上</th>
                <th>重量下</th>
                <th>重量上</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.name}</td>
                  <td>{fmt(item.sizeMin)}</td>
                  <td>{fmt(item.sizeMax)}</td>
                  <td>{fmt(item.weightMin)}</td>
                  <td>{fmt(item.weightMax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
