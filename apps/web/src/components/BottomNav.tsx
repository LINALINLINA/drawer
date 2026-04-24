import { useNavigate, useLocation } from "react-router-dom";

const tabs = [
  {
    path: "/",
    label: "首页",
    icon: (
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
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
    ),
  },
  {
    path: "/gallery",
    label: "作品",
    icon: (
      <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
        <ellipse
          cx="14"
          cy="15"
          rx="11"
          ry="10"
          stroke="#3a322a"
          strokeWidth="1.8"
          strokeDasharray="4 2"
          transform="rotate(-5 14 15)"
        />
        <circle
          cx="9"
          cy="12"
          r="2.5"
          fill="#e8785a"
          stroke="#3a322a"
          strokeWidth="1"
        />
        <circle
          cx="15"
          cy="10"
          r="2"
          fill="#f7c948"
          stroke="#3a322a"
          strokeWidth="1"
        />
        <circle
          cx="19"
          cy="14"
          r="2.5"
          fill="#7fb685"
          stroke="#3a322a"
          strokeWidth="1"
        />
        <circle
          cx="14"
          cy="17"
          r="2"
          fill="#7ec8d8"
          stroke="#3a322a"
          strokeWidth="1"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "stretch",
        height: 60,
        background: "#fffbf5",
        paddingBottom: "env(safe-area-inset-bottom)",
        zIndex: 100,
        borderTop: "none",
      }}
    >
      {/* 手绘波浪顶边 */}
      <svg
        style={{
          position: "absolute",
          top: -6,
          left: 0,
          width: "100%",
          height: 8,
          pointerEvents: "none",
        }}
        viewBox="0 0 400 8"
        preserveAspectRatio="none"
      >
        <path
          d="M0 6Q25 1 50 5T100 4T150 6T200 3T250 5T300 4T350 6T400 3"
          stroke="#5a4a3a"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray="6 3"
        />
      </svg>

      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              cursor: "pointer",
              position: "relative",
              minHeight: 48,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              transition:
                "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
            onTouchStart={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(0.92)";
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "scale(1)";
            }}
          >
            <div
              style={{
                opacity: active ? 1 : 0.5,
                transition: "opacity 0.2s",
                transform: active ? "scale(1.1)" : "scale(1)",
                transitionProperty: "opacity, transform",
              }}
            >
              {tab.icon}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? "#3a322a" : "#8a7a6a",
                letterSpacing: 0.5,
              }}
            >
              {tab.label}
            </span>
            {active && (
              <svg
                style={{
                  position: "absolute",
                  bottom: 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 28,
                  height: 6,
                }}
                viewBox="0 0 28 6"
              >
                <path
                  d="M2 4Q7 1 14 3Q21 5 26 2"
                  stroke="#e8785a"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </nav>
  );
}
