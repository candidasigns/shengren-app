import { useState, useEffect, useRef } from "react";
import "./App.css";

const NAVY = "#1e3560", GOLD = "#b8860b", GOLD_BG = "#fdf8ee", GRN = "#15803d";
const todayKey = () => new Date().toISOString().slice(0, 10);
const fmtSec = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const fmtDate = (d = new Date()) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${"日一二三四五六"[d.getDay()]}`;

// ── 本地存储（替换Claude专属storage）──
const DB = {
  get: (k) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

// ── Anthropic API（使用环境变量中的API Key）──
async function ai(prompt, sys = "你是一位有圣经神学根基的灵修引导者，语气温和深刻，请用简体中文回答。") {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) return "⚠️ 请在 .env 文件中设置 VITE_ANTHROPIC_API_KEY";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: sys,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text || "（AI暂时无法响应）";
  } catch { return "（网络错误，请稍后重试）"; }
}

const Card = ({ children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 14, border: "0.5px solid #e5e7eb", ...style }}>{children}</div>
);
const Btn = ({ children, onClick, style = {}, disabled = false, sm = false }) => (
  <button onClick={onClick} disabled={disabled}
    style={{ padding: sm ? "4px 12px" : "10px 18px", background: NAVY, color: "#fff", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .55 : 1, fontSize: sm ? 12 : 14, ...style }}>
    {children}
  </button>
);
const Input = ({ value, onChange, placeholder, style = {} }) => (
  <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ width: "100%", padding: "8px 10px", border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 13, boxSizing: "border-box", ...style }} />
);
const TA = ({ value, onChange, placeholder, rows = 4 }) => (
  <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
    style={{ width: "100%", padding: 10, border: "0.5px solid #d1d5db", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", lineHeight: 1.8, fontFamily: "Georgia, serif" }} />
);
const Tag = ({ children, color = GOLD }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>{children}</span>
);

const VERSES = [
  { t: "你们亲近神，神就必亲近你们。", r: "雅各书 4:8" },
  { t: "我靠着那加给我力量的，凡事都能做。", r: "腓立比书 4:13" },
  { t: "神的道是活泼的，是有功效的，比一切两刃的剑更快。", r: "希伯来书 4:12" },
  { t: "应当一无挂虑，只要凡事藉着祷告、祈求，和感谢，将你们所要的告诉神。", r: "腓立比书 4:6" },
  { t: "你们要先求他的国和他的义，这些东西都要加给你们了。", r: "马太福音 6:33" },
  { t: "我的心哪，你当默默无声，专等候神；因为我的盼望是从他而来。", r: "诗篇 62:5" },
  { t: "你们认识真理，真理必叫你们得以自由。", r: "约翰福音 8:32" },
];

function Home({ ctx, startFocus, handleMusic, musicUrl, setScreen }) {
  const { data, focusOn } = ctx;
  const today = todayKey();
  const todaySec = data.sessions?.[today] || 0;
  const todayMeds = (data.meditations || []).filter(m => m.date === today).length;
  const pending = (data.intercessions || []).filter(p => !p.answered).length;
  const v = VERSES[new Date().getDay() % VERSES.length];
  return (
    <div>
      <div style={{ textAlign: "center", padding: "24px 0 18px" }}>
        <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{fmtDate()}</div>
        <div style={{ fontSize: 22, color: NAVY, margin: "6px 0", fontFamily: "Georgia, serif" }}>🕊 与神同在</div>
        <div style={{ fontSize: 14, color: GOLD, fontStyle: "italic", lineHeight: 1.7, fontFamily: "Georgia, serif", padding: "0 16px" }}>"{v.t}"</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{v.r}</div>
      </div>
      <Card style={{ background: NAVY, border: "none" }}>
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.75, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
          "主啊，我来到你面前，求你帮助我安静下来，专心聆听你的话语，让我的心被你的同在充满。"
        </p>
        {!focusOn
          ? <Btn onClick={startFocus} style={{ width: "100%", background: GOLD, fontSize: 15, padding: 12 }}>▶ 开始今日灵修专注</Btn>
          : <div style={{ textAlign: "center", fontSize: 14, color: "rgba(255,255,255,0.8)", padding: "8px 0" }}>✅ 专注会话进行中</div>
        }
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[{ icon: "⏱", l: "今日时长", v: fmtSec(todaySec) }, { icon: "📖", l: "默想次数", v: `${todayMeds}次` }, { icon: "🙏", l: "代祷事项", v: `${pending}项` }].map(s => (
          <div key={s.l} style={{ background: "#fff", borderRadius: 12, padding: "12px 8px", textAlign: "center", border: "0.5px solid #e5e7eb" }}>
            <div style={{ fontSize: 18 }}>{s.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: NAVY, margin: "4px 0" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 14, color: NAVY }}>🎵 敬拜音乐</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{musicUrl ? "✅ 已加载，专注时自动播放" : "上传赞美诗 MP3"}</div>
          </div>
          <label style={{ background: GOLD_BG, border: `1px solid ${GOLD}`, color: GOLD, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}>
            {musicUrl ? "更换" : "上传"}
            <input type="file" accept="audio/mp3,audio/*" onChange={handleMusic} style={{ display: "none" }} />
          </label>
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 10 }}>快速进入</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ icon: "📖", l: "圣经默想", id: "word" }, { icon: "🙏", l: "祷告", id: "prayer" }, { icon: "📚", l: "行道资料库", id: "library" }, { icon: "📊", l: "灵修评估", id: "tracker" }].map(a => (
            <button key={a.id} onClick={() => setScreen(a.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "#f9fafb", border: "0.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", color: "#111827", fontSize: 13 }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span><span>{a.l}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Word({ ctx }) {
  const { data, save } = ctx;
  const [ref, setRef] = useState("");
  const [txt, setTxt] = useState("");
  const [guide, setGuide] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [ok, setOk] = useState(false);

  const getGuide = async () => {
    if (!txt.trim()) return;
    setLoading(true); setGuide("");
    const g = await ai(
      `圣经经文：${ref || "未注明"}\n\n经文：${txt}\n\n请提供：\n1. 4-5个帮助深度默想的问题（用"你"的角度提问，引导进入经文）\n2. 2-3个灵修洞见（💡标注，神在这段话要说的核心信息）\n3. 一个具体的生活应用方向（🌱标注）`,
      "你是一位有深厚圣经神学根基的灵修引导者。帮助这位基督徒深度默想神的话语，用简体中文，语气温暖亲切。"
    );
    setGuide(g); setLoading(false);
  };

  const saveEntry = async () => {
    if (!notes.trim() && !txt.trim()) return;
    const entry = { id: Date.now(), date: todayKey(), ref, txt, guide, notes };
    const meditations = [entry, ...(data.meditations || [])];
    await save({ meditations });
    setOk(true); setTimeout(() => setOk(false), 2000);
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 500, color: NAVY, marginBottom: 14 }}>📖 圣经默想</div>
      <Card>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>经文出处</label>
          <Input value={ref} onChange={setRef} placeholder="如：约翰福音 3:16-17" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>经文内容</label>
          <TA value={txt} onChange={setTxt} placeholder="在此输入今天默想的经文..." rows={4} />
        </div>
        <Btn onClick={getGuide} disabled={loading || !txt.trim()} style={{ width: "100%", background: GOLD }}>
          {loading ? "✨ AI默想引导生成中..." : "✨ 获取AI默想引导"}
        </Btn>
      </Card>
      {guide && (
        <Card style={{ background: GOLD_BG, borderLeft: `4px solid ${GOLD}`, borderRadius: 8 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: GOLD, marginBottom: 8 }}>✨ 默想引导</div>
          <div style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{guide}</div>
        </Card>
      )}
      {(txt || guide) && (
        <Card>
          <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 8 }}>📝 我的回应与感动</div>
          <TA value={notes} onChange={setNotes} placeholder="神借着这段经文对我说了什么？我的心有何感动？" rows={5} />
          <div style={{ marginTop: 10, textAlign: "right" }}>
            <Btn onClick={saveEntry} style={{ background: ok ? GRN : NAVY }}>{ok ? "✅ 已保存" : "保存默想记录"}</Btn>
          </div>
        </Card>
      )}
      {(data.meditations || []).length > 0 && (
        <Card>
          <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 10 }}>📅 近期默想记录</div>
          {(data.meditations || []).slice(0, 5).map(h => (
            <div key={h.id} style={{ borderBottom: "0.5px solid #e5e7eb", paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <Tag>{h.ref || "经文"}</Tag>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{h.date}</span>
              </div>
              {h.notes && <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontFamily: "Georgia, serif" }}>{h.notes}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Prayer({ ctx }) {
  const { data, save } = ctx;
  const [tab, setTab] = useState(0);
  const [pc, setPc] = useState({ 0: "", 1: "", 2: "", 3: "" });
  const [msg, setMsg] = useState("");
  const [iRef, setIRef] = useState("");
  const [iNote, setINote] = useState("");

  const TABS = [
    { l: "教导", icon: "📜", p: "这段经文教导我认识神的何种属性、旨意或命令？神要我明白和顺服什么？" },
    { l: "感谢", icon: "🙌", p: "因这段话语，我要为什么感谢神？神在我和家人生命中做了什么值得感恩的事？" },
    { l: "认罪悔改", icon: "💔", p: "这段话语照出我生命中哪些罪、软弱、骄傲或需要改变的地方？" },
    { l: "代求", icon: "🙏", p: "因这段话语，我要为自己、妻子、孩子或他人祈求什么具体的事？" },
  ];

  const savePrayer = async () => {
    const entry = { id: Date.now(), date: todayKey(), content: { ...pc } };
    const prayerLogs = [entry, ...(data.prayerLogs || [])];
    await save({ prayerLogs });
    setMsg("已保存"); setTimeout(() => setMsg(""), 2000);
  };

  const addInter = async () => {
    if (!iNote.trim()) return;
    const item = { id: Date.now(), date: todayKey(), ref: iRef, note: iNote, answered: false };
    const intercessions = [item, ...(data.intercessions || [])];
    await save({ intercessions });
    setIRef(""); setINote("");
  };

  const toggleAns = async (id) => {
    const intercessions = (data.intercessions || []).map(i =>
      i.id === id ? { ...i, answered: !i.answered, answeredDate: i.answered ? null : todayKey() } : i
    );
    await save({ intercessions });
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 500, color: NAVY, marginBottom: 14 }}>🙏 祷告</div>
      <Card style={{ background: GOLD_BG, borderLeft: `4px solid ${GOLD}`, borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: GOLD, fontWeight: 500, marginBottom: 4 }}>马丁·路德「祷告环」</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, fontFamily: "Georgia, serif" }}>将神的话语转化为内心的呼求：教导 → 感谢 → 认罪悔改 → 代求</div>
      </Card>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ flex: 1, padding: "8px 4px", background: tab === i ? NAVY : "#fff", color: tab === i ? "#fff" : "#6b7280", border: `0.5px solid ${tab === i ? NAVY : "#e5e7eb"}`, borderRadius: 8, cursor: "pointer", fontSize: 11, lineHeight: 1.4 }}>
            <div style={{ fontSize: 15, marginBottom: 2 }}>{t.icon}</div>
            <div>{t.l}</div>
          </button>
        ))}
      </div>
      <Card>
        <div style={{ fontSize: 13, color: GOLD, marginBottom: 8, fontStyle: "italic", lineHeight: 1.65, fontFamily: "Georgia, serif" }}>{TABS[tab].p}</div>
        <TA value={pc[tab]} onChange={v => setPc({ ...pc, [tab]: v })} placeholder={`在此写下你「${TABS[tab].l}」的祷告内容...`} rows={5} />
        <div style={{ marginTop: 10, textAlign: "right" }}>
          <Btn onClick={savePrayer} style={{ background: msg ? GRN : NAVY }}>{msg || "保存今日祷告"}</Btn>
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 10 }}>📋 代祷事项追踪</div>
        <div style={{ marginBottom: 8 }}><Input value={iRef} onChange={setIRef} placeholder="为谁/何事祷告" /></div>
        <div style={{ marginBottom: 8 }}><TA value={iNote} onChange={setINote} placeholder="具体代祷内容..." rows={2} /></div>
        <div style={{ textAlign: "right", marginBottom: 14 }}>
          <Btn onClick={addInter} sm disabled={!iNote.trim()}>+ 添加代祷</Btn>
        </div>
        {(data.intercessions || []).length === 0
          ? <div style={{ textAlign: "center", color: "#6b7280", fontSize: 13, padding: "12px 0" }}>暂无代祷事项</div>
          : (data.intercessions || []).slice(0, 10).map(item => (
            <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 0", borderBottom: "0.5px solid #e5e7eb" }}>
              <button onClick={() => toggleAns(item.id)}
                style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${item.answered ? GRN : "#d1d5db"}`, background: item.answered ? GRN : "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, marginTop: 2 }}>
                {item.answered ? "✓" : ""}
              </button>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: item.answered ? "#9ca3af" : "#111827", textDecoration: item.answered ? "line-through" : "none" }}>{item.ref || item.note}</div>
                {item.ref && <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontFamily: "Georgia, serif" }}>{item.note}</div>}
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{item.date}{item.answeredDate ? ` → 🎉 蒙应允：${item.answeredDate}` : ""}</div>
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}

function Library({ ctx }) {
  const { data, save } = ctx;
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("sermon");
  const [content, setContent] = useState("");
  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);

  const TYPES = [{ v: "sermon", l: "讲道笔记" }, { v: "article", l: "文章收藏" }, { v: "family", l: "家庭灵修" }, { v: "other", l: "其他" }];

  const getInsight = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const ins = await ai(
      `以下是我的属灵笔记：\n\n${content}\n\n请帮我：\n1. 提炼2-3个核心真理要点\n2. 提供3个具体可行的生活操练建议\n3. 列出1-2节相关经文\n4. 给出一个本周可以实践的「行道挑战」`,
      "你是一位基督徒生命导师，帮助人把神的话语应用在日常生活和家庭中。建议要真实可行，请用简体中文。"
    );
    setInsight(ins); setLoading(false);
  };

  const addResource = async () => {
    if (!content.trim()) return;
    const item = { id: Date.now(), date: todayKey(), title: title || "未命名", type, content, insight };
    const library = [item, ...(data.library || [])];
    await save({ library });
    setTitle(""); setContent(""); setInsight(""); setType("sermon"); setView("list");
  };

  if (view === "view" && sel) {
    const item = (data.library || []).find(r => r.id === sel);
    if (!item) return null;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <button onClick={() => { setView("list"); setSel(null); }}
            style={{ background: "none", border: "0.5px solid #e5e7eb", color: "#6b7280", padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>← 返回</button>
          <span style={{ fontSize: 18, fontWeight: 500, color: NAVY }}>{TYPES.find(t => t.v === item.type)?.l}</span>
        </div>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 500, color: NAVY, marginBottom: 4 }}>{item.title}</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 12 }}>{item.date}</div>
          <div style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{item.content}</div>
        </Card>
        {item.insight && (
          <Card style={{ background: GOLD_BG, borderLeft: `4px solid ${GOLD}`, borderRadius: 8 }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: GOLD, marginBottom: 8 }}>💡 AI应用建议</div>
            <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{item.insight}</div>
          </Card>
        )}
      </div>
    );
  }

  if (view === "add") return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: NAVY }}>📚 新增资源</div>
        <button onClick={() => setView("list")} style={{ background: "none", border: "0.5px solid #e5e7eb", color: "#6b7280", padding: "5px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>← 返回</button>
      </div>
      <Card>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 6 }}>类型</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TYPES.map(t => (
              <button key={t.v} onClick={() => setType(t.v)}
                style={{ padding: "5px 12px", background: type === t.v ? NAVY : "#f9fafb", color: type === t.v ? "#fff" : "#6b7280", border: `0.5px solid ${type === t.v ? NAVY : "#e5e7eb"}`, borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                {t.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>标题</label>
          <Input value={title} onChange={setTitle} placeholder="笔记或资料标题" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>内容</label>
          <TA value={content} onChange={setContent} placeholder="在此输入讲道笔记、文章要点、灵修心得..." rows={8} />
        </div>
        {!insight
          ? <Btn onClick={getInsight} disabled={loading || !content.trim()} style={{ width: "100%", background: GOLD, marginBottom: 10 }}>
            {loading ? "AI整合分析中..." : "💡 获取AI应用建议"}
          </Btn>
          : <div style={{ padding: 12, background: GOLD_BG, borderRadius: 8, marginBottom: 12, borderLeft: `4px solid ${GOLD}` }}>
            <div style={{ fontWeight: 500, fontSize: 13, color: GOLD, marginBottom: 6 }}>💡 AI 真理整合 & 应用建议</div>
            <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{insight}</div>
          </div>
        }
        <Btn onClick={addResource} disabled={!content.trim()} style={{ width: "100%" }}>保存到资料库</Btn>
      </Card>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 500, color: NAVY }}>📚 行道资料库</div>
        <Btn sm onClick={() => setView("add")}>+ 新增</Btn>
      </div>
      {(data.library || []).length === 0
        ? <Card><div style={{ textAlign: "center", color: "#6b7280", padding: "24px 0", fontSize: 14 }}>资料库暂无内容<br /><span style={{ fontSize: 12 }}>点击「+ 新增」添加讲道笔记或文章</span></div></Card>
        : (data.library || []).map(r => (
          <div key={r.id} onClick={() => { setSel(r.id); setView("view"); }} style={{ cursor: "pointer" }}>
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <Tag>{TYPES.find(t => t.v === r.type)?.l || r.type}</Tag>
                <span style={{ fontSize: 11, color: "#6b7280" }}>{r.date}</span>
              </div>
              <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 4 }}>{r.title}</div>
              <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", fontFamily: "Georgia, serif" }}>{r.content}</div>
              {r.insight && <div style={{ marginTop: 8, fontSize: 12, color: GOLD }}>💡 有AI应用建议</div>}
            </Card>
          </div>
        ))
      }
    </div>
  );
}

function Tracker({ ctx }) {
  const { data, save } = ctx;
  const [score, setScore] = useState(3);
  const [review, setReview] = useState("");
  const [aiIns, setAiIns] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);

  const sessions = data.sessions || {};
  const meds = data.meditations || [];
  const inters = data.intercessions || [];
  const plogs = data.prayerLogs || [];
  const lib = data.library || [];
  const totalSec = Object.values(sessions).reduce((a, b) => a + b, 0);
  const answered = inters.filter(i => i.answered).length;

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const k = d.toISOString().slice(0, 10);
    return { l: `${d.getMonth() + 1}/${d.getDate()}`, sec: sessions[k] || 0 };
  });
  const maxS = Math.max(...last7.map(d => d.sec), 300);

  const getInsight = async () => {
    setLoading(true);
    const stats = `总灵修时长：${Math.floor(totalSec / 60)}分钟\n默想次数：${meds.length}次\n祷告记录：${plogs.length}次\n代祷应允：${answered}/${inters.length}\n资料库：${lib.length}篇\n本周自评：${score}/5\n周反思：${review}`;
    const ins = await ai(
      `根据以下灵修数据，请提供属灵成长分析：\n\n${stats}\n\n请包括：\n1. 一句真诚的肯定与鼓励\n2. 2-3个成长点或薄弱环节\n3. 下周2-3个具体改进建议\n4. 一段适合现在状态的经文鼓励`,
      "你是一位关怀灵魂成长的属灵导师。请用温和鼓励的语气，帮助人看见神的恩典和成长空间。简体中文。"
    );
    setAiIns(ins); setLoading(false);
  };

  const saveReview = async () => {
    const entry = { id: Date.now(), date: todayKey(), score, review, insight: aiIns };
    const reviews = [entry, ...(data.reviews || [])];
    await save({ reviews });
    setOk(true); setTimeout(() => setOk(false), 2000);
  };

  const SLABELS = ["", "需要更多委身", "有所起伏", "稳定同行", "颇有突破", "深深与神同在"];

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 500, color: NAVY, marginBottom: 14 }}>📊 灵修成长评估</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[
          { icon: "⏱", l: "总灵修时长", v: `${Math.floor(totalSec / 3600)}h ${Math.floor((totalSec % 3600) / 60)}m` },
          { icon: "📖", l: "默想总次数", v: `${meds.length}次` },
          { icon: "🙏", l: "祷告记录", v: `${plogs.length}次` },
          { icon: "✅", l: "祷告蒙应允", v: `${answered}/${inters.length}` },
        ].map(s => (
          <Card key={s.l} style={{ textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 20 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: NAVY, margin: "4px 0" }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>{s.l}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 12 }}>近7天灵修时长</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
          {last7.map((d, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", background: d.sec > 0 ? NAVY : "#e5e7eb", borderRadius: "3px 3px 0 0", height: d.sec > 0 ? `${Math.max((d.sec / maxS) * 64, 4)}px` : "4px" }} />
              <span style={{ fontSize: 10, color: "#6b7280" }}>{d.l}</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 500, fontSize: 14, color: NAVY, marginBottom: 12 }}>📝 每周灵修自我评估</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>这周与神同行的感受：</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setScore(n)}
                style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${n <= score ? GOLD : "#e5e7eb"}`, background: n <= score ? GOLD : "transparent", cursor: "pointer", fontSize: 13, color: n <= score ? "#fff" : "#6b7280", fontWeight: 500 }}>
                {n}
              </button>
            ))}
            <span style={{ fontSize: 12, color: GOLD, marginLeft: 4 }}>{SLABELS[score]}</span>
          </div>
        </div>
        <TA value={review} onChange={setReview} placeholder="这周读经、祷告、灵修的感受和反思..." rows={5} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn onClick={getInsight} disabled={loading} style={{ background: GOLD }}>{loading ? "AI分析中..." : "💡 AI成长分析"}</Btn>
          <Btn onClick={saveReview} style={{ background: ok ? GRN : NAVY }}>{ok ? "✅ 已保存" : "保存评估"}</Btn>
        </div>
      </Card>
      {aiIns && (
        <Card style={{ background: GOLD_BG, borderLeft: `4px solid ${GOLD}`, borderRadius: 8 }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: GOLD, marginBottom: 8 }}>💡 属灵成长分析</div>
          <div style={{ fontSize: 13, lineHeight: 1.85, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>{aiIns}</div>
        </Card>
      )}
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [focusOn, setFocusOn] = useState(false);
  const [focusSec, setFocusSec] = useState(0);
  const [musicUrl, setMusicUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [data, setData] = useState(() => DB.get("shengren-data") || { meditations: [], prayerLogs: [], intercessions: [], library: [], sessions: {}, reviews: [] });

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const t0 = useRef(null);
  const MIN = 20 * 60;

  useEffect(() => {
    if (focusOn) {
      t0.current = Date.now() - focusSec * 1000;
      timerRef.current = setInterval(() => setFocusSec(Math.floor((Date.now() - t0.current) / 1000)), 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [focusOn]);

  const saveData = (updates) => {
    const nd = { ...data, ...updates };
    setData(nd);
    DB.set("shengren-data", nd);
  };

  const startFocus = async () => {
    setFocusSec(0); setFocusOn(true);
    if (musicUrl && audioRef.current) { try { await audioRef.current.play(); setPlaying(true); } catch { } }
  };

  const tryExit = () => {
    if (focusSec < MIN) {
      const rem = Math.ceil((MIN - focusSec) / 60);
      if (!confirm(`已专注 ${Math.floor(focusSec / 60)} 分钟。\n目标20分钟，还差 ${rem} 分钟。确认提前结束？`)) return;
    }
    const today = todayKey();
    const sessions = { ...data.sessions, [today]: (data.sessions?.[today] || 0) + focusSec };
    saveData({ sessions });
    setFocusOn(false);
    if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
  };

  const handleMusic = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setMusicUrl(URL.createObjectURL(f));
  };

  const NAV = [{ id: "home", icon: "🏠", l: "首页" }, { id: "word", icon: "📖", l: "默想" }, { id: "prayer", icon: "🙏", l: "祷告" }, { id: "library", icon: "📚", l: "资料库" }, { id: "tracker", icon: "📊", l: "评估" }];
  const ctx = { data, save: saveData, focusOn };

  return (
    <div style={{ fontFamily: "Georgia, serif", minHeight: "100vh", background: "#f9fafb", color: "#111827" }}>
      {musicUrl && <audio key={musicUrl} ref={audioRef} src={musicUrl} loop />}
      {focusOn && (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>⏱ {fmtSec(focusSec)}</span>
          <span style={{ fontSize: 12, opacity: .75 }}>专注灵修中</span>
          <div style={{ display: "flex", gap: 8 }}>
            {musicUrl && (
              <button onClick={() => { if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play(); setPlaying(true); } }}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                {playing ? "⏸ 音乐" : "▶ 音乐"}
              </button>
            )}
            <button onClick={tryExit} style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", padding: "4px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>结束</button>
          </div>
        </div>
      )}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 14px 88px" }}>
        {screen === "home" && <Home ctx={ctx} startFocus={startFocus} handleMusic={handleMusic} musicUrl={musicUrl} setScreen={setScreen} />}
        {screen === "word" && <Word ctx={ctx} />}
        {screen === "prayer" && <Prayer ctx={ctx} />}
        {screen === "library" && <Library ctx={ctx} />}
        {screen === "tracker" && <Tracker ctx={ctx} />}
      </div>
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "0.5px solid #e5e7eb", display: "flex" }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setScreen(n.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 6px", background: "none", border: "none", cursor: "pointer", color: screen === n.id ? GOLD : "#6b7280" }}>
            <span style={{ fontSize: 18 }}>{n.icon}</span>
            <span style={{ fontSize: 10, marginTop: 2 }}>{n.l}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}