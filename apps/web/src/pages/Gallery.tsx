import { useNavigate } from "react-router-dom";
import { useArtworks } from "../hooks/useArtworks";
import BottomNav from "../components/BottomNav";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${mins}`;
}

export default function Gallery() {
  const { artworks, remove } = useArtworks();
  const navigate = useNavigate();

  return (
    <div style={{ paddingBottom: 72 }}>
      <header style={{ padding: "16px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>我的作品</h1>
      </header>

      {artworks.length === 0 ? (
        <p style={{ textAlign: "center", color: "#999", marginTop: 60 }}>
          还没有作品，去首页选一个模板开始创作吧
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: 16,
          }}
        >
          {artworks.map((artwork) => (
            <div
              key={artwork.id}
              onClick={() => navigate(`/editor/${artwork.templateId}`)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (confirm("删除这个作品？")) remove(artwork.id);
              }}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                overflow: "hidden",
                cursor: "pointer",
                background: "#fff",
              }}
            >
              <div
                style={{
                  height: 140,
                  background: "#f5f5f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {artwork.palette.length > 0 ? (
                  <div style={{ display: "flex", gap: 4 }}>
                    {artwork.palette.slice(0, 5).map((c, i) => (
                      <div
                        key={i}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: c,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <span style={{ color: "#999", fontSize: 12 }}>无预览</span>
                )}
              </div>
              <div style={{ padding: "8px 12px", fontSize: 13, color: "#666" }}>
                {formatDate(artwork.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
