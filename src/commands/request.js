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
  DELETE_REQUEST,
  MOVE_REQUEST
} from '../graphql/mutations.js';

function buildAuthObject(options) {
  const authType = options.authType || "none";
  const authActive = authType !== "none";

  switch (authType) {
    case "api-key":
      return {
        authType: "api-key",
        authActive,
        key: options.authKey || "",
        value: options.authValue || "",
        addTo: options.authAddTo || "header"
      };
    case "oauth2":
      return {
        authType: "oauth-2",
        authActive,
        grantTypeInfo: {
          grantType: (options.oauthGrantType || "client_credentials").toUpperCase().replace(/-/g, "_"),
          authEndpoint: "",
          tokenEndpoint: options.oauthTokenUrl || "",
          clientID: options.oauthClientId || "",
          clientSecret: options.oauthClientSecret || "",
          scopes: options.oauthScope || ""
        }
      };
    case "inherit":
      return {
        authType: "inherit",
        authActive: true
      };
    case "bearer":
      return {
        authType: "bearer",
        authActive,
        token: options.authToken || ""
      };
    case "basic":
      return {
        authType: "basic",
        authActive,
        username: options.authUsername || "",
        password: options.authPassword || ""
      };
    default:
      return {
        authType: "none",
        authActive: false
      };
  }
}

function buildBodyObject(options) {
  const contentType = options.bodyType || "application/json";

  // Handle multipart/form-data with --form option
  if (contentType === "multipart/form-data" && options.form) {
    const formData = JSON.parse(options.form);
    const body = formData.map(field => ({
      key: field.key,
      value: field.isFile ? [] : (field.value || ""),
      isFile: field.isFile || false,
      active: field.active !== false
    }));
    return { contentType, body };
  }

  return { contentType, body: options.body || "" };
}

function parseHeaders(headersJson) {
  if (!headersJson) return [];
  const parsed = JSON.parse(headersJson);

  // If array format, ensure each item has active field
  if (Array.isArray(parsed)) {
    return parsed.map(h => ({
      key: h.key,
      value: h.value,
      active: h.active !== false
    }));
  }

  // If object format, convert to array (all active)
  return Object.entries(parsed).map(([key, value]) => ({
    key,
    value,
    active: true
  }));
}

function parseParams(paramsJson) {
  if (!paramsJson) return [];
  const parsed = JSON.parse(paramsJson);

  // Ensure each param has active field (default true)
  return parsed.map(p => ({
    key: p.key,
    value: p.value,
    active: p.active !== false
  }));
}

function buildRequestBody(options) {
  return JSON.stringify({
    v: "5",
    name: options.title,
    endpoint: options.url || options.endpoint || "",
    method: options.method || "GET",
    headers: parseHeaders(options.headers),
    params: parseParams(options.params),
    body: buildBodyObject(options),
    auth: buildAuthObject(options),
    preRequestScript: options.preRequestScript || "",
    testScript: options.testScript || "",
    requestVariables: options.variables ? JSON.parse(options.variables) : []
  });
}

function parseRequestJson(requestStr) {
  try {
    return JSON.parse(requestStr);
  } catch {
    return null;
  }
}

const VALID_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const VALID_AUTH_TYPES = ['bearer', 'basic', 'api-key', 'oauth2', 'inherit', 'none'];
const VALID_BODY_TYPES = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded', 'text/plain', 'none'];

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
        error('--collection required (or set default: agent-hoppscotch auth set-default --collection <id>)');
        process.exit(4);
      }

      const data = await graphqlRequest(REQUESTS_IN_COLLECTION, { collectionID: collectionId }, opts);
      const requests = data.requestsInCollection || [];

      if (opts.json) {
        output(requests, { json: true });
      } else {
        if (requests.length === 0) {
          console.log('No requests found in this collection.');
          return;
        }
        const rows = requests.map(r => {
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
    .option('--body-type <type>', 'Content type (application/json, multipart/form-data, application/x-www-form-urlencoded, text/plain, none)')
    .option('--form <json>', 'Form data for multipart/form-data: [{"key":"k","value":"v","isFile":false}]')
    .option('--auth-type <type>', 'Auth type (bearer, basic, api-key, oauth2, inherit, none)')
    .option('--auth-token <token>', 'Auth token (for bearer)')
    .option('--auth-username <username>', 'Username (for basic)')
    .option('--auth-password <password>', 'Password (for basic)')
    .option('--auth-key <key>', 'API key name (for api-key)')
    .option('--auth-value <value>', 'API key value (for api-key)')
    .option('--auth-add-to <location>', 'Where to add API key: header or query (for api-key)')
    .option('--oauth-grant-type <type>', 'OAuth grant type: client_credentials, authorization_code, etc.')
    .option('--oauth-token-url <url>', 'OAuth token endpoint URL')
    .option('--oauth-client-id <id>', 'OAuth client ID')
    .option('--oauth-client-secret <secret>', 'OAuth client secret')
    .option('--oauth-scope <scope>', 'OAuth scopes (space-separated)')
    .option('--pre-request-script <script>', 'Pre-request JavaScript code')
    .option('--pre-request-script-file <path>', 'Path to pre-request script file')
    .option('--test-script <script>', 'Test script JavaScript code (runs after response)')
    .option('--test-script-file <path>', 'Path to test script file')
    .option('--variables <json>', 'Request-level variables JSON array')
    .option('--validate-body', 'Validate JSON body when body-type is application/json')
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

      // Validate HTTP method
      if (!VALID_HTTP_METHODS.includes(cmdOpts.method.toUpperCase())) {
        error(`Invalid HTTP method "${cmdOpts.method}". Must be one of: ${VALID_HTTP_METHODS.join(', ')}`);
        process.exit(4);
      }

      // Validate auth type if provided
      if (cmdOpts.authType && !VALID_AUTH_TYPES.includes(cmdOpts.authType.toLowerCase())) {
        error(`Invalid auth type "${cmdOpts.authType}". Must be one of: ${VALID_AUTH_TYPES.join(', ')}`);
        process.exit(4);
      }

      // Validate body type if provided
      if (cmdOpts.bodyType && !VALID_BODY_TYPES.includes(cmdOpts.bodyType)) {
        error(`Invalid body type "${cmdOpts.bodyType}". Must be one of: ${VALID_BODY_TYPES.join(', ')}`);
        process.exit(4);
      }

      // Validate JSON body if requested
      if (cmdOpts.validateBody && cmdOpts.body) {
        const bodyType = cmdOpts.bodyType || 'application/json';
        if (bodyType === 'application/json') {
          try {
            JSON.parse(cmdOpts.body);
          } catch (e) {
            error(`Invalid JSON body: ${e.message}`);
            process.exit(4);
          }
        }
      }

      // Handle pre-request script from file
      if (cmdOpts.preRequestScriptFile && !cmdOpts.preRequestScript) {
        try {
          cmdOpts.preRequestScript = readFileSync(cmdOpts.preRequestScriptFile, 'utf-8');
        } catch (e) {
          error(`Failed to read pre-request script file: ${e.message}`);
          process.exit(4);
        }
      }

      // Handle test script from file
      if (cmdOpts.testScriptFile && !cmdOpts.testScript) {
        try {
          cmdOpts.testScript = readFileSync(cmdOpts.testScriptFile, 'utf-8');
        } catch (e) {
          error(`Failed to read test script file: ${e.message}`);
          process.exit(4);
        }
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
    .option('--form <json>', 'Form data for multipart/form-data')
    .option('--auth-type <type>', 'Auth type (bearer, basic, api-key, oauth2, inherit, none)')
    .option('--auth-token <token>', 'Auth token (for bearer)')
    .option('--auth-username <username>', 'Username (for basic)')
    .option('--auth-password <password>', 'Password (for basic)')
    .option('--auth-key <key>', 'API key name (for api-key)')
    .option('--auth-value <value>', 'API key value (for api-key)')
    .option('--auth-add-to <location>', 'Where to add API key: header or query (for api-key)')
    .option('--oauth-grant-type <type>', 'OAuth grant type')
    .option('--oauth-token-url <url>', 'OAuth token endpoint URL')
    .option('--oauth-client-id <id>', 'OAuth client ID')
    .option('--oauth-client-secret <secret>', 'OAuth client secret')
    .option('--oauth-scope <scope>', 'OAuth scopes')
    .option('--pre-request-script <script>', 'Pre-request JavaScript code')
    .option('--pre-request-script-file <path>', 'Path to pre-request script file')
    .option('--test-script <script>', 'Test script JavaScript code')
    .option('--test-script-file <path>', 'Path to test script file')
    .option('--variables <json>', 'Request-level variables JSON array')
    .option('--validate-body', 'Validate JSON body when body-type is application/json')
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
        form: cmdOpts.form || (Array.isArray(currentReq.body?.body) ? JSON.stringify(currentReq.body.body) : null),
        authType: cmdOpts.authType || currentReq.auth?.authType,
        authToken: cmdOpts.authToken || currentReq.auth?.token,
        authUsername: cmdOpts.authUsername || currentReq.auth?.username,
        authPassword: cmdOpts.authPassword || currentReq.auth?.password,
        authKey: cmdOpts.authKey || currentReq.auth?.key,
        authValue: cmdOpts.authValue || currentReq.auth?.value,
        authAddTo: cmdOpts.authAddTo || currentReq.auth?.addTo,
        oauthGrantType: cmdOpts.oauthGrantType || currentReq.auth?.grantTypeInfo?.grantType,
        oauthTokenUrl: cmdOpts.oauthTokenUrl || currentReq.auth?.grantTypeInfo?.tokenEndpoint,
        oauthClientId: cmdOpts.oauthClientId || currentReq.auth?.grantTypeInfo?.clientID,
        oauthClientSecret: cmdOpts.oauthClientSecret || currentReq.auth?.grantTypeInfo?.clientSecret,
        oauthScope: cmdOpts.oauthScope || currentReq.auth?.grantTypeInfo?.scopes,
        preRequestScript: cmdOpts.preRequestScript || currentReq.preRequestScript,
        testScript: cmdOpts.testScript || currentReq.testScript,
        variables: cmdOpts.variables || JSON.stringify(currentReq.requestVariables || [])
      };

      // Handle pre-request script from file
      if (cmdOpts.preRequestScriptFile && !cmdOpts.preRequestScript) {
        try {
          updatedOptions.preRequestScript = readFileSync(cmdOpts.preRequestScriptFile, 'utf-8');
        } catch (e) {
          error(`Failed to read pre-request script file: ${e.message}`);
          process.exit(4);
        }
      }

      // Handle test script from file
      if (cmdOpts.testScriptFile && !cmdOpts.testScript) {
        try {
          updatedOptions.testScript = readFileSync(cmdOpts.testScriptFile, 'utf-8');
        } catch (e) {
          error(`Failed to read test script file: ${e.message}`);
          process.exit(4);
        }
      }

      // Validate JSON body if requested
      if (cmdOpts.validateBody && cmdOpts.body) {
        const bodyType = updatedOptions.bodyType || 'application/json';
        if (bodyType === 'application/json') {
          try {
            JSON.parse(cmdOpts.body);
          } catch (e) {
            error(`Invalid JSON body: ${e.message}`);
            process.exit(4);
          }
        }
      }

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
