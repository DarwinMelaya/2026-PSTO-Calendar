import DashboardTaskListWithActions from "./DashboardTaskListWithActions";

const OverdueViewModal = ({
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
    title="Overdue tasks"
    getSubtitle={(grouped) =>
      `${grouped.length} not completed · past due date`
    }
    emptyMessage="No overdue tasks."
    modalId="overdue-tasks-modal"
    enableFollowUp={!readOnly}
  />
);

export default OverdueViewModal;
