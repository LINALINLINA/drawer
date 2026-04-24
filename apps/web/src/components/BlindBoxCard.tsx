import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBlindBoxStore } from "../stores/blindbox-store";
import type { Template, TemplateIndexEntry } from "@drawer/template-engine";

const difficultyLabel: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const difficultyColor: Record<string, string> = {
  easy: "#7fb685",
  medium: "#f7c948",
  hard: "#e8785a",
};

const DIFFICULTY_STARS: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

interface BlindBoxCardProps {
  entry: TemplateIndexEntry;
  template: Template | null;
  index: number;
  onLoadTemplate: (entry: TemplateIndexEntry) => void;
}

export default function BlindBoxCard({
  entry,
  template,
  index,
  onLoadTemplate,
}: BlindBoxCardProps) {
  const [state, setState] = useState<"box" | "opening" | "revealed">("box");
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  const { isUnlocked, unlock, isAnimating, setAnimating } = useBlindBoxStore();
  const unlocked = isUnlocked(entry.id);

  const diff = template?.difficulty ?? entry.difficulty ?? "medium";
  const diffLabel = difficultyLabel[diff] ?? "中等";
  const diffColor = difficultyColor[diff] ?? "#f7c948";
  const stars = DIFFICULTY_STARS[diff] ?? 2;
  const rotation = index % 2 === 0 ? -1.5 : 1.5;
  const tapeRotation = index % 3 === 0 ? -8 : 5;

  const handleClick = useCallback(() => {
    if (unlocked) {
      navigate(`/editor/${entry.id}`);
      return;
    }
    if (isAnimating) return;

    setState("opening");
    setShowConfetti(true);
    setAnimating(true);
    onLoadTemplate(entry);

    setTimeout(() => {
      unlock(entry.id);
      setState("revealed");
    }, 1200);

    setTimeout(() => {
      setShowConfetti(false);
      setAnimating(false);
    }, 2500);
  }, [
    unlocked,
    isAnimating,
    entry,
    unlock,
    setAnimating,
    navigate,
    onLoadTemplate,
  ]);

  useEffect(() => {
    if (state === "revealed") {
      const timer = setTimeout(() => navigate(`/editor/${entry.id}`), 800);
      return () => clearTimeout(timer);
    }
  }, [state, navigate]);

  // 盲盒状态
  if (!unlocked && state !== "revealed") {
    return (
      <div
        style={{
          cursor: isAnimating ? "default" : "pointer",
          transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transform:
            state === "opening" ? "scale(1.1)" : `rotate(${rotation}deg)`,
          opacity: 0,
          animation: `bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) ${index * 0.08}s forwards`,
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
        onClick={handleClick}
      >
        <div
          style={{
            background: "#fffbf5",
            border: "2.5px solid #5a4a3a",
            borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
            height: 220,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            overflow: "hidden",
            boxShadow:
              state === "opening"
                ? "6px 8px 0 rgba(90,74,58,0.12), 0 16px 32px rgba(90,74,58,0.1)"
                : "3px 3px 0 rgba(90,74,58,0.06)",
          }}
        >
          {/* 胶带 */}
          <div
            style={{
              position: "absolute",
              top: -8,
              left: index % 3 === 0 ? 10 : 55,
              transform: `rotate(${tapeRotation}deg)`,
              width: 70,
              height: 22,
              background: "rgba(255,235,180,0.85)",
              border: "1px solid rgba(200,180,130,0.5)",
              zIndex: 2,
              transition: "transform 0.6s",
              transformOrigin: "center",
              ...(state === "opening"
                ? {
                    transform: `rotate(${tapeRotation + 90}deg) translateY(-20px)`,
                    opacity: 0,
                  }
                : {}),
            }}
          />

          {/* 问号 */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: state === "opening" ? "#e8785a" : "#5a4a3a",
              transition: "all 0.6s",
              textShadow:
                state === "opening" ? "0 0 20px rgba(232,120,90,0.3)" : "none",
              userSelect: "none",
            }}
          >
            ?
          </div>

          {/* 星星装饰 */}
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {[0, 1, 2].map((s) => (
              <svg
                key={s}
                width={s < stars ? 16 : 14}
                height={s < stars ? 16 : 14}
                viewBox="0 0 16 16"
                style={{
                  opacity: s < stars ? 1 : 0.3,
                  transition: "opacity 0.3s",
                }}
              >
                <path
                  d="M8 1L10 5.5L15 6.5L11.5 9.5L12.5 15L8 12L3.5 15L4.5 9.5L1 6.5L6 5.5Z"
                  fill="#f7c948"
                  stroke="#5a4a3a"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  strokeDasharray="3 2"
                />
              </svg>
            ))}
          </div>

          {/* 难度标签 */}
          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#fff",
              background: diffColor,
              padding: "2px 10px",
              borderRadius: "10px 4px 10px 4px",
              letterSpacing: 0.5,
            }}
          >
            {diffLabel}
          </div>

          {showConfetti && <Confetti />}
        </div>
      </div>
    );
  }

  // 已解锁 / 揭示状态
  const name = template?.name ?? entry.name ?? entry.id;
  return (
    <div
      style={{
        cursor: "pointer",
        transition:
          "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s",
        transform:
          state === "revealed" ? "scale(1.05)" : `rotate(${rotation}deg)`,
        opacity: 0,
        animation: `bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) ${index * 0.08}s forwards`,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      onClick={handleClick}
    >
      <div
        style={{
          background: "#fffbf5",
          border: "2.5px solid #5a4a3a",
          borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
          overflow: "hidden",
          boxShadow:
            state === "revealed"
              ? "0 0 20px rgba(232,120,90,0.2), 3px 3px 0 rgba(90,74,58,0.06)"
              : "3px 3px 0 rgba(90,74,58,0.06)",
        }}
      >
        <div
          style={{
            height: 140,
            background: "#fefcf8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            overflow: "hidden",
          }}
        >
          {template ? (
            <svg
              width="100%"
              height="100%"
              viewBox={
                template.viewBox
                  ? `${template.viewBox.x} ${template.viewBox.y} ${template.viewBox.w} ${template.viewBox.h}`
                  : "0 0 400 400"
              }
              preserveAspectRatio="xMidYMid meet"
            >
              {template.regions.map((r, i) => {
                const hue = (i * 360) / template.regions.length;
                return (
                  <path
                    key={r.id}
                    d={r.path}
                    fill={`hsl(${hue}, 65%, 82%)`}
                    stroke={`hsl(${hue}, 45%, 58%)`}
                    strokeWidth={2}
                    strokeDasharray={i % 2 === 0 ? "none" : "5 3"}
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              style={{ animation: "spin 0.8s linear infinite" }}
            >
              <path
                d="M16 4a12 12 0 0 1 12 12h-4a8 8 0 0 0-8-8V4z"
                fill="#e8785a"
              />
            </svg>
          )}
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderTop: "2px dashed #8a7a6a",
            opacity: 0.85,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#3a322a",
              marginBottom: 6,
            }}
          >
            {name}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#fff",
              background: diffColor,
              padding: "2px 8px",
              borderRadius: "10px 4px 10px 4px",
            }}
          >
            {diffLabel}
          </span>
          {state === "revealed" && (
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                color: "#e8785a",
                fontStyle: "italic",
              }}
            >
              新解锁! 点击进入
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 20 }, (_, i) => ({
    x: 50 + (Math.random() - 0.5) * 60,
    delay: Math.random() * 0.3,
    color: ["#e8785a", "#f7c948", "#7fb685", "#7ec8d8", "#b8a9d4", "#f4a983"][
      i % 6
    ],
    size: 4 + Math.random() * 4,
    rotation: Math.random() * 360,
  }));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {pieces.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-10px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.size > 6 ? 2 : 1,
            transform: `rotate(${p.rotation}deg)`,
            animation: `confettiFall 1.2s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translateY(240px) rotate(${360 + Math.random() * 360}deg) scale(0.3); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.7) rotate(-3deg); }
          60% { transform: scale(1.05) rotate(1deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
