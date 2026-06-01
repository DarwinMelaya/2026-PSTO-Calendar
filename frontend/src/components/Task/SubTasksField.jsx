import { emptySubTask } from "../../utils/task";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const SubTasksField = ({ subTasks, onChange, disabled = false }) => {
  const items = subTasks?.length ? subTasks : [emptySubTask()];

  const updateItem = (index, field, value) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item,
    );
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, emptySubTask()]);
  };

  const removeItem = (index) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [emptySubTask()]);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sub-task {index + 1}
            </p>
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={disabled}
                className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            type="text"
            value={item.title}
            onChange={(e) => updateItem(index, "title", e.target.value)}
            disabled={disabled}
            placeholder="Sub-task title"
            className={inputClass}
          />
          <textarea
            rows={2}
            value={item.remarks}
            onChange={(e) => updateItem(index, "remarks", e.target.value)}
            disabled={disabled}
            placeholder="Remarks for this sub-task"
            className={inputClass}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300 hover:bg-blue-50/50 disabled:opacity-50"
      >
        + Add sub-task
      </button>
    </div>
  );
};

export default SubTasksField;
