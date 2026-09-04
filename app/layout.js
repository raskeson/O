import "./globals.css";
import Nav from "@/components/Nav";

export const metadata = {
  title: "植物照護管理系統",
  description: "個人植物收藏、照護、財務與堆肥管理系統",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>
        <Nav />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
