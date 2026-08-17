import { runWorkflow } from "../../services/workflowRunner";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  getWorkflowSteps,
  type Workflow,
  type WorkflowStep,
} from "../../graphql/queries/workflows";

import {
  createWorkflowStep,
  deleteWorkflowStep,
  updateWorkflowStepOrder,
} from "../../graphql/mutations/workflowSteps";

type Props = {
  workflow: Workflow;
  onBack: () => void;
};

const STEP_TYPES = [
  "llm_call",
  "http_request",
  "conditional_branch",
  "approval_gate",
  "db_write",
  "notify",
];

function WorkflowEditor({
  workflow,
  onBack,
}: Props) {
  const [steps, setSteps] =
    useState<WorkflowStep[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [selectedType, setSelectedType] =
    useState("llm_call");

  const [configText, setConfigText] =
    useState("{}");

  const [adding, setAdding] =
    useState(false);

  const [running, setRunning] =
    useState(false);

  const [runResult, setRunResult] =
    useState<Record<string, unknown> | null>(
      null
    );

  const [runError, setRunError] =
    useState<string | null>(null);

  // ==========================================
  // LOAD STEPS
  // ==========================================

  const loadSteps = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "Loading workflow steps for:",
        workflow.id
      );

      const fetchedSteps =
        await getWorkflowSteps(workflow.id);

      console.log(
        "EDITOR STEPS:",
        fetchedSteps
      );

      setSteps(fetchedSteps);
    } catch (err) {
      console.error(
        "EDITOR STEPS ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load workflow steps."
      );
    } finally {
      setLoading(false);
    }
  }, [workflow.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSteps();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadSteps]);

  // ==========================================
  // RUN WORKFLOW
  // ==========================================

  const handleRunWorkflow = async () => {
    if (running) {
      return;
    }

    try {
      setRunning(true);
      setRunError(null);
      setRunResult(null);
      setError(null);

      console.log(
        "Running workflow:",
        workflow.id
      );

      const result =
        await runWorkflow(workflow.id);

      console.log(
        "WORKFLOW RUN RESULT:",
        result
      );

      setRunResult(
        result.output ?? {}
      );
    } catch (err) {
      console.error(
        "WORKFLOW RUN ERROR:",
        err
      );

      setRunError(
        err instanceof Error
          ? err.message
          : "Workflow failed."
      );
    } finally {
      setRunning(false);
    }
  };

  // ==========================================
  // ADD STEP
  // ==========================================

  const handleAddStep = async () => {
    let config: Record<string, unknown>;

    try {
      const parsed = JSON.parse(configText);

      if (
        parsed === null ||
        Array.isArray(parsed) ||
        typeof parsed !== "object"
      ) {
        throw new Error(
          "Config must be a JSON object."
        );
      }

      config =
        parsed as Record<string, unknown>;
    } catch {
      setError(
        "Invalid JSON configuration."
      );
      return;
    }

    try {
      setAdding(true);
      setError(null);

      const nextOrder =
        steps.length === 0
          ? 0
          : Math.max(
              ...steps.map(
                (step) => step.step_order
              )
            ) + 1;

      console.log(
        "ADDING STEP:",
        {
          workflowId: workflow.id,
          stepOrder: nextOrder,
          type: selectedType,
          config,
        }
      );

      await createWorkflowStep({
        workflowId: workflow.id,
        stepOrder: nextOrder,
        type: selectedType,
        config,
      });

      await loadSteps();

      setConfigText("{}");
    } catch (err) {
      console.error(
        "ADD STEP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to add step."
      );
    } finally {
      setAdding(false);
    }
  };

  // ==========================================
  // DELETE STEP
  // ==========================================

  const handleDelete = async (
    stepId: string
  ) => {
    try {
      setError(null);

      await deleteWorkflowStep(stepId);

      await loadSteps();
    } catch (err) {
      console.error(
        "DELETE STEP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete step."
      );
    }
  };

  // ==========================================
  // MOVE STEP
  // ==========================================

  const moveStep = async (
    index: number,
    direction: "up" | "down"
  ) => {
    const currentSteps = [...steps];

    const targetIndex =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= steps.length
    ) {
      return;
    }

    const current =
      currentSteps[index];

    const target =
      currentSteps[targetIndex];

    try {
      setError(null);

      const temporaryOrder =
        -(Math.max(
          ...currentSteps.map(
            (step) => step.step_order
          )
        ) + 1000);

      await updateWorkflowStepOrder(
        current.id,
        temporaryOrder
      );

      await updateWorkflowStepOrder(
        target.id,
        current.step_order
      );

      await updateWorkflowStepOrder(
        current.id,
        target.step_order
      );

      await loadSteps();
    } catch (err) {
      console.error(
        "MOVE STEP ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to reorder step."
      );

      await loadSteps();
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p>Loading steps...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // EDITOR
  // ==========================================

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <div style={styles.header}>
          <div>
            <button
              onClick={onBack}
              style={styles.backButton}
            >
              ← Back to Workflows
            </button>

            <h1 style={styles.title}>
              {workflow.name}
            </h1>

            <p style={styles.description}>
              {workflow.description ||
                "No description"}
            </p>
          </div>

          <button
            style={{
              ...styles.runButton,
              opacity: running ? 0.7 : 1,
              cursor: running
                ? "not-allowed"
                : "pointer",
            }}
            onClick={() => {
              void handleRunWorkflow();
            }}
            disabled={running}
          >
            {running
              ? "Running..."
              : "▶ Run Workflow"}
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div style={styles.errorBox}>
            {error}
          </div>
        )}

        {runError && (
          <div style={styles.runErrorBox}>
            <strong>
              Workflow Run Failed
            </strong>

            <div>{runError}</div>
          </div>
        )}

        {/* RUN RESULT */}

        {runResult && (
          <div style={styles.card}>
            <h2>Run Result</h2>

            <pre style={styles.config}>
              {JSON.stringify(
                runResult,
                null,
                2
              )}
            </pre>
          </div>
        )}

        {/* ADD STEP */}

        <div style={styles.card}>
          <h2>Add Step</h2>

          <div style={styles.formRow}>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Step Type
              </label>

              <select
                value={selectedType}
                onChange={(event) => {
                  setSelectedType(
                    event.target.value
                  );
                }}
                style={styles.input}
              >
                {STEP_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Config JSON
              </label>

              <textarea
                value={configText}
                onChange={(event) => {
                  setConfigText(
                    event.target.value
                  );
                }}
                style={styles.textarea}
              />
            </div>

          </div>

          <button
            onClick={() => {
              void handleAddStep();
            }}
            disabled={adding}
            style={{
              ...styles.primaryButton,
              opacity: adding ? 0.7 : 1,
              cursor: adding
                ? "not-allowed"
                : "pointer",
            }}
          >
            {adding
              ? "Adding..."
              : "+ Add Step"}
          </button>
        </div>

        {/* STEPS */}

        <div style={styles.card}>
          <div style={styles.stepsHeader}>
            <h2>
              Steps ({steps.length})
            </h2>
          </div>

          {steps.length === 0 ? (
            <div style={styles.empty}>
              No steps yet. Add your first
              step above.
            </div>
          ) : (
            <div>
              {steps.map(
                (step, index) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={index}
                    total={steps.length}
                    onDelete={() => {
                      void handleDelete(
                        step.id
                      );
                    }}
                    onMoveUp={() => {
                      void moveStep(
                        index,
                        "up"
                      );
                    }}
                    onMoveDown={() => {
                      void moveStep(
                        index,
                        "down"
                      );
                    }}
                  />
                )
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// STEP CARD
// ==========================================

type StepCardProps = {
  step: WorkflowStep;
  index: number;
  total: number;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function StepCard({
  step,
  index,
  total,
  onDelete,
  onMoveUp,
  onMoveDown,
}: StepCardProps) {
  return (
    <div style={styles.stepCard}>
      <div style={styles.stepNumber}>
        {index + 1}
      </div>

      <div style={styles.stepContent}>
        <div style={styles.stepTitleRow}>
          <h3>{step.type}</h3>

          <span style={styles.badge}>
            Step {index + 1}
          </span>
        </div>

        <pre style={styles.config}>
          {JSON.stringify(
            step.config ?? {},
            null,
            2
          )}
        </pre>

        <div style={styles.actions}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            style={styles.smallButton}
          >
            ↑
          </button>

          <button
            onClick={onMoveDown}
            disabled={
              index === total - 1
            }
            style={styles.smallButton}
          >
            ↓
          </button>

          <button
            onClick={onDelete}
            style={styles.deleteButton}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "30px",
    boxSizing: "border-box" as const,
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "25px",
  },

  backButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    cursor: "pointer",
    padding: 0,
    marginBottom: "15px",
  },

  title: {
    margin: 0,
    fontSize: "32px",
  },

  description: {
    color: "#6b7280",
  },

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "25px",
    marginBottom: "20px",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.05)",
  },

  formRow: {
    display: "grid",
    gridTemplateColumns:
      "260px minmax(0, 1fr)",
    gap: "20px",
    marginBottom: "20px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column" as const,
  },

  label: {
    fontWeight: 600,
    marginBottom: "8px",
  },

  input: {
    padding: "11px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    background: "#ffffff",
  },

  textarea: {
    minHeight: "110px",
    padding: "11px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontFamily: "monospace",
    resize: "vertical" as const,
  },

  primaryButton: {
    padding: "11px 18px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },

  runButton: {
    padding: "12px 18px",
    background: "#16a34a",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },

  secondaryButton: {
    padding: "10px 16px",
    background: "#ffffff",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    cursor: "pointer",
  },

  stepsHeader: {
    display: "flex",
    justifyContent: "space-between",
  },

  stepCard: {
    display: "flex",
    gap: "15px",
    padding: "18px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    marginBottom: "12px",
  },

  stepNumber: {
    width: "36px",
    height: "36px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    flexShrink: 0,
  },

  stepContent: {
    flex: 1,
  },

  stepTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  badge: {
    fontSize: "12px",
    background: "#eef2ff",
    color: "#4338ca",
    borderRadius: "20px",
    padding: "4px 9px",
  },

  config: {
    background: "#f8fafc",
    padding: "12px",
    borderRadius: "8px",
    overflowX: "auto" as const,
    fontSize: "13px",
  },

  actions: {
    display: "flex",
    gap: "8px",
    marginTop: "10px",
  },

  smallButton: {
    padding: "7px 11px",
    border: "1px solid #d1d5db",
    background: "#ffffff",
    borderRadius: "6px",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "7px 12px",
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: "6px",
    cursor: "pointer",
  },

  empty: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#6b7280",
  },

  error: {
    color: "#dc2626",
  },

  errorBox: {
    padding: "12px 15px",
    background: "#fef2f2",
    color: "#b91c1c",
    borderRadius: "8px",
    marginBottom: "20px",
  },

  runErrorBox: {
    padding: "12px 15px",
    background: "#fff7ed",
    color: "#c2410c",
    borderRadius: "8px",
    marginBottom: "20px",
  },
};

export default WorkflowEditor;