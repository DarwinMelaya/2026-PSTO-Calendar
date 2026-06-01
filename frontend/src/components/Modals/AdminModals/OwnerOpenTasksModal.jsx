import DashboardTaskListWithActions from "./Dashboard/DashboardTaskListWithActions";

const OwnerOpenTasksModal = ({
  isOpen,
  onClose,
  ownerLabel,
  tasks,
  onRefresh,
  readOnly = false,
}) => (
  <DashboardTaskListWithActions
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    onRefresh={onRefresh}
    readOnly={readOnly}
    title="Open tasks"
    getSubtitle={(grouped) =>
      `${ownerLabel ?? "—"} · ${grouped.length} open task${grouped.length === 1 ? "" : "s"}`
    }
    emptyMessage="All tasks completed for this owner."
    modalId="owner-open-tasks-modal"
  />
);

export default OwnerOpenTasksModal;
