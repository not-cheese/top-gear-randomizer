import { Route, Routes } from "react-router-dom";
import { useApp } from "./state/hooks.js";
import Layout from "./components/common/Layout.jsx";
import SpinPage from "./pages/SpinPage.jsx";
import CollectionsPage from "./pages/CollectionsPage.jsx";
import CollectionDetailPage from "./pages/CollectionDetailPage.jsx";
import WatchedPage from "./pages/WatchedPage.jsx";
import DataPage from "./pages/DataPage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

export default function App() {
  const { status, error } = useApp();

  if (status === "loading") return <p className="placeholder" style={{ margin: "2rem" }}>Loading…</p>;
  if (status === "error") {
    return (
      <p className="placeholder" style={{ margin: "2rem" }}>
        Could not open local storage: {String(error?.message ?? error)}
      </p>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SpinPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:id" element={<CollectionDetailPage />} />
        <Route path="watched" element={<WatchedPage />} />
        <Route path="data" element={<DataPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
