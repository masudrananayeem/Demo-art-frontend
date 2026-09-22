import React from "react";
import { Star } from "lucide-react";

export default function Stars({ rating, reviews }) {
  return (
    <div className="flex items-center gap-1 text-[11px] text-current/70">
      <Star size={12} className="fill-amber-500 text-amber-500" />
      <span>{rating}</span>
      {reviews && <span className="opacity-50">({reviews})</span>}
    </div>
  );
}
