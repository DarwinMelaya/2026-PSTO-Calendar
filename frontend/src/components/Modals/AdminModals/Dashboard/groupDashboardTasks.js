/** Group tasks that share a groupKey into one list row (multi-assignee tasks). */
export const groupDashboardTasks = (tasks) => {
  const groups = new Map();

  for (const task of tasks) {
    const key = task.groupKey || `single-${task.id}`;
    const current = groups.get(key);
    const member = {
      ...task,
      cleanRemarks: task.cleanRemarks ?? "",
    };

    if (!current) {
      groups.set(key, {
        ...member,
        taskIds: [task.id],
        responsibleIds: [task.responsible_id],
        responsibleLabels: [
          task.profile?.code_name ?? task.profiles?.code_name ?? "—",
        ],
        members: [member],
      });
    } else {
      current.taskIds.push(task.id);
      current.responsibleIds.push(task.responsible_id);
      current.responsibleLabels.push(
        task.profile?.code_name ?? task.profiles?.code_name ?? "—",
      );
      current.members.push(member);
    }
  }

  return Array.from(groups.values());
};
