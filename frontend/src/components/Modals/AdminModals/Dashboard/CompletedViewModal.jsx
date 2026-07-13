import DashboardTaskListWithActions from "./DashboardTaskListWithActions";

const CompletedViewModal = ({
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
    showCompletionProof
    title="Completed tasks"
    getSubtitle={(grouped) => `${grouped.length} completed`}
    emptyMessage="No completed tasks yet."
    modalId="completed-tasks-modal"
  />
);

export default CompletedViewModal;
