import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();
  const path = location.pathname;

  const isActive = (route) => path === route;

  return (
    <header className="flex gap-12 items-center px-20 py-6 border-b border-[#eee] bg-[#e9f6ff]">
      <Link
        to="/"
        className="text-2xl font-bold text-[#9b9fa2] tracking-tight no-underline font-['Inter']"
      >
        OurOffice
      </Link>

      <nav className="flex gap-8 mr-auto">
        {[
          { to: "/", label: "Home" },
          { to: "/about", label: "About us" },
          { to: "/blog", label: "Blog" },
          { to: "/pricing", label: "Pricing" },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className={`relative pb-2 font-semibold no-underline transition-colors duration-200
                        after:absolute after:bottom-[-4px] after:left-0 after:h-[3px]
                        after:bg-[#0e865a] after:transition-all after:duration-200
                        ${
                          isActive(to)
                            ? "text-[#0e865a] after:w-full"
                            : "text-black after:w-0 hover:text-[#0e865a] hover:after:w-full"
                        }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Sign In Button */}
      <Link
        to="/login"
        className={`px-6 py-2 font-semibold rounded-lg border-2 transition-all duration-200
                    ${
                      isActive("/login")
                        ? "bg-[#0e865a] text-white border-[#0e865a]"
                        : "text-[#0e865a] border-[#0e865a] hover:bg-[#0e865a] hover:text-white"
                    }`}
      >
        Sign In
      </Link>
    </header>
  );
}
