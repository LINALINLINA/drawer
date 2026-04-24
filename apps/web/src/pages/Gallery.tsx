import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useArtworks } from "../hooks/useArtworks";
import BottomNav from "../components/BottomNav";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${month}月${day}日 ${hours}:${mins}`;
}

export default function Gallery() {
  const { artworks, remove } = useArtworks();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div
      style={{
        paddingBottom: 72,
        background: "#fffbf5",
        minHeight: "100dvh",
      }}
    >
      {/* Header */}
      <header style={{ padding: "48px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z"
              fill="#e8785a"
            />
          </svg>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#3a322a",
              margin: 0,
              position: "relative",
              display: "inline-block",
            }}
          >
            我的作品
            <svg
              style={{
                position: "absolute",
                bottom: -4,
                left: 0,
                width: "100%",
                height: 8,
              }}
              viewBox="0 0 120 8"
              preserveAspectRatio="none"
            >
              <path
                d="M2 6Q30 2 60 6T118 4"
                stroke="#f7c948"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </h1>
        </div>
        {artworks.length > 0 && (
          <p style={{ fontSize: 13, color: "#8a7a6a", marginTop: 8 }}>
            共 {artworks.length} 件作品
          </p>
        )}
      </header>

      {/* 空状态 */}
      {artworks.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 80,
            gap: 16,
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="#d8c8b8"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <path
              d="M28 44 Q40 28 52 44"
              stroke="#c8b8a8"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="31" cy="36" r="3" fill="#c8b8a8" />
            <circle cx="49" cy="36" r="3" fill="#c8b8a8" />
          </svg>
          <p
            style={{
              color: "#8a7a6a",
              fontSize: 15,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            还没有作品
            <br />
            <span style={{ fontSize: 13, color: "#aaa" }}>
              去首页选一个模板开始创作吧～
            </span>
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 24px",
              background: "#e8785a",
              color: "#fff",
              border: "2px solid #3a322a",
              borderRadius: "12px 4px 12px 4px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            去创作
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 14,
            padding: "0 16px 16px",
          }}
        >
          {artworks.map((artwork, i) => (
            <div
              key={artwork.id}
              style={{
                opacity: 0,
                animation: `cardIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) ${i * 0.05}s forwards`,
              }}
            >
              <div
                style={{
                  background: "#fffbf5",
                  border: "2.5px solid #5a4a3a",
                  borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
                  overflow: "hidden",
                  boxShadow: "3px 3px 0 rgba(90,74,58,0.06)",
                  position: "relative",
                }}
              >
                {/* 缩略图预览 */}
                <div
                  onClick={() => navigate(`/editor/${artwork.templateId}`)}
                  style={{
                    height: 150,
                    background: "#fefcf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    overflow: "hidden",
                  }}
                >
                  {artwork.thumbnail ? (
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.templateName ?? "作品"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    /* 无缩略图时展示调色板色块 */
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        justifyContent: "center",
                        padding: 16,
                      }}
                    >
                      {artwork.palette.slice(0, 6).map((c, ci) => (
                        <div
                          key={ci}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: c,
                            border: "1.5px solid rgba(0,0,0,0.1)",
                          }}
                        />
                      ))}
                      {artwork.palette.length === 0 && (
                        <span style={{ color: "#c8b8a8", fontSize: 12 }}>
                          点击继续创作
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 信息栏 */}
                <div
                  style={{
                    padding: "8px 10px 10px",
                    borderTop: "2px dashed #d8c8b8",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 13,
                      color: "#3a322a",
                      marginBottom: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {artwork.templateName ?? artwork.templateId}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#8a7a6a" }}>
                      {formatDate(artwork.updatedAt ?? artwork.createdAt)}
                    </span>
                    {/* 删除按钮 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(artwork.id);
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        padding: "2px 4px",
                        color: "#c8b8a8",
                        fontSize: 16,
                        lineHeight: 1,
                        WebkitTapHighlightColor: "transparent",
                      }}
                      aria-label="删除作品"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 删除确认弹窗 */}
      {confirmId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setConfirmId(null)}
        >
          <div
            style={{
              background: "#fffbf5",
              border: "2.5px solid #3a322a",
              borderRadius: "16px 4px 16px 4px",
              padding: "24px 28px",
              textAlign: "center",
              boxShadow: "4px 4px 0 rgba(58,50,42,0.15)",
              maxWidth: 280,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#3a322a",
                marginBottom: 8,
              }}
            >
              删除作品？
            </p>
            <p style={{ fontSize: 13, color: "#8a7a6a", marginBottom: 20 }}>
              删除后无法恢复
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  padding: "8px 20px",
                  border: "2px solid #c8b8a8",
                  borderRadius: "8px 3px 8px 3px",
                  background: "#fff",
                  color: "#5a4a3a",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  remove(confirmId);
                  setConfirmId(null);
                }}
                style={{
                  padding: "8px 20px",
                  border: "2px solid #3a322a",
                  borderRadius: "8px 3px 8px 3px",
                  background: "#e8785a",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />

      <style>{`
        @keyframes cardIn {
          0% { opacity: 0; transform: scale(0.88) translateY(8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
