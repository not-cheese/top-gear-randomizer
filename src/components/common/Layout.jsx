import { NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Spin", end: true },
  { to: "/collections", label: "Collections" },
  { to: "/watched", label: "Watched" },
  { to: "/data", label: "Data" },
];

export default function Layout() {
  return (
    <>
      <header className="app-header">
        <div className="app-title">
          Top Gear <span>Randomizer</span>
        </div>
        <nav className="app-nav" aria-label="Main">
          {LINKS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
