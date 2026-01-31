import { Command } from 'commander';
import { readFileSync } from 'fs';
import { graphqlRequest } from '../utils/client.js';
import { output, success, error } from '../utils/output.js';
import { getConfig } from '../utils/config.js';
import {
  REQUEST,
  REQUESTS_IN_COLLECTION,
  SEARCH_FOR_REQUEST
} from '../graphql/queries.js';
import {
  CREATE_REQUEST_IN_COLLECTION,
  UPDATE_REQUEST,
  DELETE_REQUEST
} from '../graphql/mutations.js';

function parseHeaders(headersJson) {
  if (!headersJson) return [];
  const parsed = JSON.parse(headersJson);

  if (Array.isArray(parsed)) {
    return parsed.map(h => ({
      key: h.key,
      value: h.value,
      active: h.active !== false
    }));
  }

  return Object.entries(parsed).map(([key, value]) => ({
    key,
    value,
    active: true
  }));
}

function buildGqlRequestBody(options) {
  return JSON.stringify({
    v: "4",
    name: options.title,
    url: options.url || "",
    headers: parseHeaders(options.headers),
    query: options.query || "",
    variables: options.variables || "{}"
  });
}

function parseGqlRequestJson(requestStr) {
  try {
    return JSON.parse(requestStr);
  } catch {
    return null;
  }
}

export function createGraphqlCommand(globalOpts) {
  const gql = new Command('graphql')
    .description('Manage Hoppscotch GraphQL requests');

  gql
    .command('list')
    .description('List GraphQL requests in a collection')
    .option('--collection <id>', 'Collection ID')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const collectionId = cmdOpts.collection || config.collectionId;

      if (!collectionId) {
        error('--collection required (or set default: agent-hoppscotch auth set-default --collection <id>)');
        process.exit(4);
      }

      const data = await graphqlRequest(REQUESTS_IN_COLLECTION, { collectionID: collectionId }, opts);
      const requests = data.requestsInCollection || [];

      if (opts.json) {
        output(requests, { json: true });
      } else {
        if (requests.length === 0) {
          console.log('No GraphQL requests found in this collection.');
          return;
        }
        const rows = requests.map(r => {
          const req = parseGqlRequestJson(r.request);
          return {
            id: r.id,
            title: r.title,
            url: req?.url?.substring(0, 40) || 'N/A'
          };
        });
        output(rows, {
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'title', header: 'Title' },
            { key: 'url', header: 'URL' }
          ]
        });
      }
    });

  gql
    .command('get <requestId>')
    .description('Get GraphQL request details')
    .action(async (requestId) => {
      const opts = globalOpts();
      const data = await graphqlRequest(REQUEST, { requestID: requestId }, opts);

      if (!data.request) {
        error(`GraphQL request not found: ${requestId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(data.request, { json: true });
      } else {
        const r = data.request;
        const req = parseGqlRequestJson(r.request);
        console.log(`GraphQL Request: ${r.title}`);
        console.log(`  ID:       ${r.id}`);
        console.log(`  Collection: ${r.collectionID}`);
        if (req) {
          console.log(`  URL:      ${req.url}`);
          console.log(`  Headers:  ${req.headers?.length || 0}`);
          if (req.query) {
            console.log(`  Query:    ${req.query.substring(0, 50)}${req.query.length > 50 ? '...' : ''}`);
          }
        }
      }
    });

  gql
    .command('create')
    .description('Create a new GraphQL request')
    .option('--collection <id>', 'Collection ID')
    .option('--team <id>', 'Team ID')
    .option('--title <title>', 'Request title')
    .option('--url <url>', 'GraphQL endpoint URL')
    .option('--query <gql>', 'GraphQL query/mutation')
    .option('--query-file <path>', 'Path to GraphQL query file')
    .option('--variables <json>', 'GraphQL variables JSON')
    .option('--variables-file <path>', 'Path to variables JSON file')
    .option('--headers <json>', 'Headers JSON array')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const collectionId = cmdOpts.collection || config.collectionId;
      const teamId = cmdOpts.team || config.teamId;

      if (!collectionId) {
        error('--collection required');
        process.exit(4);
      }
      if (!teamId) {
        error('--team required');
        process.exit(4);
      }
      if (!cmdOpts.title) {
        error('--title required');
        process.exit(4);
      }
      if (!cmdOpts.url) {
        error('--url required');
        process.exit(4);
      }

      // Handle query from file
      if (cmdOpts.queryFile && !cmdOpts.query) {
        try {
          cmdOpts.query = readFileSync(cmdOpts.queryFile, 'utf-8');
        } catch (e) {
          error(`Failed to read query file: ${e.message}`);
          process.exit(4);
        }
      }

      // Handle variables from file
      if (cmdOpts.variablesFile && !cmdOpts.variables) {
        try {
          cmdOpts.variables = readFileSync(cmdOpts.variablesFile, 'utf-8');
        } catch (e) {
          error(`Failed to read variables file: ${e.message}`);
          process.exit(4);
        }
      }

      const requestJson = buildGqlRequestBody(cmdOpts);

      const data = await graphqlRequest(CREATE_REQUEST_IN_COLLECTION, {
        collectionID: collectionId,
        data: {
          teamID: teamId,
          title: cmdOpts.title,
          request: requestJson
        }
      }, opts);

      if (opts.json) {
        output(data.createRequestInCollection, { json: true });
      } else {
        success(`Created GraphQL request: ${data.createRequestInCollection.title}`);
        console.log(`  ID: ${data.createRequestInCollection.id}`);
      }
    });

  gql
    .command('update <requestId>')
    .description('Update an existing GraphQL request')
    .option('--title <title>', 'New title')
    .option('--url <url>', 'GraphQL endpoint URL')
    .option('--query <gql>', 'GraphQL query/mutation')
    .option('--query-file <path>', 'Path to GraphQL query file')
    .option('--variables <json>', 'GraphQL variables JSON')
    .option('--variables-file <path>', 'Path to variables JSON file')
    .option('--headers <json>', 'Headers JSON array')
    .action(async (requestId, cmdOpts) => {
      const opts = globalOpts();

      // First get the existing request
      const existing = await graphqlRequest(REQUEST, { requestID: requestId }, opts);
      if (!existing.request) {
        error(`GraphQL request not found: ${requestId}`);
        process.exit(3);
      }

      const currentReq = parseGqlRequestJson(existing.request.request) || {};

      // Handle query from file
      if (cmdOpts.queryFile && !cmdOpts.query) {
        try {
          cmdOpts.query = readFileSync(cmdOpts.queryFile, 'utf-8');
        } catch (e) {
          error(`Failed to read query file: ${e.message}`);
          process.exit(4);
        }
      }

      // Handle variables from file
      if (cmdOpts.variablesFile && !cmdOpts.variables) {
        try {
          cmdOpts.variables = readFileSync(cmdOpts.variablesFile, 'utf-8');
        } catch (e) {
          error(`Failed to read variables file: ${e.message}`);
          process.exit(4);
        }
      }

      // Merge options
      const updatedOptions = {
        title: cmdOpts.title || existing.request.title,
        url: cmdOpts.url || currentReq.url,
        query: cmdOpts.query || currentReq.query,
        variables: cmdOpts.variables || currentReq.variables,
        headers: cmdOpts.headers || JSON.stringify(currentReq.headers || [])
      };

      const requestJson = buildGqlRequestBody(updatedOptions);

      const updateData = { request: requestJson };
      if (cmdOpts.title) updateData.title = cmdOpts.title;

      const data = await graphqlRequest(UPDATE_REQUEST, {
        requestID: requestId,
        data: updateData
      }, opts);

      if (opts.json) {
        output(data.updateRequest, { json: true });
      } else {
        success(`Updated GraphQL request: ${data.updateRequest.title}`);
      }
    });

  gql
    .command('delete <requestId>')
    .description('Delete a GraphQL request')
    .action(async (requestId) => {
      const opts = globalOpts();
      await graphqlRequest(DELETE_REQUEST, { requestID: requestId }, opts);

      if (opts.json) {
        output({ deleted: true, id: requestId }, { json: true });
      } else {
        success(`Deleted GraphQL request: ${requestId}`);
      }
    });

  return gql;
}
