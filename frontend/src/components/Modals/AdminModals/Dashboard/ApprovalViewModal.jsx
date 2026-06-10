import DashboardTaskListWithActions from "./DashboardTaskListWithActions";

const ApprovalViewModal = ({
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
    title="Awaiting approval"
    getSubtitle={(grouped) =>
      `${grouped.length} status change request${grouped.length === 1 ? "" : "s"}`
    }
    emptyMessage="No pending approval requests."
    modalId="approval-tasks-modal"
  />
);

export default ApprovalViewModal;
