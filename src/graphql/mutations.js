// Collection mutations
export const CREATE_ROOT_COLLECTION = `
  mutation CreateRootCollection($teamID: ID!, $title: String!, $data: String) {
    createRootCollection(teamID: $teamID, title: $title, data: $data) {
      id
      title
    }
  }
`;

export const CREATE_CHILD_COLLECTION = `
  mutation CreateChildCollection($collectionID: ID!, $childTitle: String!, $data: String) {
    createChildCollection(collectionID: $collectionID, childTitle: $childTitle, data: $data) {
      id
      title
      parentID
    }
  }
`;

export const DELETE_COLLECTION = `
  mutation DeleteCollection($collectionID: ID!) {
    deleteCollection(collectionID: $collectionID)
  }
`;

// Request mutations
export const CREATE_REQUEST_IN_COLLECTION = `
  mutation CreateRequestInCollection($collectionID: ID!, $data: CreateTeamRequestInput!) {
    createRequestInCollection(collectionID: $collectionID, data: $data) {
      id
      title
      request
    }
  }
`;

export const UPDATE_REQUEST = `
  mutation UpdateRequest($requestID: ID!, $data: UpdateTeamRequestInput!) {
    updateRequest(requestID: $requestID, data: $data) {
      id
      title
      request
    }
  }
`;

export const DELETE_REQUEST = `
  mutation DeleteRequest($requestID: ID!) {
    deleteRequest(requestID: $requestID)
  }
`;

export const MOVE_REQUEST = `
  mutation MoveRequest($requestID: ID!, $destCollID: ID!) {
    moveRequest(requestID: $requestID, destCollID: $destCollID) {
      id
      collectionID
    }
  }
`;

// Environment mutations
export const CREATE_TEAM_ENVIRONMENT = `
  mutation CreateTeamEnvironment($teamID: ID!, $name: String!, $variables: String!) {
    createTeamEnvironment(teamID: $teamID, name: $name, variables: $variables) {
      id
      name
      variables
    }
  }
`;

export const UPDATE_TEAM_ENVIRONMENT = `
  mutation UpdateTeamEnvironment($id: ID!, $name: String!, $variables: String!) {
    updateTeamEnvironment(id: $id, name: $name, variables: $variables) {
      id
      name
      variables
    }
  }
`;

export const DELETE_TEAM_ENVIRONMENT = `
  mutation DeleteTeamEnvironment($id: ID!) {
    deleteTeamEnvironment(id: $id)
  }
`;
