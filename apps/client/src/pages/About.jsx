import React from "react";
import { Sparkles, Leaf, ShieldCheck, Globe } from "lucide-react";
import PageTransition from "../components/PageTransition";
import Reveal, { Stagger, StaggerItem } from "../components/Reveal";
import { useStore } from "../context/StoreContext";

// Local image
import aboutStudio from "../assets/about-studio.jpg";

const VALUES = [
  [
    Sparkles,
    "Quality First",
    "We never compromise on the quality of our pieces or our process.",
  ],
  [
    Leaf,
    "Sustainable",
    "Committed to eco-friendly practices and sustainable sourcing.",
  ],
  [
    ShieldCheck,
    "Secure",
    "Your data and transactions are protected end to end.",
  ],
  [
    Globe,
    "Accessible",
    "Designed to be inclusive and easy to use for everyone, everywhere.",
  ],
];

export default function About() {
  const { dark } = useStore();

  return (
    <PageTransition>
      {/* =========================
          INTRO / HERO
      ========================== */}
      <section className="px-6 pt-14 pb-16 text-center">
        <Reveal>
          <p className="text-xs tracking-[0.25em] uppercase opacity-50 mb-4">
            Est. 2026 · Studio Made
          </p>

          <h1 className="font-display italic text-4xl sm:text-6xl font-black tracking-tight mb-6">
            Redefining Modern Commerce
          </h1>

          <p className="max-w-2xl mx-auto opacity-70">
            ArtCanvas is a studio destination for wearable art and curated
            objects. We blend aesthetic design with honest craft to bring you
            pieces worth keeping.
          </p>
        </Reveal>
      </section>

      {/* =========================
          OUR STORY
      ========================== */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          
          {/* LOCAL IMAGE */}
          <Reveal className="rounded-2xl overflow-hidden aspect-[4/3]">
            <img
              src={aboutStudio}
              alt="ArtCanvas Studio"
              className="w-full h-full object-cover block"
              style={{
                filter: "none",
                mixBlendMode: "normal",
                opacity: 1,
              }}
            />
          </Reveal>

          {/* STORY CONTENT */}
          <Reveal delay={0.1}>
            <h2 className="font-display italic text-3xl font-black tracking-tight mb-4">
              Our Story
            </h2>

            <p className="opacity-75 leading-relaxed mb-4 text-sm">
              Born from a vision to simplify how art and fashion reach people,
              without compromising on craft. ArtCanvas started as a small
              studio project and grew into a place that connects makers with
              people who care about what they wear and keep.
            </p>

            <p className="opacity-75 leading-relaxed text-sm">
              Every piece tells a story, and every purchase supports an
              independent maker. That's why we keep our runs small, numbered,
              and honest about materials.
            </p>
          </Reveal>
        </div>
      </section>

      {/* =========================
          CORE VALUES
      ========================== */}
      <section
        className={`px-6 py-20 ${
          dark ? "bg-white/5" : "bg-black text-white"
        }`}
      >
        <div className="max-w-6xl mx-auto text-center">
          <Reveal>
            <h2 className="font-display italic text-3xl font-black tracking-tight mb-2">
              Core Values
            </h2>

            <p className="opacity-60 mb-12">
              The principles that guide everything we build and curate.
            </p>
          </Reveal>

          <Stagger className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
            {VALUES.map(([Icon, title, desc], i) => (
              <StaggerItem key={i}>
                <div
                  className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                    dark ? "bg-white/10" : "bg-white/10"
                  }`}
                >
                  <Icon size={22} />
                </div>

                <p className="font-semibold mb-2">
                  {title}
                </p>

                <p className="text-sm opacity-60">
                  {desc}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
    </PageTransition>
  );
}