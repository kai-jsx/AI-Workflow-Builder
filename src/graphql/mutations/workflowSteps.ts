import { nhost } from "../../lib/nhost";

export type CreateStepInput = {
  workflowId: string;
  stepOrder: number;
  type: string;
  config: Record<string, unknown>;
};

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  type: string;
  config: Record<string, unknown> | null;
  created_at: string;
};

type CreateStepResponse = {
  insert_workflow_steps_one:
    | WorkflowStep
    | null;
};

type CreateStepVariables = {
  workflow_id: string;
  step_order: number;
  type: string;
  config: Record<string, unknown>;
};

export async function createWorkflowStep(
  input: CreateStepInput
): Promise<WorkflowStep> {
  const mutation = `
    mutation CreateWorkflowStep(
      $workflow_id: uuid!
      $step_order: Int!
      $type: String!
      $config: jsonb!
    ) {
      insert_workflow_steps_one(
        object: {
          workflow_id: $workflow_id
          step_order: $step_order
          type: $type
          config: $config
        }
      ) {
        id
        workflow_id
        step_order
        type
        config
        created_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      CreateStepResponse,
      CreateStepVariables
    >({
      query: mutation,
      variables: {
        workflow_id: input.workflowId,
        step_order: input.stepOrder,
        type: input.type,
        config: input.config,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to create workflow step."
    );
  }

  const step =
    response.body.data
      ?.insert_workflow_steps_one;

  if (!step) {
    throw new Error(
      "Workflow step was not created."
    );
  }

  return step;
}

type UpdateStepOrderResponse = {
  update_workflow_steps_by_pk: {
    id: string;
    step_order: number;
  } | null;
};

export async function updateWorkflowStepOrder(
  id: string,
  stepOrder: number
) {
  const mutation = `
    mutation UpdateWorkflowStepOrder(
      $id: uuid!
      $step_order: Int!
    ) {
      update_workflow_steps_by_pk(
        pk_columns: {
          id: $id
        }
        _set: {
          step_order: $step_order
        }
      ) {
        id
        step_order
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      UpdateStepOrderResponse,
      {
        id: string;
        step_order: number;
      }
    >({
      query: mutation,
      variables: {
        id,
        step_order: stepOrder,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to reorder step."
    );
  }

  return (
    response.body.data
      ?.update_workflow_steps_by_pk
  );
}

type DeleteStepResponse = {
  delete_workflow_steps_by_pk: {
    id: string;
  } | null;
};

export async function deleteWorkflowStep(
  id: string
) {
  const mutation = `
    mutation DeleteWorkflowStep(
      $id: uuid!
    ) {
      delete_workflow_steps_by_pk(
        id: $id
      ) {
        id
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      DeleteStepResponse,
      { id: string }
    >({
      query: mutation,
      variables: {
        id,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to delete workflow step."
    );
  }

  return (
    response.body.data
      ?.delete_workflow_steps_by_pk
  );
}