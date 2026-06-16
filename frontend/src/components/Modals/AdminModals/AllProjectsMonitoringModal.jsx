import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  APM_PROJECT_TYPES,
  EMPTY_RECORD_FORM,
  createAllProjectsMonitoringRecord,
  recordToForm,
  updateAllProjectsMonitoringRecord,
} from "../../../utils/allProjectsMonitoring";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const SECTIONS = [
  { id: "project", label: "1. Project", accent: "border-emerald-500 bg-emerald-50 text-emerald-800" },
  { id: "extension", label: "2. Extension", accent: "border-teal-500 bg-teal-50 text-teal-800" },
  { id: "interventions", label: "3. Interventions", accent: "border-indigo-500 bg-indigo-50 text-indigo-800" },
  { id: "documents", label: "4. Documents", accent: "border-blue-500 bg-blue-50 text-blue-800" },
  { id: "status", label: "5. Status", accent: "border-amber-500 bg-amber-50 text-amber-800" },
  { id: "references", label: "6. References", accent: "border-slate-500 bg-slate-50 text-slate-800" },
];

const SectionCard = ({ id, step, title, hint, accent, children }) => (
  <section
    id={`apm-section-${id}`}
    className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
  >
    <div className={`border-l-4 px-4 py-3 ${accent}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
        Step {step}
      </p>
      <h3 className="text-sm font-bold">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs opacity-80">{hint}</p> : null}
    </div>
    <div className="space-y-3 p-4">{children}</div>
  </section>
);

const Field = ({ label, htmlFor, children, className = "" }) => (
  <div className={className}>
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-slate-700">
      {label}
    </label>
    {children}
  </div>
);

const CheckField = ({ label, checked, onChange, className = "" }) => (
  <label
    className={`flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white ${className}`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
    />
    <span className="leading-snug">{label}</span>
  </label>
);

const AllProjectsMonitoringModal = ({ isOpen, onClose, onSuccess, record, defaultProjectType = null }) => {
  const isEdit = Boolean(record?.id);
  // Hide project_no for SSCP — both when adding (defaultProjectType) and editing (record.project_type)
  const isSSCP =
    defaultProjectType === "SSCP" || record?.project_type === "SSCP";
  const [form, setForm] = useState(EMPTY_RECORD_FORM);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const base = recordToForm(record);
    if (!record?.id && defaultProjectType) {
      setForm({ ...base, project_type: defaultProjectType });
      return;
    }
    setForm(base);
  }, [isOpen, record, defaultProjectType]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setChecked = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));

  const setExtensionMonth = (field) => (e) =>
    setForm((prev) => ({
      ...prev,
      [field]: e.target.value ? `${e.target.value}-01` : "",
    }));

  const scrollToSection = (id) => {
    const el = scrollRef.current?.querySelector(`#apm-section-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClose = () => {
    if (loading) return;
    setForm(EMPTY_RECORD_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!form.project_title.trim()) {
      toast.error("Project title is required.");
      scrollToSection("project");
      return;
    }

    setLoading(true);
    const { data, error } = isEdit
      ? await updateAllProjectsMonitoringRecord(record.id, form)
      : await createAllProjectsMonitoringRecord(form);
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEdit ? "Record updated." : "Record added.");
    setForm(EMPTY_RECORD_FORM);
    onSuccess(data);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-projects-monitoring-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2
            id="all-projects-monitoring-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            {isEdit ? "Edit project record" : "Add project record"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Sunod-sunod ang fields tulad ng spreadsheet. Gamitin ang mga section sa ibaba para
            mabilis lumipat.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:opacity-90 ${section.accent}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-100/60 px-6 py-5">
            <SectionCard
              id="project"
              step={1}
              title="Project details"
              hint="Columns A–I ng spreadsheet"
              accent="border-emerald-500 bg-emerald-50 text-emerald-900"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {!isSSCP && (
                  <Field label="No (ex. MAR-GIA - 072)" htmlFor="apm-project-no">
                    <input
                      id="apm-project-no"
                      type="text"
                      value={form.project_no}
                      onChange={setField("project_no")}
                      placeholder="MAR-GIA - 072"
                      className={inputClass}
                    />
                  </Field>
                )}
                <Field label="Year" htmlFor="apm-year" className={isSSCP ? "sm:col-span-2" : ""}>
                  <input
                    id="apm-year"
                    type="number"
                    min="2000"
                    max="2100"
                    value={form.year}
                    onChange={setField("year")}
                    placeholder="2026"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Municipality" htmlFor="apm-municipality">
                  <select
                    id="apm-municipality"
                    value={form.municipality}
                    onChange={setField("municipality")}
                    className={inputClass}
                  >
                    <option value="">— Select municipality —</option>
                    <option value="Boac">Boac</option>
                    <option value="Gasan">Gasan</option>
                    <option value="Buenavista">Buenavista</option>
                    <option value="Torrijos">Torrijos</option>
                    <option value="Sta. Cruz">Sta. Cruz</option>
                    <option value="Mogpog">Mogpog</option>
                  </select>
                </Field>
                <Field label="Type of project" htmlFor="apm-project-type">
                  <select
                    id="apm-project-type"
                    value={form.project_type}
                    onChange={setField("project_type")}
                    className={inputClass}
                  >
                    <option value="">— Select —</option>
                    {APM_PROJECT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="FIRM" htmlFor="apm-firm">
                <input
                  id="apm-firm"
                  type="text"
                  value={form.firm}
                  onChange={setField("firm")}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Total Amount" htmlFor="apm-total-amount">
                  <input
                    id="apm-total-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.total_amount}
                    onChange={setField("total_amount")}
                    className={inputClass}
                  />
                </Field>
                <Field label="Downloaded Funds to Beneficiary" htmlFor="apm-downloaded">
                  <input
                    id="apm-downloaded"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.downloaded_funds_to_beneficiary}
                    onChange={setField("downloaded_funds_to_beneficiary")}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Project Title" htmlFor="apm-title">
                <input
                  id="apm-title"
                  type="text"
                  value={form.project_title}
                  onChange={setField("project_title")}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Proponent" htmlFor="apm-proponent">
                <input
                  id="apm-proponent"
                  type="text"
                  value={form.proponent}
                  onChange={setField("proponent")}
                  className={inputClass}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start date (Day / Month / Year)" htmlFor="apm-start">
                  <input
                    id="apm-start"
                    type="date"
                    value={form.start_date}
                    onChange={setField("start_date")}
                    className={inputClass}
                  />
                </Field>
                <Field label="End date (Day / Month / Year)" htmlFor="apm-end">
                  <input
                    id="apm-end"
                    type="date"
                    value={form.end_date}
                    onChange={setField("end_date")}
                    className={inputClass}
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              id="extension"
              step={2}
              title="Extension & realignment"
              hint="Extension request, extension date, at realignment checks"
              accent="border-teal-500 bg-teal-50 text-teal-900"
            >
              <Field
                label="Request for EXTENSION 3 MONTHS b4 deadline (Month / Year)"
                htmlFor="apm-extension-request"
              >
                <input
                  id="apm-extension-request"
                  type="month"
                  value={
                    form.extension_request_3mo ? form.extension_request_3mo.slice(0, 7) : ""
                  }
                  onChange={setExtensionMonth("extension_request_3mo")}
                  className={inputClass}
                />
              </Field>

              <Field label="Extension date Month / Year" htmlFor="apm-extension">
                <input
                  id="apm-extension"
                  type="month"
                  value={form.extension_date ? form.extension_date.slice(0, 7) : ""}
                  onChange={setExtensionMonth("extension_date")}
                  className={inputClass}
                />
              </Field>

              <div className="rounded-lg border border-dashed border-teal-200 bg-teal-50/40 p-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">
                  With Approved Request for Realignment
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <CheckField
                    label="1st"
                    checked={form.realignment_1st}
                    onChange={setChecked("realignment_1st")}
                  />
                  <CheckField
                    label="2nd"
                    checked={form.realignment_2nd}
                    onChange={setChecked("realignment_2nd")}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="interventions"
              step={3}
              title="Interventions"
              hint="Equipment, MOOE, Trainings, Consultancy, P&L, LAB / Others"
              accent="border-indigo-500 bg-indigo-50 text-indigo-900"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckField
                  label="Equipment"
                  checked={form.intervention_equipment}
                  onChange={setChecked("intervention_equipment")}
                />
                <CheckField
                  label="MOOE"
                  checked={form.intervention_mooe}
                  onChange={setChecked("intervention_mooe")}
                />
                <CheckField
                  label="Trainings"
                  checked={form.intervention_trainings}
                  onChange={setChecked("intervention_trainings")}
                />
                <CheckField
                  label="Consultancy"
                  checked={form.intervention_consultancy}
                  onChange={setChecked("intervention_consultancy")}
                />
                <CheckField
                  label="P&L"
                  checked={form.intervention_pl}
                  onChange={setChecked("intervention_pl")}
                />
                <CheckField
                  label="LAB / Others"
                  checked={form.intervention_lab_others}
                  onChange={setChecked("intervention_lab_others")}
                />
              </div>
            </SectionCard>

            <SectionCard
              id="documents"
              step={4}
              title="Liquidation & documents"
              hint="Liquidation, received/approved, LDDAP, MOA, RTEC, Cash Program"
              accent="border-blue-500 bg-blue-50 text-blue-900"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckField
                  label="Liquidation (PSTO record)"
                  checked={form.liquidation_psto}
                  onChange={setChecked("liquidation_psto")}
                />
                <CheckField
                  label="Received / Approved"
                  checked={form.received_approved}
                  onChange={setChecked("received_approved")}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="LDDAP (date)" htmlFor="apm-lddap">
                  <input
                    id="apm-lddap"
                    type="date"
                    value={form.lddap_date}
                    onChange={setField("lddap_date")}
                    className={inputClass}
                  />
                </Field>
                <Field label="MOA (date)" htmlFor="apm-moa">
                  <input
                    id="apm-moa"
                    type="date"
                    value={form.moa_date}
                    onChange={setField("moa_date")}
                    className={inputClass}
                  />
                </Field>
                <Field label="RTEC (date)" htmlFor="apm-rtec">
                  <input
                    id="apm-rtec"
                    type="date"
                    value={form.rtec_date}
                    onChange={setField("rtec_date")}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Cash Program" htmlFor="apm-cash">
                <input
                  id="apm-cash"
                  type="text"
                  value={form.cash_program}
                  onChange={setField("cash_program")}
                  className={inputClass}
                />
              </Field>
            </SectionCard>

            <SectionCard
              id="status"
              step={5}
              title="Status reports & completion"
              hint="Status reports, completed, terminated, at iba pang completion flags"
              accent="border-amber-500 bg-amber-50 text-amber-900"
            >
              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Status reports
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <CheckField
                    label="1st Status Report"
                    checked={form.status_report_1st}
                    onChange={setChecked("status_report_1st")}
                  />
                  <CheckField
                    label="2nd Status Report"
                    checked={form.status_report_2nd}
                    onChange={setChecked("status_report_2nd")}
                  />
                  <CheckField
                    label="Terminal Report"
                    checked={form.terminal_report}
                    onChange={setChecked("terminal_report")}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/40 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
                  Completion status
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <CheckField
                    label="Completed"
                    checked={form.completed}
                    onChange={setChecked("completed")}
                  />
                  <CheckField
                    label="Terminated"
                    checked={form.terminated}
                    onChange={setChecked("terminated")}
                  />
                  <CheckField
                    label="Condonation"
                    checked={form.condonation}
                    onChange={setChecked("condonation")}
                  />
                  <CheckField
                    label="With Letter of Extension"
                    checked={form.with_letter_of_extension}
                    onChange={setChecked("with_letter_of_extension")}
                  />
                  <CheckField
                    label="Donated"
                    checked={form.donated}
                    onChange={setChecked("donated")}
                  />
                  <CheckField
                    label="Impact Assessment"
                    checked={form.impact_assessment}
                    onChange={setChecked("impact_assessment")}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="references"
              step={6}
              title="References & links"
              hint="PAR, PTR, Remarks, COO, Google Drive"
              accent="border-slate-500 bg-slate-50 text-slate-900"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="PAR No." htmlFor="apm-par">
                  <input
                    id="apm-par"
                    type="text"
                    value={form.par_no}
                    onChange={setField("par_no")}
                    className={inputClass}
                  />
                </Field>
                <Field label="PTR No." htmlFor="apm-ptr">
                  <input
                    id="apm-ptr"
                    type="text"
                    value={form.ptr_no}
                    onChange={setField("ptr_no")}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field label="Remarks" htmlFor="apm-remarks">
                <textarea
                  id="apm-remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={setField("remarks")}
                  className={inputClass}
                />
              </Field>

              <CheckField
                label="With COO"
                checked={form.with_coo}
                onChange={setChecked("with_coo")}
              />

              <Field label="GOOGLE DRIVE (links)" htmlFor="apm-drive">
                <textarea
                  id="apm-drive"
                  rows={2}
                  value={form.google_drive_links}
                  onChange={setField("google_drive_links")}
                  placeholder="https://drive.google.com/..."
                  className={inputClass}
                />
              </Field>
            </SectionCard>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving…" : isEdit ? "Save changes" : "Add record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AllProjectsMonitoringModal;
