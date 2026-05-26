import DashboardTaskListModal from "./DashboardTaskListModal";

const TotalTaskModal = ({ isOpen, onClose, tasks }) => (
  <DashboardTaskListModal
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    title="Total tasks"
    subtitle={`${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
    emptyMessage="No tasks yet."
    modalId="total-tasks-modal"
  />
);

export default TotalTaskModal;
