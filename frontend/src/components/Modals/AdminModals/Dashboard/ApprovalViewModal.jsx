import DashboardTaskListModal from "./DashboardTaskListModal";

const ApprovalViewModal = ({ isOpen, onClose, tasks }) => (
  <DashboardTaskListModal
    isOpen={isOpen}
    onClose={onClose}
    tasks={tasks}
    title="Awaiting approval"
    subtitle={`${tasks.length} status change request${tasks.length === 1 ? "" : "s"}`}
    emptyMessage="No pending approval requests."
    modalId="approval-tasks-modal"
  />
);

export default ApprovalViewModal;
