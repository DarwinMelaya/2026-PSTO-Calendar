import { useMemo, useState } from "react";
import RichTextContent from "../../Forms/RichTextContent";
import {
  TASK_STATUSES,
  formatTaskDeadline,
  isImageProofUrl,
  isTaskPriority,
  parseTaskActivities,
  parseTaskRemarks,
  taskProgramLabel,
} from "../../../utils/task";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

const DetailBlock = ({ label, children }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <div className="mt-1.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
      {children}
    </div>
  </div>
);

const collectProofEntries = (task) => {
  const members = task.members?.length ? task.members : [task];
  const labels = task.responsibleLabels ?? [];

  return members
    .map((member, index) => {
      const proofUrl =
        member.proofUrl ?? parseTaskRemarks(member.remarks).proofUrl ?? null;
      if (!proofUrl) return null;
      return {
        label: labels[index] ?? member.profiles?.code_name ?? "Assignee",
        proofUrl,
      };
    })
    .filter(Boolean);
};

const ViewTaskModal = ({ isOpen, onClose, task }) => {
  const [expandedProofUrl, setExpandedProofUrl] = useState(null);
  const [expandedInstructionUrl, setExpandedInstructionUrl] = useState(null);

  const proofEntries = useMemo(
    () => (task ? collectProofEntries(task) : []),
    [task],
  );

  const handleClose = () => {
    setExpandedProofUrl(null);
    setExpandedInstructionUrl(null);
    onClose();
  };

  if (!isOpen || !task) return null;

  const { cleanActivities, subTasks, instructionImageUrl } = parseTaskActivities(
    task.activities,
  );
  const instructionImage =
    task.instructionImageUrl ?? instructionImageUrl ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="view-task-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={handleClose}
        aria-label="Close modal"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2
              id="view-task-modal-title"
              className="text-xl font-semibold text-slate-900"
            >
              Task details
              {isTaskPriority(task) ? (
                <span className="ml-2 inline-flex align-middle rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-600/15">
                  Priority
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDate(task.task_date)}
              {" · "}
              {formatTaskDeadline(task.deadline, task.deadline_time)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto px-6 py-5">
          <DetailBlock label="Program">
            {taskProgramLabel(task.program)}
          </DetailBlock>
          <DetailBlock label="Agenda">{task.agenda || "—"}</DetailBlock>
          <DetailBlock label="Activities">
            {cleanActivities ? (
              <RichTextContent html={cleanActivities} />
            ) : (
              "—"
            )}
          </DetailBlock>
          {subTasks.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sub-tasks
              </p>
              <ul className="mt-2 space-y-3">
                {subTasks.map((item, index) => (
                  <li
                    key={`${item.title}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {item.title || `Sub-task ${index + 1}`}
                    </p>
                    {item.remarks ? (
                      <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                        {item.remarks}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-slate-400">No remarks</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {instructionImage ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Instruction image
              </p>
              <div className="mt-2 rounded-xl border border-sky-200/80 bg-sky-50/40 p-3">
                <button
                  type="button"
                  onClick={() => setExpandedInstructionUrl(instructionImage)}
                  className="block overflow-hidden rounded-lg ring-2 ring-sky-200/80 transition hover:ring-sky-400"
                >
                  <img
                    src={instructionImage}
                    alt="Task instruction"
                    className="max-h-48 w-full object-cover sm:max-h-56 sm:w-auto sm:max-w-full"
                  />
                </button>
                <a
                  href={instructionImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-sky-800 underline-offset-2 hover:underline"
                >
                  Open full size
                </a>
              </div>
            </div>
          ) : null}
          <DetailBlock label="Remarks">{task.cleanRemarks || "—"}</DetailBlock>

          {task.rejectionRemarks ? (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-rose-900">
                Request rejected
                {task.rejectedStatus
                  ? `: ${statusLabel(task.rejectedStatus)}`
                  : ""}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-rose-950 whitespace-pre-wrap">
                {task.rejectionRemarks}
              </p>
            </div>
          ) : null}

          {proofEntries.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Proof of completion
              </p>
              <div className="mt-2 space-y-3">
                {proofEntries.map((entry) => (
                  <div
                    key={`${entry.label}-${entry.proofUrl}`}
                    className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-3"
                  >
                    {proofEntries.length > 1 ? (
                      <p className="mb-2 text-xs font-semibold text-emerald-900">
                        {entry.label}
                      </p>
                    ) : null}
                    {isImageProofUrl(entry.proofUrl) ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedProofUrl(entry.proofUrl)}
                          className="block overflow-hidden rounded-lg ring-2 ring-emerald-200/80 transition hover:ring-emerald-400"
                        >
                          <img
                            src={entry.proofUrl}
                            alt={`Proof of completion${proofEntries.length > 1 ? ` — ${entry.label}` : ""}`}
                            className="max-h-48 w-full object-cover sm:max-h-56 sm:w-auto sm:max-w-full"
                          />
                        </button>
                        <a
                          href={entry.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
                        >
                          Open full size
                        </a>
                      </>
                    ) : (
                      <a
                        href={entry.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block break-all rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 underline-offset-2 hover:underline"
                      >
                        {entry.proofUrl}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(task.responsibleLabels ?? ["—"]).map((label, idx) => (
                  <span
                    key={`${label}-${idx}`}
                    className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-900/5"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {statusLabel(task.status)}
                {task.requestedStatus
                  ? ` · Requested: ${statusLabel(task.requestedStatus)}`
                  : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Priority
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {isTaskPriority(task) ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto sm:px-6"
          >
            Close
          </button>
        </div>
      </div>

      {expandedInstructionUrl ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setExpandedInstructionUrl(null)}
          aria-label="Close instruction image preview"
        >
          <img
            src={expandedInstructionUrl}
            alt="Task instruction"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      ) : null}

      {expandedProofUrl ? (
        isImageProofUrl(expandedProofUrl) ? (
          <button
            type="button"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
            onClick={() => setExpandedProofUrl(null)}
            aria-label="Close proof preview"
          >
            <img
              src={expandedProofUrl}
              alt="Proof of completion"
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </button>
        ) : (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setExpandedProofUrl(null)}
              aria-label="Close proof link"
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Proof of completion
              </p>
              <a
                href={expandedProofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block break-all text-sm font-semibold text-sky-700 underline-offset-2 hover:underline"
              >
                {expandedProofUrl}
              </a>
              <button
                type="button"
                onClick={() => setExpandedProofUrl(null)}
                className="mt-4 w-full rounded-xl border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
};

export default ViewTaskModal;
