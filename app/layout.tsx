import "./globals.css";
import { Navbar } from "@/components/roast/navbar";
import { Footer } from "@/components/roast/footer";

export const metadata = {
  title: "Roast My Repo",
  description: "Paste a repo. Get graded. Try not to cry.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
