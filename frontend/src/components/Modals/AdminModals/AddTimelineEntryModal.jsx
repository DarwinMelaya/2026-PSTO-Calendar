import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  formatFileSize,
  MAX_UPLOAD_INPUT_BYTES,
} from "../../../utils/compressImage";
import RichTextField from "../../Forms/RichTextField";
import {
  createTimelineEntry,
  uploadProjectTimelinePhoto,
} from "../../../utils/projectTimeline";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const toIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const AddTimelineEntryModal = ({ isOpen, project, onClose, onSuccess }) => {
  const [entryDate, setEntryDate] = useState(toIsoDate(new Date()));
  const [remarks, setRemarks] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !project) return null;

  const handleClose = () => {
    if (loading) return;
    setEntryDate(toIsoDate(new Date()));
    setRemarks("");
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > MAX_UPLOAD_INPUT_BYTES) {
      toast.error("Photo must be 20 MB or smaller.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!entryDate) {
      toast.error("Date is required.");
      return;
    }

    setLoading(true);

    let photoUrl = null;
    if (photoFile) {
      const { url, error: uploadError, originalSize, compressedSize } =
        await uploadProjectTimelinePhoto(photoFile);
      if (uploadError) {
        setLoading(false);
        toast.error(uploadError.message ?? "Failed to upload photo.");
        return;
      }
      photoUrl = url;
      if (
        originalSize &&
        compressedSize &&
        compressedSize < originalSize
      ) {
        toast.success(
          `Photo compressed: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)}`,
          { duration: 4000 },
        );
      }
    }

    const { error } = await createTimelineEntry({
      projectId: project.id,
      entryDate,
      remarks,
      photoUrl,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Timeline entry added.");
    handleClose();
    onSuccess();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-timeline-entry-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="add-timeline-entry-title"
          className="text-xl font-bold text-slate-900"
        >
          Add timeline entry
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Log what happened for{" "}
          <span className="font-medium text-slate-700">{project.title}</span>.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="te-date"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Date
            </label>
            <input
              id="te-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="te-remarks"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Remarks
            </label>
            <RichTextField
              id="te-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Meeting with MSC President regarding project status…"
              minHeight="7rem"
            />
          </div>

          <div>
            <label
              htmlFor="te-photo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Photo{" "}
              <span className="font-normal text-slate-400">
                (optional — large files are auto-compressed to KB)
              </span>
            </label>
            <input
              ref={fileInputRef}
              id="te-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {photoPreview ? (
              <div className="mt-3 flex items-start gap-3">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-24 w-auto max-w-full rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
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
              {loading ? "Saving…" : "Add entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTimelineEntryModal;
