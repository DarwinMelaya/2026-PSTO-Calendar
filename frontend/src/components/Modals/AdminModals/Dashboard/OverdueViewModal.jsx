import DashboardTaskListModal from "./DashboardTaskListModal";

const OverdueViewModal = ({ isOpen, onClose, tasks }) => (
  <DashboardTaskListModal
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    title="Overdue tasks"
    subtitle={`${tasks.length} not completed · past due date`}
    emptyMessage="No overdue tasks."
    modalId="overdue-tasks-modal"
  />
);

export default OverdueViewModal;
