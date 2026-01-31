#!/usr/bin/env node

import { program } from 'commander';
import { createAuthCommand } from '../src/commands/auth.js';
import { createTeamCommand } from '../src/commands/team.js';
import { createCollectionCommand } from '../src/commands/collection.js';
import { createRequestCommand } from '../src/commands/request.js';
import { createEnvCommand } from '../src/commands/env.js';
import { createGraphqlCommand } from '../src/commands/graphql.js';
import { createRealtimeCommand } from '../src/commands/realtime.js';
import { AuthError, GraphQLError, NotFoundError } from '../src/utils/client.js';

// Global options getter
function getGlobalOpts() {
  return {
    json: program.opts().json,
    verbose: program.opts().verbose,
    cookie: program.opts().cookie,
    endpoint: program.opts().endpoint
  };
}

program
  .name('agent-hoppscotch')
  .description('CLI for AI agents to interact with Hoppscotch API')
  .version('1.0.0')
  .option('--json', 'Output as JSON')
  .option('--verbose', 'Show detailed output including raw GraphQL')
  .option('--cookie <str>', 'Override stored cookie')
  .option('--endpoint <url>', 'Override stored endpoint');

// Add commands
program.addCommand(createAuthCommand(getGlobalOpts));
program.addCommand(createTeamCommand(getGlobalOpts));
program.addCommand(createCollectionCommand(getGlobalOpts));
program.addCommand(createRequestCommand(getGlobalOpts));
program.addCommand(createEnvCommand(getGlobalOpts));
program.addCommand(createGraphqlCommand(getGlobalOpts));
program.addCommand(createRealtimeCommand(getGlobalOpts));

// Error handling
process.on('unhandledRejection', (err) => {
  if (err instanceof AuthError) {
    console.error(`Error: ${err.message}`);
    process.exit(2);
  } else if (err instanceof NotFoundError) {
    console.error(`Error: ${err.message}`);
    process.exit(3);
  } else if (err instanceof GraphQLError) {
    console.error(`GraphQL Error: ${err.message}`);
    process.exit(1);
  } else {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
});

program.parse();
