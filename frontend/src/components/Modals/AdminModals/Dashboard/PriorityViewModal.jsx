import DashboardTaskListModal from "./DashboardTaskListModal";

const PriorityViewModal = ({ isOpen, onClose, tasks }) => (
  <DashboardTaskListModal
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    title="Priority tasks"
    subtitle={`${tasks.length} marked as high importance`}
    emptyMessage="No priority tasks."
    modalId="priority-tasks-modal"
  />
);

export default PriorityViewModal;
