import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  collectCategories,
  createContact,
  DEFAULT_CONTACT_CATEGORIES,
  updateContact,
} from "../../../utils/contacts";

const initialForm = {
  name: "",
  email: "",
  mobileNumber: "",
  telephoneNumber: "",
  category: DEFAULT_CONTACT_CATEGORIES[0],
  customCategory: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const CUSTOM_VALUE = "__custom__";

const AddContactModal = ({
  isOpen,
  onClose,
  onSuccess,
  editContact = null,
  knownCategories = DEFAULT_CONTACT_CATEGORIES,
}) => {
  const isEditMode = Boolean(editContact);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const categoryOptions = useMemo(
    () => collectCategories(knownCategories.map((c) => ({ category: c }))),
    [knownCategories],
  );

  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && editContact) {
      const cat = editContact.category ?? DEFAULT_CONTACT_CATEGORIES[0];
      const isKnown = categoryOptions.includes(cat);
      setForm({
        name: editContact.name ?? "",
        email: editContact.email ?? "",
        mobileNumber: editContact.mobileNumber ?? "",
        telephoneNumber: editContact.telephoneNumber ?? "",
        category: isKnown ? cat : CUSTOM_VALUE,
        customCategory: isKnown ? "" : cat,
      });
    } else {
      setForm({
        ...initialForm,
        category: categoryOptions[0] ?? DEFAULT_CONTACT_CATEGORIES[0],
      });
    }
  }, [isOpen, isEditMode, editContact, categoryOptions]);

  if (!isOpen) return null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleClose = () => {
    if (loading) return;
    setForm(initialForm);
    onClose();
  };

  const resolveCategory = () => {
    if (form.category === CUSTOM_VALUE) {
      return form.customCategory.trim();
    }
    return form.category.trim();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const { name, email, mobileNumber, telephoneNumber } = form;
    const category = resolveCategory();

    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (!category) {
      toast.error("Category is required (e.g. LGUs, GIA, CEST).");
      return;
    }

    if (
      !email.trim() &&
      !mobileNumber.trim() &&
      !telephoneNumber.trim()
    ) {
      toast.error("Provide at least an email, mobile, or telephone number.");
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast.error("Enter a valid email address.");
      return;
    }

    setLoading(true);

    const payload = { name, email, mobileNumber, telephoneNumber, category };
    const { error } = isEditMode
      ? await updateContact(editContact.id, payload)
      : await createContact(payload);

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEditMode ? "Contact updated." : "Contact added.");
    setForm(initialForm);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-contact-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="add-contact-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              {isEditMode ? "Edit contact" : "Add contact"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isEditMode
                ? "Update name, email, numbers, or category"
                : "Save a contact and tag where they belong (LGUs, GIA, etc.)"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Name
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={form.name}
              onChange={setField("name")}
              placeholder="e.g. Juan Dela Cruz"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-email"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={setField("email")}
              placeholder="name@example.com"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-mobile"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Mobile number
            </label>
            <input
              id="contact-mobile"
              type="tel"
              value={form.mobileNumber}
              onChange={setField("mobileNumber")}
              placeholder="e.g. 0917 123 4567"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-slate-500">
              Used for Call and Text buttons (opens phone / messaging app).
            </p>
          </div>

          <div>
            <label
              htmlFor="contact-telephone"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Telephone number
            </label>
            <input
              id="contact-telephone"
              type="tel"
              value={form.telephoneNumber}
              onChange={setField("telephoneNumber")}
              placeholder="e.g. (042) 123-4567"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="contact-category"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Category / where they belong
            </label>
            <select
              id="contact-category"
              value={form.category}
              onChange={setField("category")}
              className={inputClass}
            >
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value={CUSTOM_VALUE}>+ Add new category…</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Use LGUs, PGM, GIA, CEST, SETUP, SSCP, or add your own.
            </p>
          </div>

          {form.category === CUSTOM_VALUE && (
            <div>
              <label
                htmlFor="contact-custom-category"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                New category name
              </label>
              <input
                id="contact-custom-category"
                type="text"
                required
                value={form.customCategory}
                onChange={setField("customCategory")}
                placeholder="e.g. PGM, Partners, LGU–Boac"
                className={inputClass}
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Add contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
