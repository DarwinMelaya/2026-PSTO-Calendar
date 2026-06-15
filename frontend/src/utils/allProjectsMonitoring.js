import supabase from "./supabaseClient";

export const APM_PROJECT_TYPES = [
  { value: "GIA", label: "GIA" },
  { value: "SETUP", label: "SETUP" },
  { value: "CEST", label: "CEST" },
  { value: "SSCP", label: "SSCP" },
];

export const apmProjectTypeLabel = (value) =>
  APM_PROJECT_TYPES.find((p) => p.value === value)?.label ?? value ?? "—";

/** MIMAROPA municipalities grouped by province (for dropdown). */
export const APM_MUNICIPALITY_GROUPS = [
  {
    province: "Marinduque",
    municipalities: [
      "Boac",
      "Buenavista",
      "Gasan",
      "Mogpog",
      "Santa Cruz",
      "Torrijos",
    ],
  },
  {
    province: "Occidental Mindoro",
    municipalities: [
      "Abra de Ilog",
      "Calintaan",
      "Looc",
      "Lubang",
      "Magsaysay",
      "Mamburao",
      "Paluan",
      "Rizal",
      "Sablayan",
      "San Jose",
      "Santa Cruz",
    ],
  },
  {
    province: "Oriental Mindoro",
    municipalities: [
      "Baco",
      "Bansud",
      "Bongabong",
      "Bulalacao",
      "Calapan",
      "Gloria",
      "Mansalay",
      "Naujan",
      "Pinamalayan",
      "Pola",
      "Puerto Galera",
      "Roxas",
      "San Teodoro",
      "Socorro",
      "Victoria",
    ],
  },
  {
    province: "Palawan",
    municipalities: [
      "Aborlan",
      "Agutaya",
      "Araceli",
      "Balabac",
      "Bataraza",
      "Brooke's Point",
      "Busuanga",
      "Cagayancillo",
      "Coron",
      "Culion",
      "Cuyo",
      "Dumaran",
      "El Nido",
      "Kalayaan",
      "Linapacan",
      "Magsaysay",
      "Narra",
      "Puerto Princesa",
      "Quezon",
      "Rizal",
      "Roxas",
      "San Vicente",
      "Sofronio Española",
      "Taytay",
    ],
  },
  {
    province: "Romblon",
    municipalities: [
      "Alcantara",
      "Banton",
      "Cajidiocan",
      "Calatrava",
      "Concepcion",
      "Corcuera",
      "Ferrol",
      "Looc",
      "Magdiwang",
      "Odiongan",
      "Romblon",
      "San Agustin",
      "San Andres",
      "San Fernando",
      "San Jose",
      "Santa Fe",
      "Santa Maria",
    ],
  },
];

export const apmMunicipalityLabel = (value) => value?.trim() || "—";

export const BOOLEAN_FIELDS = [
  "realignment_1st",
  "realignment_2nd",
  "intervention_equipment",
  "intervention_mooe",
  "intervention_trainings",
  "intervention_consultancy",
  "intervention_pl",
  "intervention_lab_others",
  "liquidation_psto",
  "received_approved",
  "status_report_1st",
  "status_report_2nd",
  "terminal_report",
  "completed",
  "terminated",
  "condonation",
  "with_letter_of_extension",
  "donated",
  "impact_assessment",
  "with_coo",
];

export const DATE_FIELDS = [
  "start_date",
  "end_date",
  "extension_request_3mo",
  "extension_date",
  "lddap_date",
  "moa_date",
  "rtec_date",
];

export const EMPTY_RECORD_FORM = {
  project_no: "",
  year: "",
  municipality: "",
  project_type: "",
  firm: "",
  total_amount: "",
  downloaded_funds_to_beneficiary: "",
  project_title: "",
  proponent: "",
  start_date: "",
  end_date: "",
  extension_request_3mo: "",
  extension_date: "",
  realignment_1st: false,
  realignment_2nd: false,
  intervention_equipment: false,
  intervention_mooe: false,
  intervention_trainings: false,
  intervention_consultancy: false,
  intervention_pl: false,
  intervention_lab_others: false,
  liquidation_psto: false,
  received_approved: false,
  lddap_date: "",
  moa_date: "",
  rtec_date: "",
  cash_program: "",
  status_report_1st: false,
  status_report_2nd: false,
  terminal_report: false,
  completed: false,
  terminated: false,
  condonation: false,
  with_letter_of_extension: false,
  donated: false,
  impact_assessment: false,
  par_no: "",
  ptr_no: "",
  remarks: "",
  with_coo: false,
  google_drive_links: "",
};

const parseAmount = (value) => {
  if (value === "" || value == null) return null;
  const n = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const parseYear = (value) => {
  if (value === "" || value == null) return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
};

const trimOrNull = (value) => {
  const trimmed = value?.trim?.() ?? "";
  return trimmed || null;
};

export const recordToForm = (record) => {
  if (!record) return { ...EMPTY_RECORD_FORM };

  const form = { ...EMPTY_RECORD_FORM };
  for (const key of Object.keys(EMPTY_RECORD_FORM)) {
    const value = record[key];
    if (BOOLEAN_FIELDS.includes(key)) {
      form[key] = Boolean(value);
    } else if (DATE_FIELDS.includes(key)) {
      form[key] = value ?? "";
    } else if (key === "year") {
      form[key] = value != null ? String(value) : "";
    } else if (key === "total_amount" || key === "downloaded_funds_to_beneficiary") {
      form[key] = value != null && value !== "" ? String(value) : "";
    } else {
      form[key] = value ?? "";
    }
  }
  return form;
};

export const formToPayload = (form) => ({
  project_no: trimOrNull(form.project_no),
  year: parseYear(form.year),
  municipality: trimOrNull(form.municipality),
  project_type: trimOrNull(form.project_type),
  firm: trimOrNull(form.firm),
  total_amount: parseAmount(form.total_amount),
  downloaded_funds_to_beneficiary: parseAmount(form.downloaded_funds_to_beneficiary),
  project_title: form.project_title?.trim() ?? "",
  proponent: trimOrNull(form.proponent),
  start_date: form.start_date || null,
  end_date: form.end_date || null,
  extension_request_3mo: form.extension_request_3mo || null,
  extension_date: form.extension_date || null,
  realignment_1st: Boolean(form.realignment_1st),
  realignment_2nd: Boolean(form.realignment_2nd),
  intervention_equipment: Boolean(form.intervention_equipment),
  intervention_mooe: Boolean(form.intervention_mooe),
  intervention_trainings: Boolean(form.intervention_trainings),
  intervention_consultancy: Boolean(form.intervention_consultancy),
  intervention_pl: Boolean(form.intervention_pl),
  intervention_lab_others: Boolean(form.intervention_lab_others),
  liquidation_psto: Boolean(form.liquidation_psto),
  received_approved: Boolean(form.received_approved),
  lddap_date: form.lddap_date || null,
  moa_date: form.moa_date || null,
  rtec_date: form.rtec_date || null,
  cash_program: trimOrNull(form.cash_program),
  status_report_1st: Boolean(form.status_report_1st),
  status_report_2nd: Boolean(form.status_report_2nd),
  terminal_report: Boolean(form.terminal_report),
  completed: Boolean(form.completed),
  terminated: Boolean(form.terminated),
  condonation: Boolean(form.condonation),
  with_letter_of_extension: Boolean(form.with_letter_of_extension),
  donated: Boolean(form.donated),
  impact_assessment: Boolean(form.impact_assessment),
  par_no: trimOrNull(form.par_no),
  ptr_no: trimOrNull(form.ptr_no),
  remarks: trimOrNull(form.remarks),
  with_coo: Boolean(form.with_coo),
  google_drive_links: trimOrNull(form.google_drive_links),
  updated_at: new Date().toISOString(),
});

export const formatMonthYear = (value) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
};

export const formatShortDate = (value) => {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatCurrency = (value) => {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(n);
};

export const listAllProjectsMonitoring = async () => {
  const { data, error } = await supabase
    .from("all_projects_monitoring")
    .select("*")
    .order("year", { ascending: false, nullsFirst: false })
    .order("project_no", { ascending: true, nullsFirst: false });

  return { data, error };
};

export const createAllProjectsMonitoringRecord = async (form) => {
  const payload = formToPayload(form);
  const { data, error } = await supabase
    .from("all_projects_monitoring")
    .insert(payload)
    .select("*")
    .single();

  return { data, error };
};

export const updateAllProjectsMonitoringRecord = async (id, form) => {
  const payload = formToPayload(form);
  const { data, error } = await supabase
    .from("all_projects_monitoring")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
};

export const toggleAllProjectsMonitoringField = async (id, field, value) => {
  const { data, error } = await supabase
    .from("all_projects_monitoring")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  return { data, error };
};

export const deleteAllProjectsMonitoringRecord = async (id) => {
  const { error } = await supabase
    .from("all_projects_monitoring")
    .delete()
    .eq("id", id);

  return { error };
};
