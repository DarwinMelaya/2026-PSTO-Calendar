const PriorityBadge = ({ className = "" }) => (
  <span
    className={`inline-flex w-fit items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800 ring-1 ring-inset ring-rose-600/15 ${className}`}
  >
    Priority
  </span>
);

export default PriorityBadge;
