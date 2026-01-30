import { Command } from 'commander';
import { graphqlRequest } from '../utils/client.js';
import { output, success, error } from '../utils/output.js';
import { getConfig } from '../utils/config.js';
import { TEAM_WITH_ENVIRONMENTS } from '../graphql/queries.js';
import {
  CREATE_TEAM_ENVIRONMENT,
  UPDATE_TEAM_ENVIRONMENT,
  DELETE_TEAM_ENVIRONMENT
} from '../graphql/mutations.js';

function parseVariables(varsStr) {
  try {
    return JSON.parse(varsStr);
  } catch {
    return [];
  }
}

export function createEnvCommand(globalOpts) {
  const env = new Command('env')
    .description('Manage Hoppscotch environments (variables)');

  env
    .command('list')
    .description('List environments in a team')
    .option('--team <id>', 'Team ID')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      const data = await graphqlRequest(TEAM_WITH_ENVIRONMENTS, { teamID: teamId }, opts);

      if (!data.team) {
        error(`Team not found: ${teamId}`);
        process.exit(3);
      }

      const envs = data.team.teamEnvironments || [];

      if (opts.json) {
        output(envs, { json: true });
      } else {
        if (envs.length === 0) {
          console.log('No environments found in this team.');
          return;
        }
        const rows = envs.map(e => {
          const vars = parseVariables(e.variables);
          return {
            id: e.id,
            name: e.name,
            variables: vars.length
          };
        });
        output(rows, {
          columns: [
            { key: 'id', header: 'ID' },
            { key: 'name', header: 'Name' },
            { key: 'variables', header: 'Variables' }
          ]
        });
      }
    });

  env
    .command('get <envId>')
    .description('Get environment details')
    .option('--team <id>', 'Team ID')
    .action(async (envId, cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      const data = await graphqlRequest(TEAM_WITH_ENVIRONMENTS, { teamID: teamId }, opts);
      const env = data.team?.teamEnvironments?.find(e => e.id === envId);

      if (!env) {
        error(`Environment not found: ${envId}`);
        process.exit(3);
      }

      if (opts.json) {
        output(env, { json: true });
      } else {
        const vars = parseVariables(env.variables);
        console.log(`Environment: ${env.name}`);
        console.log(`  ID: ${env.id}`);
        console.log(`  Variables:`);
        vars.forEach(v => {
          console.log(`    ${v.key} = ${v.value}`);
        });
      }
    });

  env
    .command('create')
    .description('Create a new environment')
    .option('--team <id>', 'Team ID')
    .option('--name <name>', 'Environment name')
    .option('--variables <json>', 'Variables JSON array [{"key":"k","value":"v"}]')
    .action(async (cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }
      if (!cmdOpts.name) {
        error('--name required');
        process.exit(4);
      }
      if (!cmdOpts.variables) {
        error('--variables required');
        process.exit(4);
      }

      const data = await graphqlRequest(CREATE_TEAM_ENVIRONMENT, {
        teamID: teamId,
        name: cmdOpts.name,
        variables: cmdOpts.variables
      }, opts);

      if (opts.json) {
        output(data.createTeamEnvironment, { json: true });
      } else {
        success(`Created environment: ${data.createTeamEnvironment.name}`);
        console.log(`  ID: ${data.createTeamEnvironment.id}`);
      }
    });

  env
    .command('update <envId>')
    .description('Update an environment')
    .option('--name <name>', 'New name')
    .option('--variables <json>', 'New variables JSON array')
    .option('--team <id>', 'Team ID')
    .action(async (envId, cmdOpts) => {
      const opts = globalOpts();
      const config = getConfig(opts);
      const teamId = cmdOpts.team || config.teamId;

      if (!teamId) {
        error('--team required');
        process.exit(4);
      }

      // Get current environment
      const currentData = await graphqlRequest(TEAM_WITH_ENVIRONMENTS, { teamID: teamId }, opts);
      const currentEnv = currentData.team?.teamEnvironments?.find(e => e.id === envId);

      if (!currentEnv) {
        error(`Environment not found: ${envId}`);
        process.exit(3);
      }

      const data = await graphqlRequest(UPDATE_TEAM_ENVIRONMENT, {
        id: envId,
        name: cmdOpts.name || currentEnv.name,
        variables: cmdOpts.variables || currentEnv.variables
      }, opts);

      if (opts.json) {
        output(data.updateTeamEnvironment, { json: true });
      } else {
        success(`Updated environment: ${data.updateTeamEnvironment.name}`);
      }
    });

  env
    .command('delete <envId>')
    .description('Delete an environment')
    .action(async (envId) => {
      const opts = globalOpts();
      await graphqlRequest(DELETE_TEAM_ENVIRONMENT, { id: envId }, opts);

      if (opts.json) {
        output({ deleted: true, id: envId }, { json: true });
      } else {
        success(`Deleted environment: ${envId}`);
      }
    });

  return env;
}
