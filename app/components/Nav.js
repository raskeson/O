"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "植物圖鑑" },
  { href: "/fields", label: "場域管理" },
  { href: "/finance", label: "財務總帳" },
  { href: "/inventory", label: "資材/肥料" },
  { href: "/compost", label: "堆肥監測" },
  { href: "/custody", label: "出差託管" },
  { href: "/settings", label: "系統設定" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="bg-leaf-700 text-white sticky top-0 z-30 shadow">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
        <span className="font-bold text-lg mr-4 whitespace-nowrap">🌿 植物照護系統</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
              pathname === l.href ? "bg-white text-leaf-800 font-semibold" : "hover:bg-leaf-600"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
