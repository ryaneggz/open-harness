import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { QuickStart } from "@/components/landing/quick-start";
import { TechStack } from "@/components/landing/tech-stack";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <QuickStart />
        <Features />
        <TechStack />
      </main>
      <Footer />
    </>
  );
}
