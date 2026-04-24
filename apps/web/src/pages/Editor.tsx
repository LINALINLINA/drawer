import { useParams } from "react-router-dom";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  return (
    <div style={{ padding: 16 }}>
      <p>编辑器 - 模板: {id}</p>
    </div>
  );
}
