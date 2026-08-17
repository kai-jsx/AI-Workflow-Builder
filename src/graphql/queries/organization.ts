import { nhost } from "../../lib/nhost";

export type OrganizationMember = {
  org_id: string;
  role: string;
};

type GetMyOrganizationResponse = {
  org_members: OrganizationMember[];
};

export async function getMyOrganization(): Promise<OrganizationMember> {
  const session = nhost.getUserSession();

  if (!session || !session.user) {
    throw new Error("You must be logged in.");
  }

  const query = `
    query GetMyOrganization($userId: uuid!) {
      org_members(
        where: {
          user_id: { _eq: $userId }
        }
        limit: 1
      ) {
        org_id
        role
      }
    }
  `;

  const response =
    await nhost.graphql.request<GetMyOrganizationResponse>({
      query,
      variables: {
        userId: session.user.id,
      },
    });

  const members = response.body.data?.org_members;

  if (!members || members.length === 0) {
    throw new Error("You are not a member of any organization.");
  }

  return members[0];
}