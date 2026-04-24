import { useNavigate } from "react-router-dom";
import type { Template } from "@drawer/template-engine";

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

export default function TemplateCard({
  template,
  index,
}: {
  template: Template;
  index: number;
}) {
  const navigate = useNavigate();
  const diff = template.difficulty ?? "medium";
  const rotation = index % 2 === 0 ? -1.5 : 1.5;

  return (
    <div
      style={{
        cursor: "pointer",
        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        transform: `rotate(${rotation}deg)`,
        opacity: 0,
        animation: `cardIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) ${index * 0.06}s forwards`,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
      onClick={() => navigate(`/editor/${template.id}`)}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "scale(0.96)";
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform =
          `rotate(${rotation}deg)`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform =
          `rotate(${rotation}deg)`;
      }}
    >
      <div
        style={{
          background: "#fffbf5",
          border: "2.5px solid #5a4a3a",
          borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px",
          overflow: "hidden",
          boxShadow: "3px 3px 0 rgba(90,74,58,0.06)",
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
          <svg
            width="100%"
            height="100%"
            viewBox={
              template.viewBox
                ? `${template.viewBox.x} ${template.viewBox.y} ${template.viewBox.w} ${template.viewBox.h}`
                : "0 0 400 400"
            }
            preserveAspectRatio="xMidYMid meet"
            style={{ background: "#ffffff" }}
          >
            {template.outlineImage ? (
              /* 有轮廓 PNG：multiply 叠加原始线条，视觉清晰 */
              <image
                href={`/templates/${template.outlineImage}`}
                x={template.viewBox?.x ?? 0}
                y={template.viewBox?.y ?? 0}
                width={template.viewBox?.w ?? 400}
                height={template.viewBox?.h ?? 400}
                style={{ mixBlendMode: "multiply" } as React.CSSProperties}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              /* 无轮廓 PNG（手工/SVG 模板）：用各 region 描边展示 */
              template.regions.map((r) => (
                <path
                  key={r.id}
                  d={r.path}
                  fill="none"
                  stroke="#5a4a3a"
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
              ))
            )}
          </svg>
        </div>
        <div
          style={{
            padding: "10px 14px",
            borderTop: "2px dashed #8a7a6a",
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
            {template.name ?? template.id}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "#fff",
              background: difficultyColor[diff] ?? "#f7c948",
              padding: "2px 8px",
              borderRadius: "10px 4px 10px 4px",
            }}
          >
            {difficultyLabel[diff] ?? "中等"}
          </span>
        </div>
      </div>
      <style>{`
        @keyframes cardIn {
          0% { opacity: 0; transform: scale(0.85) rotate(-2deg); }
          70% { transform: scale(1.03) rotate(0.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
