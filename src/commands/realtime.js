import { Command } from 'commander';
import { graphqlRequest } from '../utils/client.js';
import { output, success, error } from '../utils/output.js';
import { getConfig } from '../utils/config.js';
import {
  REQUEST,
  REQUESTS_IN_COLLECTION,
} from '../graphql/queries.js';
import {
  CREATE_REQUEST_IN_COLLECTION,
  UPDATE_REQUEST,
  DELETE_REQUEST
} from '../graphql/mutations.js';

const VALID_REALTIME_TYPES = ['websocket', 'sse', 'socketio', 'mqtt'];

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

function buildRealtimeRequestBody(options) {
  const type = options.type || 'websocket';

  const base = {
    v: "1",
    name: options.title,
    url: options.url || "",
    headers: parseHeaders(options.headers)
  };

  switch (type) {
    case 'websocket':
      return JSON.stringify({
        ...base,
        type: 'websocket',
        protocols: options.protocols ? JSON.parse(options.protocols) : []
      });
    case 'sse':
      return JSON.stringify({
        ...base,
        type: 'sse'
      });
    case 'socketio':
      return JSON.stringify({
        ...base,
        type: 'socketio',
        path: options.path || '/socket.io',
        version: options.version || '4'
      });
    case 'mqtt':
      return JSON.stringify({
        ...base,
        type: 'mqtt',
        topic: options.topic || '',
        qos: parseInt(options.qos) || 0,
        clientId: options.clientId || ''
      });
    default:
      return JSON.stringify(base);
  }
}

function parseRealtimeRequestJson(requestStr) {
  try {
    return JSON.parse(requestStr);
  } catch {
    return null;
  }
}

export function createRealtimeCommand(globalOpts) {
  const realtime = new Command('realtime')
    .description('Manage Hoppscotch realtime requests (WebSocket, SSE, Socket.IO, MQTT)');

  realtime
    .command('list')
    .description('List realtime requests in a collection')
    .option('--collection <id>', 'Collection ID')
    .option('--type <type>', 'Filter by type (websocket, sse, socketio, mqtt)')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const collectionId = cmdOpts.collection || config.collectionId;

      if (!collectionId) {
        error('--collection required');
        process.exit(4);
      }

      const data = await graphqlRequest(REQUESTS_IN_COLLECTION, { collectionID: collectionId }, opts);
      let requests = data.requestsInCollection || [];

      // Filter by type if specified
      if (cmdOpts.type) {
        requests = requests.filter(r => {
          const req = parseRealtimeRequestJson(r.request);
          return req?.type === cmdOpts.type;
        });
      }

      if (opts.json) {
        output(requests, { json: true });
      } else {
        if (requests.length === 0) {
          console.log('No realtime requests found.');
          return;
        }
        const rows = requests.map(r => {
          const req = parseRealtimeRequestJson(r.request);
          return {
            id: r.id,
            title: r.title,
            type: req?.type || 'N/A',
            url: req?.url?.substring(0, 35) || 'N/A'
          };
        });
        output(rows, {
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'title', header: 'Title' },
            { key: 'type', header: 'Type' },
            { key: 'url', header: 'URL' }
          ]
        });
      }
    });

  realtime
    .command('get <requestId>')
    .description('Get realtime request details')
    .action(async (requestId) => {
      const opts = globalOpts();
      const data = await graphqlRequest(REQUEST, { requestID: requestId }, opts);

      if (!data.request) {
        error(`Realtime request not found: ${requestId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(data.request, { json: true });
      } else {
        const r = data.request;
        const req = parseRealtimeRequestJson(r.request);
        console.log(`Realtime Request: ${r.title}`);
        console.log(`  ID:       ${r.id}`);
        console.log(`  Collection: ${r.collectionID}`);
        if (req) {
          console.log(`  Type:     ${req.type || 'N/A'}`);
          console.log(`  URL:      ${req.url}`);
          console.log(`  Headers:  ${req.headers?.length || 0}`);
          if (req.type === 'websocket' && req.protocols?.length) {
            console.log(`  Protocols: ${req.protocols.join(', ')}`);
          }
          if (req.type === 'socketio') {
            console.log(`  Path:     ${req.path}`);
            console.log(`  Version:  ${req.version}`);
          }
          if (req.type === 'mqtt') {
            console.log(`  Topic:    ${req.topic}`);
            console.log(`  QoS:      ${req.qos}`);
          }
        }
      }
    });

  realtime
    .command('create')
    .description('Create a new realtime request')
    .option('--collection <id>', 'Collection ID')
    .option('--team <id>', 'Team ID')
    .option('--title <title>', 'Request title')
    .option('--type <type>', 'Type: websocket, sse, socketio, mqtt')
    .option('--url <url>', 'Endpoint URL')
    .option('--headers <json>', 'Headers JSON array')
    .option('--protocols <json>', 'WebSocket protocols array')
    .option('--path <path>', 'Socket.IO path')
    .option('--version <ver>', 'Socket.IO version')
    .option('--topic <topic>', 'MQTT topic')
    .option('--qos <qos>', 'MQTT QoS level (0, 1, 2)')
    .option('--client-id <id>', 'MQTT client ID')
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
      if (!cmdOpts.type) {
        error('--type required (websocket, sse, socketio, mqtt)');
        process.exit(4);
      }
      if (!VALID_REALTIME_TYPES.includes(cmdOpts.type)) {
        error(`Invalid type "${cmdOpts.type}". Must be one of: ${VALID_REALTIME_TYPES.join(', ')}`);
        process.exit(4);
      }
      if (!cmdOpts.url) {
        error('--url required');
        process.exit(4);
      }

      const requestJson = buildRealtimeRequestBody(cmdOpts);

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
        success(`Created ${cmdOpts.type} request: ${data.createRequestInCollection.title}`);
        console.log(`  ID: ${data.createRequestInCollection.id}`);
      }
    });

  realtime
    .command('update <requestId>')
    .description('Update an existing realtime request')
    .option('--title <title>', 'New title')
    .option('--url <url>', 'Endpoint URL')
    .option('--headers <json>', 'Headers JSON array')
    .option('--protocols <json>', 'WebSocket protocols')
    .option('--path <path>', 'Socket.IO path')
    .option('--version <ver>', 'Socket.IO version')
    .option('--topic <topic>', 'MQTT topic')
    .option('--qos <qos>', 'MQTT QoS level')
    .option('--client-id <id>', 'MQTT client ID')
    .action(async (requestId, cmdOpts) => {
      const opts = globalOpts();

      const existing = await graphqlRequest(REQUEST, { requestID: requestId }, opts);
      if (!existing.request) {
        error(`Realtime request not found: ${requestId}`);
        process.exit(3);
      }

      const currentReq = parseRealtimeRequestJson(existing.request.request) || {};

      const updatedOptions = {
        title: cmdOpts.title || existing.request.title,
        type: currentReq.type || 'websocket',
        url: cmdOpts.url || currentReq.url,
        headers: cmdOpts.headers || JSON.stringify(currentReq.headers || []),
        protocols: cmdOpts.protocols || JSON.stringify(currentReq.protocols || []),
        path: cmdOpts.path || currentReq.path,
        version: cmdOpts.version || currentReq.version,
        topic: cmdOpts.topic || currentReq.topic,
        qos: cmdOpts.qos || currentReq.qos,
        clientId: cmdOpts.clientId || currentReq.clientId
      };

      const requestJson = buildRealtimeRequestBody(updatedOptions);

      const updateData = { request: requestJson };
      if (cmdOpts.title) updateData.title = cmdOpts.title;

      const data = await graphqlRequest(UPDATE_REQUEST, {
        requestID: requestId,
        data: updateData
      }, opts);

      if (opts.json) {
        output(data.updateRequest, { json: true });
      } else {
        success(`Updated realtime request: ${data.updateRequest.title}`);
      }
    });

  realtime
    .command('delete <requestId>')
    .description('Delete a realtime request')
    .action(async (requestId) => {
      const opts = globalOpts();
      await graphqlRequest(DELETE_REQUEST, { requestID: requestId }, opts);

      if (opts.json) {
        output({ deleted: true, id: requestId }, { json: true });
      } else {
        success(`Deleted realtime request: ${requestId}`);
      }
    });

  return realtime;
}
