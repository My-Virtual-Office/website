import "./AssignTaskModal.css";
import { useEffect, useState } from "react";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { assignTask } from "../../api/tasks";

// Modal for assigning a task to a channel member. On submit it calls the tasks
// API, which publishes a TASK_ASSIGNED event; the assignee then receives a live
// notification in their bell. The form resets every time the modal is opened.
export default function AssignTaskModal({
  open,
  onClose,
  members = [],
  usersMap = {},
  currentUserId,
  defaultAssigneeId = null,
  workspaceId,
  onAssigned,
}) {
  const [assigneeId, setAssigneeId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Reset whenever the modal (re)opens or the preselected assignee changes.
  useEffect(() => {
    if (!open) return;
    setAssigneeId(defaultAssigneeId != null ? String(defaultAssigneeId) : "");
    setTitle("");
    setDueAt("");
    setDescription("");
    setError(null);
    setSuccess(false);
    setSubmitting(false);
  }, [open, defaultAssigneeId]);

  if (!open) return null;

  const resolveName = (id) => usersMap[id] || `User ${id}`;

  // You assign to other members, not yourself.
  const candidates = members.filter(
    (id) => String(id) !== String(currentUserId),
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!assigneeId) {
      setError("Please choose who to assign the task to.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSubmitting(true);
    try {
      await assignTask({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeUserId: Number(assigneeId),
        workspaceId: workspaceId != null ? Number(workspaceId) : undefined,
        // datetime-local is timezone-naive; treat it as local time → ISO.
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        assignedByName: usersMap[currentUserId] || undefined,
      });
      setSuccess(true);
      if (onAssigned) onAssigned();
      // Briefly show the confirmation, then dismiss.
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1100);
    } catch (err) {
      console.error("Failed to assign task:", err);
      setError(err.message || "Couldn't assign the task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="assign-task-overlay" onMouseDown={onClose}>
      <div
        className="assign-task-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Assign a task"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="assign-task-header">
          <div className="assign-task-heading">
            <AssignmentTurnedInOutlinedIcon fontSize="small" />
            <span>Assign a task</span>
          </div>
          <button
            type="button"
            className="assign-task-close"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {success ? (
          <div className="assign-task-success">
            <CheckCircleOutlineIcon />
            <p>Task assigned to {resolveName(Number(assigneeId))}</p>
            <span>They&apos;ll get a notification right away.</span>
          </div>
        ) : (
          <form className="assign-task-body" onSubmit={handleSubmit}>
            <label className="assign-task-field">
              <span>Assign to</span>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a member…
                </option>
                {candidates.map((id) => (
                  <option key={id} value={id}>
                    {resolveName(id)}
                  </option>
                ))}
              </select>
            </label>

            <label className="assign-task-field">
              <span>Task title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Design Homepage"'
                maxLength={120}
                required
              />
            </label>

            <label className="assign-task-field">
              <span>
                Due date <em>(optional)</em>
              </span>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </label>

            <label className="assign-task-field">
              <span>
                Details <em>(optional)</em>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add any context for the assignee…"
                maxLength={500}
              />
            </label>

            {error && <div className="assign-task-error">{error}</div>}

            <div className="assign-task-actions">
              <button
                type="button"
                className="assign-task-btn ghost"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="assign-task-btn primary"
                disabled={submitting}
              >
                {submitting ? "Assigning…" : "Assign task"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
