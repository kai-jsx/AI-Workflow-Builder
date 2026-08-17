import { nhost } from "../../lib/nhost";
import { getMyOrganization } from "./organization";

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  org_id: string;
  created_by: string;
  created_at: string;
};

export type WorkflowStep = {
  id: string;
  workflow_id: string;
  step_order: number;
  type: string;
  config: Record<string, unknown> | null;
  created_at: string;
};

type GetWorkflowsResponse = {
  workflows: Workflow[];
};

export async function getWorkflows(): Promise<
  Workflow[]
> {
  const organization =
    await getMyOrganization();

  if (!organization?.org_id) {
    throw new Error(
      "No organization is associated with this account."
    );
  }

  const query = `
    query GetWorkflows($orgId: uuid!) {
      workflows(
        where: {
          org_id: { _eq: $orgId }
        }
        order_by: {
          created_at: desc
        }
      ) {
        id
        name
        description
        org_id
        created_by
        created_at
      }
    }
  `;

  const response =
    await nhost.graphql.request<
      GetWorkflowsResponse,
      { orgId: string }
    >({
      query,
      variables: {
        orgId: organization.org_id,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to load workflows."
    );
  }

  return (
    response.body.data?.workflows ?? []
  );
};

type GetWorkflowStepsResponse = {
  workflow_steps: WorkflowStep[];
};

export async function getWorkflowSteps(
  workflowId: string
): Promise<WorkflowStep[]> {
  const query = `
    query GetWorkflowSteps(
      $workflowId: uuid!
    ) {
      workflow_steps(
        where: {
          workflow_id: {
            _eq: $workflowId
          }
        }
        order_by: {
          step_order: asc
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
      GetWorkflowStepsResponse,
      { workflowId: string }
    >({
      query,
      variables: {
        workflowId,
      },
    });

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to load workflow steps."
    );
  }

  return (
    response.body.data?.workflow_steps ?? []
  );
}