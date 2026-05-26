import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import EditTaskModal from "../EditTaskModal";
import DashboardTaskListModal from "./DashboardTaskListModal";
import {
  TASK_STATUSES,
  approveTaskStatusRequest,
  deleteTasks,
  rejectTaskStatusRequest,
} from "../../../../utils/task";

const statusLabel = (status) =>
  TASK_STATUSES.find((s) => s.value === status)?.label ?? status;

const groupApprovalTasks = (tasks) => {
  const groups = new Map();

  for (const task of tasks) {
    const key = task.groupKey || `single-${task.id}`;
    const current = groups.get(key);
    const member = {
      ...task,
      cleanRemarks: task.cleanRemarks ?? "",
    };

    if (!current) {
      groups.set(key, {
        ...member,
        taskIds: [task.id],
        responsibleIds: [task.responsible_id],
        responsibleLabels: [
          task.profile?.code_name ?? task.profiles?.code_name ?? "—",
        ],
        members: [member],
      });
    } else {
      current.taskIds.push(task.id);
      current.responsibleIds.push(task.responsible_id);
      current.responsibleLabels.push(
        task.profile?.code_name ?? task.profiles?.code_name ?? "—",
      );
      current.members.push(member);
    }
  }

  return Array.from(groups.values());
};

const ApprovalViewModal = ({
  isOpen,
  onClose,
  tasks,
  onRefresh,
  readOnly = false,
}) => {
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const groupedTasks = useMemo(() => groupApprovalTasks(tasks), [tasks]);

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
        title="Awaiting approval"
        subtitle={`${groupedTasks.length} status change request${groupedTasks.length === 1 ? "" : "s"}`}
        emptyMessage="No pending approval requests."
        modalId="approval-tasks-modal"
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

export default ApprovalViewModal;
