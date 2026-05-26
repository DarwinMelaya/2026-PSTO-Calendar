import DashboardTaskListModal from "./DashboardTaskListModal";

const CompletedViewModal = ({ isOpen, onClose, tasks }) => (
  <DashboardTaskListModal
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    title="Completed tasks"
    subtitle={`${tasks.length} completed`}
    emptyMessage="No completed tasks yet."
    modalId="completed-tasks-modal"
  />
);

export default CompletedViewModal;
