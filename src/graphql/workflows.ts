import { nhost } from "../lib/nhost";
import { getMyOrganization } from "./queries/organization";

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  org_id: string;
  created_by: string;
  created_at: string;
};

type GetWorkflowsResponse = {
  workflows: Workflow[];
};

type GetWorkflowsVariables = {
  orgId: string;
};

export async function getWorkflows(): Promise<Workflow[]> {
  const organization = await getMyOrganization();

  if (!organization?.org_id) {
    throw new Error(
      "No organization is associated with this account."
    );
  }

  console.log(
    "WORKFLOW LOAD - organization:",
    organization.org_id
  );

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
      GetWorkflowsVariables
    >(
      {
        query,
        variables: {
          orgId: organization.org_id,
        },
      },
      {
        headers: {
          "x-hasura-org-id": organization.org_id,
        },
      }
    );

  console.log(
    "WORKFLOW GRAPHQL RESPONSE:",
    response.body
  );

  if (response.body.errors?.length) {
    throw new Error(
      response.body.errors[0].message ||
        "Failed to load workflows."
    );
  }

  const workflows =
    response.body.data?.workflows ?? [];

  console.log(
    "WORKFLOWS LOADED:",
    workflows
  );

  return workflows;
}