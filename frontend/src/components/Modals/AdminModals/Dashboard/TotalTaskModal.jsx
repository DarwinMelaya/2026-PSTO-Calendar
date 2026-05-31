import DashboardTaskListWithActions from "./DashboardTaskListWithActions";

const TotalTaskModal = ({
  isOpen,
  onClose,
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
    title="Total tasks"
    getSubtitle={(grouped) =>
      `${grouped.length} task${grouped.length === 1 ? "" : "s"}`
    }
    emptyMessage="No tasks yet."
    modalId="total-tasks-modal"
  />
);

export default TotalTaskModal;
