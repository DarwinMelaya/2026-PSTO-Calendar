import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import EditTaskModal from "../EditTaskModal";
import DashboardTaskListModal from "./DashboardTaskListModal";
import { groupDashboardTasks } from "./groupDashboardTasks";
import { sendTaskFollowUpNotifications } from "../../../../utils/notification";
import { getSession } from "../../../../utils/session";
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
  enableFollowUp = false,
  showCompletionProof = false,
  showFilters = false,
}) => {
  const [resolvingRequestId, setResolvingRequestId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [followingUpId, setFollowingUpId] = useState(null);
  const [followingUpAll, setFollowingUpAll] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  const senderLabel = useMemo(() => {
    const session = getSession();
    return session?.code_name || session?.name || session?.email || "Admin";
  }, []);

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

  const followUpSuccessMessage = (notificationCount, emailResult) => {
    const base =
      notificationCount === 1
        ? "Follow-up sent to 1 assignee"
        : `Follow-up sent to ${notificationCount} assignees`;

    const sent = emailResult?.sent ?? 0;
    if (sent > 0) {
      return `${base} and ${sent} email${sent === 1 ? "" : "s"}.`;
    }

    return `${base}.`;
  };

  const handleFollowUp = async (task) => {
    setFollowingUpId(task.id);
    const { data, error, email } = await sendTaskFollowUpNotifications(task, {
      senderLabel,
    });
    setFollowingUpId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    const count = data?.length ?? 0;
    if (email?.error) {
      toast.error(`Notifications sent, but email failed: ${email.error.message}`);
      return;
    }

    toast.success(followUpSuccessMessage(count, email));
  };

  const handleFollowUpAll = async () => {
    if (groupedTasks.length === 0) return;

    const ok = window.confirm(
      `Send follow-up notifications for all ${groupedTasks.length} overdue task${groupedTasks.length === 1 ? "" : "s"}?`,
    );
    if (!ok) return;

    setFollowingUpAll(true);
    const { data, error, email } = await sendTaskFollowUpNotifications(groupedTasks, {
      senderLabel,
    });
    setFollowingUpAll(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const count = data?.length ?? 0;
    if (email?.error) {
      toast.error(`Notifications sent, but email failed: ${email.error.message}`);
      return;
    }

    toast.success(followUpSuccessMessage(count, email));
  };

  const renderHeaderActions =
    enableFollowUp && !readOnly && groupedTasks.length > 0
      ? () => (
          <button
            type="button"
            onClick={handleFollowUpAll}
            disabled={followingUpAll || followingUpId !== null}
            className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {followingUpAll ? "Sending…" : "Follow up all"}
          </button>
        )
      : undefined;

  const renderActions = readOnly
    ? undefined
    : (task) => {
        const busy =
          resolvingRequestId === task.id ||
          deletingId === task.id ||
          followingUpId === task.id ||
          followingUpAll;

        return (
          <>
            {enableFollowUp ? (
              <button
                type="button"
                onClick={() => handleFollowUp(task)}
                disabled={busy}
                className="rounded-lg border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm transition hover:border-violet-200 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {followingUpId === task.id ? "Sending…" : "Follow up"}
              </button>
            ) : null}
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
        renderHeaderActions={renderHeaderActions}
        showCompletionProof={showCompletionProof}
        showFilters={showFilters}
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
