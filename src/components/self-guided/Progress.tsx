import { STOPS } from "../../data/self-guided/left-bank-ww2";
import type { Phase } from "./state";

interface Props {
  phase: Phase;
  idx: number;
  completed: number;
}

/** 9 segments: main stops flex 3, others flex 1. Done = red, current = gold, upcoming = hairline. */
export default function Progress({ phase, idx, completed }: Props) {
  return (
    <div className="ag-progress" role="progressbar" aria-valuemin={0} aria-valuemax={STOPS.length} aria-valuenow={phase === "complete" ? STOPS.length : completed}>
      {STOPS.map((s, i) => {
        const state = phase === "complete" || i < completed ? "done" : i === idx ? "current" : "";
        const cls = ["ag-progress__seg", s.kind === "stop" ? "ag-progress__seg--main" : "ag-progress__seg--inter", state ? `ag-progress__seg--${state}` : ""].join(" ");
        return <span key={s.sectionId} className={cls} />;
      })}
    </div>
  );
}
