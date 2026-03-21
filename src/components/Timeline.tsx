import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import "./../styles/timeline.css";

export default function Timeline({
  stops,
}: {
  stops: { title: string; description: string; img: string }[];
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "0px 0px -10% 0px", amount: 0.1 });

  return (
    <ul ref={ref} className="relative pl-6">
      {stops.map((s, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ delay: i * 0.15 }}
          className={`mb-16 relative ${
            i % 2 === 0 ? "timeline-left" : "timeline-right"
          }`}
        >
          <span className="absolute -left-[9px] top-1 w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-bold">
            {i + 1}
          </span>
          <div className="content bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-semibold text-lg">{s.title}</h3>
            <p className="mb-3 text-sm text-gray-500">{s.description}</p>
            <img
              className="rounded-lg aspect-video object-cover transition-transform duration-300 hover:scale-105"
              src={s.img}
              alt=""
            />
          </div>
        </motion.li>
      ))}
    </ul>
  );
}
