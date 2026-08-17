import { nhost } from "../../lib/nhost";

export type StepRun = {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  attempt_count: number | null;
  approved_by: string | null;
  approved_at: string | null;
  started_at: string;
  completed_at: string | null;
};

type CreateStepRunResponse = {
  insert_step_runs_one:
    | StepRun
    | null;
};

export async function createStepRun(
  input: {
    workflowRunId: string;
    workflowStepId: string;
    input: Record<string, unknown> | null;
  }
): Promise<StepRun> {
  const mutation = `
    mutation CreateStepRun(
      $workflow_run_id: uuid!
      $workflow_step_id: uuid!
      $input: jsonb
    ) {
      insert_step_runs_one(
        object: {
          workflow_run_id: $workflow_run_id
          workflow_step_id: $workflow_step_id
          input: $input
        }
      ) {
        id
        workflow_run_id
        workflow_step_id
        status
        input
        output
        error
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      CreateStepRunResponse,
      {
        workflow_run_id: string;
        workflow_step_id: string;
        input: Record<string, unknown> | null;
      }
    >({
      query: mutation,
      variables: {
        workflow_run_id:
          input.workflowRunId,
        workflow_step_id:
          input.workflowStepId,
        input: input.input,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to create step run."
    );
  }

  const stepRun =
    response.body.data
      ?.insert_step_runs_one;

  if (!stepRun) {
    throw new Error(
      "Step run was not created."
    );
  }

  return stepRun;
}

type UpdateStepRunResponse = {
  update_step_runs_by_pk:
    | StepRun
    | null;
};

export async function updateStepRun(
  stepRunId: string,
  values: {
    status: string;
    output?: Record<string, unknown> | null;
    error?: string | null;
    attemptCount?: number;
    completedAt?: string | null;
  }
): Promise<StepRun> {
  const mutation = `
    mutation UpdateStepRun(
      $id: uuid!
      $status: String!
      $output: jsonb
      $error: String
      $attempt_count: Int
      $completed_at: timestamptz
    ) {
      update_step_runs_by_pk(
        pk_columns: {
          id: $id
        }
        _set: {
          status: $status
          output: $output
          error: $error
          attempt_count: $attempt_count
          completed_at: $completed_at
        }
      ) {
        id
        workflow_run_id
        workflow_step_id
        status
        input
        output
        error
        attempt_count
        approved_by
        approved_at
        started_at
        completed_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      UpdateStepRunResponse,
      {
        id: string;
        status: string;
        output: Record<string, unknown> | null;
        error: string | null;
        attempt_count: number;
        completed_at: string | null;
      }
    >({
      query: mutation,
      variables: {
        id: stepRunId,
        status: values.status,
        output:
          values.output ?? null,
        error:
          values.error ?? null,
        attempt_count:
          values.attemptCount ?? 0,
        completed_at:
          values.completedAt ?? null,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to update step run."
    );
  }

  const stepRun =
    response.body.data
      ?.update_step_runs_by_pk;

  if (!stepRun) {
    throw new Error(
      "Step run could not be updated."
    );
  }

  return stepRun;
}