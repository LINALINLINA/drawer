import { useState, useEffect, useRef } from "react";
import {
  loadTemplateIndex,
  loadTemplate,
  type Template,
  type TemplateIndexEntry,
} from "@drawer/template-engine";
import TemplateCard from "../components/TemplateCard";
import BottomNav from "../components/BottomNav";

const templatesBase = `${import.meta.env.BASE_URL}templates`;

const categories = [
  { key: "all", label: "全部" },
  { key: "easy", label: "入门" },
  { key: "medium", label: "进阶" },
  { key: "hard", label: "挑战" },
] as const;

const categoryIcons: Record<string, string> = {
  all: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4.5L6 21l1.5-7.5L4 7h5.5z",
  // 入门：笑脸
  easy: "M12 2a10 10 0 100 20A10 10 0 0012 2zm-3 12.5c.8 1.5 4.2 1.5 6 0M9 9h.01M15 9h.01",
  // 进阶：半颗星
  medium: "M12 2l2.5 5h5.5l-4.5 3.5 1.5 5.5L12 13V2z",
  // 挑战：闪电
  hard: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
};

export default function Home() {
  const [entries, setEntries] = useState<TemplateIndexEntry[]>([]);
  const [templateMap, setTemplateMap] = useState<Map<string, Template>>(
    new Map(),
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(new Set<string>());

  useEffect(() => {
    loadTemplateIndex(`${templatesBase}/index.json`).then((loaded) => {
      setEntries(loaded);
      setLoading(false);
      loaded.forEach((e) => fetchTemplate(e));
    });
  }, []);

  const fetchTemplate = (entry: TemplateIndexEntry) => {
    if (loadedRef.current.has(entry.id)) return;
    loadedRef.current.add(entry.id);
    loadTemplate(`${templatesBase}/${entry.file}`).then((t) => {
      if (t) {
        setTemplateMap((prev) => {
          const next = new Map(prev);
          next.set(entry.id, t);
          return next;
        });
      }
    });
  };

  const filtered =
    activeCategory === "all"
      ? entries
      : entries.filter((e) => e.category === activeCategory);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100dvh",
          background: "#fffbf5",
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          style={{ animation: "spin 0.8s linear infinite" }}
        >
          <path
            d="M20 6a14 14 0 0 1 14 14h-5a9 9 0 0 0-9-9V6z"
            fill="#e8785a"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingBottom: 72,
        position: "relative",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* 手绘装饰 */}
      <svg
        style={{
          position: "absolute",
          left: 15,
          top: 60,
          width: 22,
          height: 22,
          animation: "twinkle 2.5s ease-in-out infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
        viewBox="0 0 22 22"
      >
        <path
          d="M11 1L13.5 7.5L21 8.5L15.5 12.5L16.5 20L11 16L5.5 20L6.5 12.5L1 8.5L8.5 7.5Z"
          fill="#f7c948"
          stroke="#5a4a3a"
          strokeWidth="1.2"
          strokeDasharray="3 2"
        />
      </svg>
      <svg
        style={{
          position: "absolute",
          right: 20,
          top: 40,
          width: 20,
          height: 20,
          animation: "twinkle 3s ease-in-out 1s infinite",
          pointerEvents: "none",
          zIndex: 1,
        }}
        viewBox="0 0 20 20"
      >
        <path
          d="M10 2L12 6.5L17 7.5L13.5 10.5L14.5 16L10 13L5.5 16L6.5 10.5L3 7.5L8 6.5Z"
          fill="#e8785a"
          stroke="#5a4a3a"
          strokeWidth="1"
          strokeDasharray="3 2"
          opacity=".6"
        />
      </svg>

      {/* 头部 */}
      <header
        style={{ padding: "48px 20px 12px", position: "relative", zIndex: 2 }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path
              d="M5 22L20 4L24 8L9 26Z"
              fill="#e8785a"
              stroke="#3a322a"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M5 22L9 26L4 27Z"
              fill="#f7c948"
              stroke="#3a322a"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#3a322a",
              letterSpacing: 1,
              position: "relative",
              display: "inline-block",
            }}
          >
            创意绘画板
            <svg
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                width: "100%",
                height: 10,
              }}
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
            >
              <path
                d="M2 8Q50 2 100 8T198 6"
                stroke="#e8785a"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h1>
        </div>
        <p
          style={{
            fontSize: 14,
            color: "#8a7a6a",
            marginLeft: 36,
            fontStyle: "italic",
          }}
        >
          选择模板，开始你的创作之旅
        </p>
      </header>

      {/* 分类标签 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "10px 20px",
          overflowX: "auto",
          position: "relative",
          zIndex: 2,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((c) => {
          const isActive = activeCategory === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveCategory(c.key)}
              style={{
                padding: "8px 16px",
                border: `2px solid ${isActive ? "#3a322a" : "#c8b8a8"}`,
                borderRadius: "20px 8px 20px 8px",
                fontSize: 13,
                fontWeight: 600,
                background: isActive ? "#3a322a" : "#fffbf5",
                color: isActive ? "#fff" : "#5a4a3a",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: 6,
                minHeight: 40,
                transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                transform: isActive ? "scale(1.05)" : "scale(1)",
                boxShadow: isActive ? "2px 2px 0 rgba(58,50,42,0.2)" : "none",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill={isActive ? "#f7c948" : "none"}
                stroke={isActive ? "#f7c948" : "#5a4a3a"}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={categoryIcons[c.key]} />
              </svg>
              {c.label}
            </button>
          );
        })}
      </div>

      {/* 模板网格 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          padding: 16,
        }}
      >
        {filtered.map((entry, i) => {
          const t = templateMap.get(entry.id);
          if (!t) {
            return (
              <div
                key={entry.id}
                style={{
                  height: 220,
                  background: "#fffbf5",
                  border: "2.5px solid #d8c8b8",
                  borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  style={{ animation: "spin 0.8s linear infinite" }}
                >
                  <path
                    d="M12 4a8 8 0 0 1 8 8h-3a5 5 0 0 0-5-5V4z"
                    fill="#c8b8a8"
                  />
                </svg>
              </div>
            );
          }
          return <TemplateCard key={t.id} template={t} index={i} />;
        })}
      </div>

      {filtered.length === 0 && (
        <p
          style={{
            textAlign: "center",
            color: "#8a7a6a",
            marginTop: 40,
            fontSize: 14,
          }}
        >
          该分类暂无模板
        </p>
      )}

      <BottomNav />

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(0.8) rotate(10deg); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        div::-webkit-scrollbar { display: none; }
        body { overscroll-behavior-y: contain; }
      `}</style>
    </div>
  );
}
