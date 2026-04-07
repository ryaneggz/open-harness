import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { QuickStart } from "@/components/landing/quick-start";
import { TechStack } from "@/components/landing/tech-stack";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <Hero />
            <QuickStart />
          </div>
        </section>
        <Features />
        <TechStack />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
