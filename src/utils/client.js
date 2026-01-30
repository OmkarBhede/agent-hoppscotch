import { getConfig } from './config.js';

export class GraphQLError extends Error {
  constructor(errors) {
    super(errors.map(e => e.message).join(', '));
    this.name = 'GraphQLError';
    this.errors = errors;
  }
}

export class AuthError extends Error {
  constructor(message = 'Authentication required. Run: agent-hoppscotch auth set-cookie "<cookie>"') {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export async function graphqlRequest(query, variables = {}, opts = {}) {
  const config = getConfig(opts);

  if (!config.endpoint) {
    throw new AuthError('Endpoint not configured. Run: agent-hoppscotch auth set-endpoint "<url>"');
  }

  if (!config.cookie) {
    throw new AuthError();
  }

  if (opts.verbose) {
    console.error('\n--- GraphQL Request ---');
    console.error('Query:', query);
    console.error('Variables:', JSON.stringify(variables, null, 2));
    console.error('------------------------\n');
  }

  let response;
  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': config.cookie
      },
      body: JSON.stringify({ query, variables })
    });
  } catch (fetchError) {
    const cause = fetchError.cause;
    if (cause?.code === 'ENOTFOUND') {
      throw new Error(`Cannot resolve host for endpoint: ${config.endpoint}`);
    } else if (cause?.code === 'ECONNREFUSED') {
      throw new Error(`Connection refused to endpoint: ${config.endpoint}`);
    } else if (cause?.code === 'ETIMEDOUT' || cause?.code === 'ENETUNREACH') {
      throw new Error(`Connection timed out to endpoint: ${config.endpoint}`);
    } else {
      throw new Error(`Failed to connect to endpoint: ${config.endpoint}\nCause: ${fetchError.message}`);
    }
  }

  const data = await response.json();

  if (opts.verbose) {
    console.error('\n--- GraphQL Response ---');
    console.error(JSON.stringify(data, null, 2));
    console.error('------------------------\n');
  }

  if (data.errors) {
    const authErrors = data.errors.filter(e =>
      e.message.includes('auth') ||
      e.message.includes('Unauthorized') ||
      e.message.includes('Not authenticated')
    );
    if (authErrors.length > 0) {
      throw new AuthError('Session expired or invalid. Update cookie: agent-hoppscotch auth set-cookie "<cookie>"');
    }
    throw new GraphQLError(data.errors);
  }

  return data.data;
}
