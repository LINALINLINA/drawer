import { createBrowserRouter } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Gallery from "./pages/Gallery";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/editor/:id", element: <Editor /> },
  { path: "/gallery", element: <Gallery /> },
]);
