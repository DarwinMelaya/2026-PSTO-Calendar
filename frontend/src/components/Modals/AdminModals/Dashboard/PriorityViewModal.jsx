import DashboardTaskListWithActions from "./DashboardTaskListWithActions";

const PriorityViewModal = ({
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
    title="Priority tasks"
    getSubtitle={(grouped) =>
      `${grouped.length} marked as high importance`
    }
    emptyMessage="No priority tasks."
    modalId="priority-tasks-modal"
  />
);

export default PriorityViewModal;
