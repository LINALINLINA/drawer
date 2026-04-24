import { useState, useEffect } from "react";
import {
  loadTemplateIndex,
  loadTemplate,
  type Template,
} from "@drawer/template-engine";
import TemplateCard from "../components/TemplateCard";
import BottomNav from "../components/BottomNav";

const categories = [
  { key: "all", label: "全部" },
  { key: "cute", label: "可爱风" },
  { key: "nature", label: "自然风" },
  { key: "mandala", label: "Mandala" },
  { key: "pixel", label: "像素风" },
] as const;

export default function Home() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplateIndex("/templates/index.json").then(async (entries) => {
      const loaded = await Promise.all(
        entries.map((e) => loadTemplate(`/templates/${e.file}`)),
      );
      setTemplates(loaded.filter((t): t is Template => t !== null));
      setLoading(false);
    });
  }, []);

  const filtered =
    activeCategory === "all"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  return (
    <div style={{ paddingBottom: 72 }}>
      <header style={{ padding: "16px 16px 8px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>创意绘画板</h1>
        <p style={{ fontSize: 14, color: "#666", margin: "4px 0 0" }}>
          选择模板，开始创作
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 16px",
          overflowX: "auto",
        }}
      >
        {categories.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCategory(c.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 16,
              border: "none",
              fontSize: 13,
              background: activeCategory === c.key ? "#1976D2" : "#f0f0f0",
              color: activeCategory === c.key ? "#fff" : "#333",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#999" }}>加载中...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: 16,
          }}
        >
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
