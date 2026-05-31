import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import EditTaskModal from "../EditTaskModal";
import DashboardTaskListModal from "./DashboardTaskListModal";
import { groupDashboardTasks } from "./groupDashboardTasks";
import {
  TASK_STATUSES,
  approveTaskStatusRequest,
  deleteTasks,
  rejectTaskStatusRequest,
} from "../../../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

const DashboardTaskListWithActions = ({
  isOpen,
  onClose,
  tasks,
  onRefresh,
  readOnly = false,
  title,
  getSubtitle,
  emptyMessage,
  modalId,
}) => {
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const groupedTasks = useMemo(() => groupDashboardTasks(tasks), [tasks]);
  const subtitle = getSubtitle?.(groupedTasks) ?? "";

  const openEdit = (task) => {
    setTaskToEdit({
      ...task,
      remarks: task.cleanRemarks,
      group_key: task.groupKey,
      task_ids: task.taskIds,
      responsible_ids: task.responsibleIds,
      existing_remarks: task.remarks,
    });
    setEditModalOpen(true);
  };

  const closeEdit = () => {
    setEditModalOpen(false);
    setTaskToEdit(null);
  };

  const handleDelete = async (task) => {
    const ok = window.confirm(
      `Delete this task?\n\n${task.agenda?.slice(0, 120) || "Untitled"}${task.agenda?.length > 120 ? "…" : ""}`,
    );
    if (!ok) return;

    setDeletingId(task.id);
    const { error } = await deleteTasks(task.taskIds ?? [task.id]);
    setDeletingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Task deleted.");
    onRefresh?.();
  };

  const handleApproveRequest = async (task) => {
    const requestStatus = task.requestedStatus;
    if (!requestStatus) return;

    setResolvingRequestId(task.id);
    for (const member of task.members ?? []) {
      const { error } = await approveTaskStatusRequest(member);
      if (error) {
        setResolvingRequestId(null);
        toast.error(error.message);
        return;
      }
    }
    setResolvingRequestId(null);

    toast.success(`Status request approved (${statusLabel(requestStatus)}).`);
    onRefresh?.();
  };

  const handleRejectRequest = async (task) => {
    const requestStatus = task.requestedStatus;
    if (!requestStatus) return;

    setResolvingRequestId(task.id);
    for (const member of task.members ?? []) {
      const { error } = await rejectTaskStatusRequest(member);
      if (error) {
        setResolvingRequestId(null);
        toast.error(error.message);
        return;
      }
    }
    setResolvingRequestId(null);

    toast.success("Status request rejected.");
    onRefresh?.();
  };

  const handleEditSuccess = () => {
    closeEdit();
    onRefresh?.();
  };

  const renderActions = readOnly
    ? undefined
    : (task) => {
        const busy = resolvingRequestId === task.id || deletingId === task.id;

        return (
          <>
            {task.requestedStatus ? (
              <>
                <button
                  type="button"
                  onClick={() => handleApproveRequest(task)}
                  disabled={busy}
                  className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resolvingRequestId === task.id ? "Saving…" : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectRequest(task)}
                  disabled={busy}
                  className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => openEdit(task)}
              disabled={busy}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => handleDelete(task)}
              disabled={busy}
              className="rounded-lg border border-red-100 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deletingId === task.id ? "Deleting…" : "Delete"}
            </button>
          </>
        );
      };

  return (
    <>
      <DashboardTaskListModal
        isOpen={isOpen}
        onClose={onClose}
        tasks={groupedTasks}
        title={title}
        subtitle={subtitle}
        emptyMessage={emptyMessage}
        modalId={modalId}
        renderActions={renderActions}
        getItemKey={(t) => t.groupKey || String(t.id)}
      />

      <EditTaskModal
        isOpen={editModalOpen}
        task={taskToEdit}
        onClose={closeEdit}
        onSuccess={handleEditSuccess}
      />
    </>
  );
};

export default DashboardTaskListWithActions;
