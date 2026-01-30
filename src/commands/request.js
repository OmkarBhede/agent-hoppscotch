import { Command } from 'commander';
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
  DELETE_REQUEST,
  MOVE_REQUEST
} from '../graphql/mutations.js';

function buildRequestBody(options) {
  return JSON.stringify({
    v: "5",
    name: options.title,
    endpoint: options.url || options.endpoint || "",
    method: options.method || "GET",
    headers: options.headers ? JSON.parse(options.headers) : [],
    params: options.params ? JSON.parse(options.params) : [],
    body: {
      contentType: options.bodyType || "application/json",
      body: options.body || ""
    },
    auth: {
      authType: options.authType || "none",
      authActive: options.authType && options.authType !== "none",
      token: options.authToken || ""
    },
    preRequestScript: "",
    testScript: "",
    requestVariables: []
  });
}

function parseRequestJson(requestStr) {
  try {
    return JSON.parse(requestStr);
  } catch {
    return null;
  }
}

export function createRequestCommand(globalOpts) {
  const request = new Command('request')
    .description('Manage Hoppscotch API requests');

  request
    .command('list')
    .description('List requests in a collection')
    .option('--collection <id>', 'Collection ID')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const collectionId = cmdOpts.collection || config.collectionId;

      if (!collectionId) {
        error('--collection required');
        process.exit(4);
      }

      const data = await graphqlRequest(REQUESTS_IN_COLLECTION, { collectionID: collectionId }, opts);

      if (opts.json) {
        output(data.requestsInCollection, { json: true });
      } else {
        const rows = data.requestsInCollection.map(r => {
          const req = parseRequestJson(r.request);
          return {
            id: r.id,
            title: r.title,
            method: req?.method || 'N/A',
            endpoint: req?.endpoint?.substring(0, 50) || 'N/A'
          };
        });
        output(rows, {
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'title', header: 'Title' },
            { key: 'method', header: 'Method' },
            { key: 'endpoint', header: 'Endpoint' }
          ]
        });
      }
    });

  request
    .command('find <term>')
    .description('Search requests by title')
    .option('--team <id>', 'Team ID')
    .action(async (term, cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      const data = await graphqlRequest(SEARCH_FOR_REQUEST, {
        teamID: teamId,
        searchTerm: term
      }, opts);

      if (opts.json) {
        output(data.searchForRequest, { json: true });
      } else {
        const results = data.searchForRequest;
        if (results.length === 0) {
          console.log(`No requests found matching "${term}"`);
        } else {
          console.log(`Found ${results.length} request(s) matching "${term}":`);
          results.forEach(r => {
            const req = parseRequestJson(r.request);
            console.log(`  ${r.id} │ ${r.title} │ ${req?.method || 'N/A'}`);
          });
        }
      }
    });

  request
    .command('get <requestId>')
    .description('Get request details')
    .action(async (requestId) => {
      const opts = globalOpts();
      const data = await graphqlRequest(REQUEST, { requestID: requestId }, opts);

      if (!data.request) {
        error(`Request not found: ${requestId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(data.request, { json: true });
      } else {
        const r = data.request;
        const req = parseRequestJson(r.request);
        console.log(`Request: ${r.title}`);
        console.log(`  ID:           ${r.id}`);
        console.log(`  Collection:   ${r.collectionID}`);
        console.log(`  Team:         ${r.teamID}`);
        if (req) {
          console.log(`  Method:       ${req.method}`);
          console.log(`  Endpoint:     ${req.endpoint}`);
          console.log(`  Headers:      ${req.headers?.length || 0}`);
          console.log(`  Body type:    ${req.body?.contentType || 'none'}`);
        }
      }
    });

  request
    .command('create')
    .description('Create a new API request')
    .option('--collection <id>', 'Collection ID')
    .option('--team <id>', 'Team ID')
    .option('--title <title>', 'Request title')
    .option('--method <method>', 'HTTP method (GET, POST, PUT, PATCH, DELETE)')
    .option('--url <url>', 'API URL (supports {{variables}})')
    .option('--params <json>', 'Query params JSON array')
    .option('--headers <json>', 'Headers JSON array')
    .option('--body <json>', 'Request body')
    .option('--body-type <type>', 'Content type (application/json, form-data, none)')
    .option('--auth-type <type>', 'Auth type (bearer, basic, none)')
    .option('--auth-token <token>', 'Auth token')
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
      if (!cmdOpts.method) {
        error('--method required');
        process.exit(4);
      }
      if (!cmdOpts.url) {
        error('--url required');
        process.exit(4);
      }

      const requestJson = buildRequestBody(cmdOpts);

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
        success(`Created request: ${data.createRequestInCollection.title}`);
        console.log(`  ID: ${data.createRequestInCollection.id}`);
      }
    });

  request
    .command('update <requestId>')
    .description('Update an existing request')
    .option('--title <title>', 'New title')
    .option('--method <method>', 'HTTP method')
    .option('--url <url>', 'API URL')
    .option('--params <json>', 'Query params JSON array')
    .option('--headers <json>', 'Headers JSON array')
    .option('--body <json>', 'Request body')
    .option('--body-type <type>', 'Content type')
    .option('--auth-type <type>', 'Auth type')
    .option('--auth-token <token>', 'Auth token')
    .action(async (requestId, cmdOpts) => {
      const opts = globalOpts();

      // First get the existing request
      const existing = await graphqlRequest(REQUEST, { requestID: requestId }, opts);
      if (!existing.request) {
        error(`Request not found: ${requestId}`);
        process.exit(3);
      }

      const currentReq = parseRequestJson(existing.request.request) || {};

      // Merge options
      const updatedOptions = {
        title: cmdOpts.title || existing.request.title,
        method: cmdOpts.method || currentReq.method,
        url: cmdOpts.url || currentReq.endpoint,
        params: cmdOpts.params || JSON.stringify(currentReq.params || []),
        headers: cmdOpts.headers || JSON.stringify(currentReq.headers || []),
        body: cmdOpts.body || currentReq.body?.body,
        bodyType: cmdOpts.bodyType || currentReq.body?.contentType,
        authType: cmdOpts.authType || currentReq.auth?.authType,
        authToken: cmdOpts.authToken || currentReq.auth?.token
      };

      const requestJson = buildRequestBody(updatedOptions);

      const updateData = { request: requestJson };
      if (cmdOpts.title) updateData.title = cmdOpts.title;

      const data = await graphqlRequest(UPDATE_REQUEST, {
        requestID: requestId,
        data: updateData
      }, opts);

      if (opts.json) {
        output(data.updateRequest, { json: true });
      } else {
        success(`Updated request: ${data.updateRequest.title}`);
      }
    });

  request
    .command('delete <requestId>')
    .description('Delete a request')
    .action(async (requestId) => {
      const opts = globalOpts();
      await graphqlRequest(DELETE_REQUEST, { requestID: requestId }, opts);

      if (opts.json) {
        output({ deleted: true, id: requestId }, { json: true });
      } else {
        success(`Deleted request: ${requestId}`);
      }
    });

  request
    .command('move <requestId>')
    .description('Move request to different collection')
    .option('--to <collectionId>', 'Destination collection ID')
    .action(async (requestId, cmdOpts) => {
      const opts = globalOpts();

      if (!cmdOpts.to) {
        error('--to required');
        process.exit(4);
      }

      const data = await graphqlRequest(MOVE_REQUEST, {
        requestID: requestId,
        destCollID: cmdOpts.to
      }, opts);

      if (opts.json) {
        output(data.moveRequest, { json: true });
      } else {
        success(`Moved request to collection: ${data.moveRequest.collectionID}`);
      }
    });

  return request;
}
