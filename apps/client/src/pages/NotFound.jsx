import React from "react";
import { Link } from "react-router-dom";
import PageTransition from "../components/PageTransition";

export default function NotFound() {
  return (
    <PageTransition>
      <section className="px-6 py-32 text-center">
        <h1 className="font-display italic text-4xl sm:text-5xl font-black tracking-tight mb-4">This piece doesn't exist.</h1>
        <p className="opacity-60 mb-8">The page you're looking for has been taken down or never existed.</p>
        <Link to="/" className="inline-block px-6 py-3 rounded-full text-xs font-semibold tracking-wider uppercase bg-black text-white">
          Return to Collection
        </Link>
      </section>
    </PageTransition>
  );
}
