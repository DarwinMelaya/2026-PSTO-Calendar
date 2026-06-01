import React, { forwardRef, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const CustomInput = forwardRef(({ value, onClick }, ref) => {
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-left text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
    >
      {value || "Select time"}
    </button>
  );
});
CustomInput.displayName = "CustomInput";

// value format: "HH:MM" (24h) or "".
function toDate(value) {
  if (!value) return null;
  const str = String(value);
  const [hh, mm] = str.split(":");
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function formatValue(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DeadlineTimePicker = ({ value, onChange }) => {
  const selected = useMemo(() => toDate(value), [value]);

  return (
    <DatePicker
      selected={selected}
      onChange={(d) => onChange(formatValue(d))}
      showTimeSelectOnly
      showTimeSelect
      timeIntervals={30}
      timeCaption="Time"
      dateFormat="h:mm aa"
      timeFormat="h:mm aa"
      customInput={<CustomInput />}
      placeholderText="Select time"
    />
  );
};

export default DeadlineTimePicker;

