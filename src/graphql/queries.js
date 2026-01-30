// Team queries
export const MY_TEAMS = `
  query MyTeams {
    myTeams {
      id
      name
      myRole
    }
  }
`;

export const TEAM = `
  query Team($teamID: ID!) {
    team(teamID: $teamID) {
      id
      name
      myRole
      ownersCount
      editorsCount
      viewersCount
    }
  }
`;

// Collection queries
export const ROOT_COLLECTIONS_OF_TEAM = `
  query RootCollectionsOfTeam($teamID: ID!, $cursor: ID, $take: Int) {
    rootCollectionsOfTeam(teamID: $teamID, cursor: $cursor, take: $take) {
      id
      title
      data
    }
  }
`;

export const COLLECTION = `
  query Collection($collectionID: ID!) {
    collection(collectionID: $collectionID) {
      id
      title
      data
      parentID
      children {
        id
        title
      }
    }
  }
`;

export const EXPORT_COLLECTIONS_TO_JSON = `
  query ExportCollectionsToJSON($teamID: ID!) {
    exportCollectionsToJSON(teamID: $teamID)
  }
`;

export const EXPORT_COLLECTION_TO_JSON = `
  query ExportCollectionToJSON($teamID: ID!, $collectionID: ID!) {
    exportCollectionToJSON(teamID: $teamID, collectionID: $collectionID)
  }
`;

// Request queries
export const REQUEST = `
  query Request($requestID: ID!) {
    request(requestID: $requestID) {
      id
      title
      request
      collectionID
      teamID
    }
  }
`;

export const REQUESTS_IN_COLLECTION = `
  query RequestsInCollection($collectionID: ID!, $cursor: ID, $take: Int) {
    requestsInCollection(collectionID: $collectionID, cursor: $cursor, take: $take) {
      id
      title
      request
    }
  }
`;

export const SEARCH_FOR_REQUEST = `
  query SearchForRequest($teamID: ID!, $searchTerm: String!, $cursor: ID, $take: Int) {
    searchForRequest(teamID: $teamID, searchTerm: $searchTerm, cursor: $cursor, take: $take) {
      id
      title
      request
      collectionID
    }
  }
`;

// Environment queries - Team environments are accessed via team query
export const TEAM_WITH_ENVIRONMENTS = `
  query TeamWithEnvironments($teamID: ID!) {
    team(teamID: $teamID) {
      id
      name
      teamEnvironments {
        id
        name
        variables
      }
    }
  }
`;
