import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Gallery from "./pages/Gallery";

export const router = createBrowserRouter(
  [
    { path: "/", element: <Home /> },
    { path: "/editor/:id", element: <Editor /> },
    { path: "/gallery", element: <Gallery /> },
  ],
  {
    // GitHub Pages 使用 /drawer/ 子路径，需要与 Vite base 保持一致
    basename: import.meta.env.BASE_URL,
  },
);
