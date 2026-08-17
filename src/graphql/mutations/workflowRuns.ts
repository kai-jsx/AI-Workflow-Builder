import { nhost } from "../../lib/nhost";

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  started_by: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
};

type CreateWorkflowRunResponse = {
  insert_workflow_runs_one:
    | WorkflowRun
    | null;
};

export async function createWorkflowRun(
  workflowId: string
): Promise<WorkflowRun> {
  const session =
    nhost.getUserSession();

  if (!session?.user?.id) {
    throw new Error(
      "You must be logged in."
    );
  }

  const mutation = `
    mutation CreateWorkflowRun(
      $workflow_id: uuid!
      $started_by: uuid
    ) {
      insert_workflow_runs_one(
        object: {
          workflow_id: $workflow_id
          started_by: $started_by
        }
      ) {
        id
        workflow_id
        started_by
        status
        started_at
        completed_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      CreateWorkflowRunResponse,
      {
        workflow_id: string;
        started_by: string;
      }
    >({
      query: mutation,
      variables: {
        workflow_id: workflowId,
        started_by: session.user.id,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to create workflow run."
    );
  }

  const run =
    response.body.data
      ?.insert_workflow_runs_one;

  if (!run) {
    throw new Error(
      "Workflow run was not created."
    );
  }

  return run;
}

type UpdateWorkflowRunResponse = {
  update_workflow_runs_by_pk:
    | WorkflowRun
    | null;
};

export async function updateWorkflowRun(
  runId: string,
  status: string,
  completedAt: string | null = null
): Promise<WorkflowRun> {
  const mutation = `
    mutation UpdateWorkflowRun(
      $id: uuid!
      $status: String!
      $completed_at: timestamptz
    ) {
      update_workflow_runs_by_pk(
        pk_columns: {
          id: $id
        }
        _set: {
          status: $status
          completed_at: $completed_at
        }
      ) {
        id
        workflow_id
        started_by
        status
        started_at
        completed_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      UpdateWorkflowRunResponse,
      {
        id: string;
        status: string;
        completed_at: string | null;
      }
    >({
      query: mutation,
      variables: {
        id: runId,
        status,
        completed_at: completedAt,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to update workflow run."
    );
  }

  const run =
    response.body.data
      ?.update_workflow_runs_by_pk;

  if (!run) {
    throw new Error(
      "Workflow run could not be updated."
    );
  }

  return run;
}