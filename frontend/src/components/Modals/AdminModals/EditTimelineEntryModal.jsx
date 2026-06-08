import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteProjectTimelinePhoto,
  updateTimelineEntry,
  uploadProjectTimelinePhoto,
} from "../../../utils/projectTimeline";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const EditTimelineEntryModal = ({ isOpen, entry, onClose, onSuccess }) => {
  const [entryDate, setEntryDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!entry) return;
    setEntryDate(entry.entry_date ?? "");
    setRemarks(entry.remarks ?? "");
    setExistingPhotoUrl(entry.photo_url ?? null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [entry, isOpen]);

  if (!isOpen || !entry) return null;

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be 5 MB or smaller.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const currentPreview =
    photoPreview ??
    (!removePhoto && existingPhotoUrl ? existingPhotoUrl : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!entryDate) {
      toast.error("Date is required.");
      return;
    }

    setLoading(true);

    let photoUrl = removePhoto ? null : existingPhotoUrl;

    if (photoFile) {
      const { url, error: uploadError } =
        await uploadProjectTimelinePhoto(photoFile);
      if (uploadError) {
        setLoading(false);
        toast.error(uploadError.message ?? "Failed to upload photo.");
        return;
      }
      if (existingPhotoUrl && existingPhotoUrl !== url) {
        await deleteProjectTimelinePhoto(existingPhotoUrl);
      }
      photoUrl = url;
    } else if (removePhoto && existingPhotoUrl) {
      await deleteProjectTimelinePhoto(existingPhotoUrl);
    }

    const { error } = await updateTimelineEntry(entry.id, {
      entryDate,
      remarks,
      photoUrl,
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Entry updated.");
    onSuccess();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-timeline-entry-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="edit-timeline-entry-title"
          className="text-xl font-bold text-slate-900"
        >
          Edit timeline entry
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="edit-te-date"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Date
            </label>
            <input
              id="edit-te-date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="edit-te-remarks"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Remarks
            </label>
            <textarea
              id="edit-te-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={5}
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="edit-te-photo"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              Photo <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              id="edit-te-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {currentPreview ? (
              <div className="mt-3 flex items-start gap-3">
                <img
                  src={currentPreview}
                  alt="Preview"
                  className="h-24 w-auto max-w-full rounded-lg border border-slate-200 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemovePhoto}
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
              {loading ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimelineEntryModal;
