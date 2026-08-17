import { nhost } from "../../lib/nhost";

export type Workflow = {
  id: string;
  name: string;
  description: string | null;
  org_id: string;
  created_by: string;
  created_at: string;
};

type CreateWorkflowResponse = {
  insert_workflows_one: Workflow;
};

type CreateWorkflowVariables = {
  name: string;
  description: string | null;
  orgId: string;
  createdBy: string;
};

export async function createWorkflow(
  name: string,
  description: string,
  orgId: string
): Promise<Workflow> {
  const session = nhost.getUserSession();

  if (!session || !session.user) {
    throw new Error("You must be logged in.");
  }

  const mutation = `
    mutation CreateWorkflow(
      $name: String!
      $description: String
      $orgId: uuid!
      $createdBy: uuid!
    ) {
      insert_workflows_one(
        object: {
          name: $name
          description: $description
          org_id: $orgId
          created_by: $createdBy
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

  const variables: CreateWorkflowVariables = {
    name,
    description: description || null,
    orgId,
    createdBy: session.user.id,
  };

  const response =
    await nhost.graphql.request<
      CreateWorkflowResponse,
      CreateWorkflowVariables
    >(
      {
        query: mutation,
        variables,
      },
      {
        headers: {
          "x-hasura-org-id": orgId,
        },
      }
    );

  const workflow =
    response.body.data?.insert_workflows_one;

  if (!workflow) {
    throw new Error("Workflow could not be created.");
  }

  return workflow;
}