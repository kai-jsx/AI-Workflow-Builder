import {
  getWorkflows,
  getWorkflowSteps,
} from "../graphql/queries/workflows";

import {
  createWorkflowRun,
  updateWorkflowRun,
} from "../graphql/mutations/workflowRuns";

import {
  createStepRun,
  updateStepRun,
} from "../graphql/mutations/stepRuns";

export async function runWorkflow(
  workflowId: string
) {
  // ==========================================
  // 1. LOAD WORKFLOW
  // ==========================================

  const workflows =
    await getWorkflows();

  const workflow = workflows.find(
    (item) => item.id === workflowId
  );

  if (!workflow) {
    throw new Error(
      "Workflow was not found."
    );
  }

  // ==========================================
  // 2. LOAD STEPS
  // ==========================================

  const steps =
    await getWorkflowSteps(
      workflow.id
    );

  const orderedSteps = [...steps].sort(
    (a, b) =>
      a.step_order - b.step_order
  );

  console.log(
    "RUNNER WORKFLOW:",
    workflow
  );

  console.log(
    "RUNNER STEPS:",
    orderedSteps
  );

  // ==========================================
  // 3. CREATE WORKFLOW RUN
  // ==========================================

  const run =
    await createWorkflowRun(
      workflow.id
    );

  try {
    // ========================================
    // 4. MARK WORKFLOW RUNNING
    // ========================================

    await updateWorkflowRun(
      run.id,
      "running"
    );

    let previousOutput:
      Record<string, unknown> = {};

    // ========================================
    // 5. EXECUTE EACH STEP
    // ========================================

    for (const step of orderedSteps) {
      const stepInput =
        previousOutput;

      console.log(
        "RUNNER EXECUTING STEP:",
        step
      );

      const stepRun =
        await createStepRun({
          workflowRunId: run.id,
          workflowStepId: step.id,
          input: stepInput,
        });

      try {
        await updateStepRun(
          stepRun.id,
          {
            status: "running",
            attemptCount: 1,
          }
        );

        const output =
          await executeStep(
            step.type,
            step.config ?? {},
            stepInput
          );

        await updateStepRun(
          stepRun.id,
          {
            status: "completed",
            output,
            error: null,
            attemptCount: 1,
            completedAt:
              new Date().toISOString(),
          }
        );

        previousOutput = output;
      } catch (stepError) {
        const message =
          stepError instanceof Error
            ? stepError.message
            : "Step failed.";

        await updateStepRun(
          stepRun.id,
          {
            status: "failed",
            output: null,
            error: message,
            attemptCount: 1,
            completedAt:
              new Date().toISOString(),
          }
        );

        throw new Error(
          `Step "${step.type}" failed: ${message}`,
          {
            cause: stepError,
          }
        );
      }
    }

    // ========================================
    // 6. MARK WORKFLOW COMPLETED
    // ========================================

    const completedRun =
      await updateWorkflowRun(
        run.id,
        "completed",
        new Date().toISOString()
      );

    return {
      run: completedRun,
      output: previousOutput,
    };
  } catch (error) {
    // ========================================
    // 7. MARK WORKFLOW FAILED
    // ========================================

    try {
      await updateWorkflowRun(
        run.id,
        "failed",
        new Date().toISOString()
      );
    } catch (updateError) {
      console.error(
        "FAILED TO MARK WORKFLOW RUN FAILED:",
        updateError
      );
    }

    throw error;
  }
}

// ==========================================
// STEP EXECUTION
// ==========================================

async function executeStep(
  type: string,
  config: Record<string, unknown>,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (type) {
    case "llm_call":
      return executeLlmPlaceholder(
        config,
        input
      );

    case "http_request":
      throw new Error(
        "http_request execution is not implemented yet."
      );

    case "conditional_branch":
      throw new Error(
        "conditional_branch execution is not implemented yet."
      );

    case "approval_gate":
      throw new Error(
        "approval_gate execution is not implemented yet."
      );

    case "db_write":
      throw new Error(
        "db_write execution is not implemented yet."
      );

    case "notify":
      throw new Error(
        "notify execution is not implemented yet."
      );

    default:
      throw new Error(
        `Unknown step type: ${type}`
      );
  }
}

// ==========================================
// TEMPORARY LLM PLACEHOLDER
// ==========================================

async function executeLlmPlaceholder(
  config: Record<string, unknown>,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return {
    message:
      "LLM execution placeholder.",
    config,
    input,
    executedAt:
      new Date().toISOString(),
  };
}