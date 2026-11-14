import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <>
      <h1 className="page-title">Page not found</h1>
      <p className="page-sub">
        That page doesn't exist. <Link to="/">Back to the wheel</Link>
      </p>
    </>
  );
}
