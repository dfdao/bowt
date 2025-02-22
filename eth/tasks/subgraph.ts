import Docker, { Container, ContainerCreateOptions, HealthConfig } from 'dockerode';
import * as fs from 'fs/promises';
import { subtask, task, types } from 'hardhat/config';
import { HardhatPluginError } from 'hardhat/plugins';
import type { HardhatArguments, HardhatRuntimeEnvironment } from 'hardhat/types';
import * as path from 'path';
import * as util from 'util';

const exec = util.promisify(require('child_process').exec);

export const PLUGIN_NAME = 'hardhat-subgraph';
export const TASK_SUBGRAPH_DEPLOY = 'subgraph:deploy';
export const TASK_SUBGRAPH_CODEGEN = 'subgraph:codegen';
export const TASK_SUBGRAPH_DOCKER = 'subgraph:docker';
export const TASK_SUBGRAPH_CLEANUP = 'subgraph:cleanup';

// Dockerode typings are community generated and of dubious quality/content
// This should be upstreamed eventually, but for now create the DockerodeError type
type DockerodeError = Error & {
  reason: string;
  statusCode: number;
  json: string;
};

type DockerodeProcess = {
  name: string;
  container: Container;
  stream: NodeJS.ReadableStream | undefined | void;
};

type DFContainerCreateOptions = ContainerCreateOptions & {
  // little helper field for us to know to open a logs stream on this container
  stdout?: boolean;
  // todo this needs to be upstreamed
  Healthcheck?: HealthConfig;
};

task(TASK_SUBGRAPH_CODEGEN, 'generate subgraph files before graph deploy').setAction(
  subgraphCodegen
);

async function subgraphCodegen(_args: HardhatArguments, hre: HardhatRuntimeEnvironment) {
  const { CONTRACT_ADDRESS, START_BLOCK } = hre.settings.contracts;

  // hardcoded for now, will be able to set with plugin
  const subgraphPath = path.join(hre.config.paths.root, 'subgraph');
  const subgraphConfigPath = path.join(subgraphPath, 'subgraph.yaml');
  const subgraphOutputPath = path.join(subgraphPath, 'generated');
  const abisPath = path.join(hre.packageDirs['@dfdao/contracts'], 'abis');

  const warning = 'THIS FILE IS GENERATED DO NOT EDIT THIS FILE. EDIT subgraph.template.yaml\n\n';
  const yaml = (await fs.readFile(path.join(subgraphPath, 'subgraph.template.yaml')))
    .toString()
    .replace(/{{{CONTRACT_ADDRESS}}}/g, CONTRACT_ADDRESS)
    .replace(/#{{{START_BLOCK}}}/g, START_BLOCK.toString())
    .replace(/{{{DARKFOREST_ABI_PATH}}}/g, path.join(abisPath, 'DarkForest_stripped.json'));

  await fs.writeFile(subgraphConfigPath, '# ' + warning + yaml);

  await exec(`npx graph codegen ${subgraphConfigPath} -o ${subgraphOutputPath}`, {
    env: { ...process.env },
    stdio: 'inherit',
  });
}

task(TASK_SUBGRAPH_DEPLOY, 'deploy subgraph')
  .addParam('name', 'name of subgraph', undefined, types.string)
  .setAction(subgraphDeploy);

async function subgraphDeploy(args: { name: string }, hre: HardhatRuntimeEnvironment) {
  await hre.run(TASK_SUBGRAPH_CODEGEN, args);
  const docker = new Docker();

  try {
    await docker.ping();
  } catch (error) {
    throw new HardhatPluginError(PLUGIN_NAME, 'Unable to connect to Docker');
  }

  await hre.run(TASK_SUBGRAPH_DOCKER, args);

  const subgraphPath = path.join(hre.config.paths.root, 'subgraph');

  await exec(`npx graph create --node http://localhost:8020/ ${args.name}`, {
    cwd: subgraphPath,
    env: { ...process.env },
    stdio: 'inherit',
  });

  await exec(
    `npx graph deploy --node http://localhost:8020/ --ipfs http://localhost:5001 -l df ${args.name} `,
    {
      cwd: subgraphPath,
      env: { ...process.env },
      stdio: 'inherit',
    }
  );

  console.log('subgraph containers running and subgraph deployed');
  console.log('NOTE: docker containers are not stopped or cleaned up');
  console.log('use npx hardhat subgraph:cleanup for a full cleanup');
  console.log('or the usual docker container ps and docker container stop and docker container rm');
}

async function terminate(processes: DockerodeProcess[]) {
  console.log('removing existing docker setup');

  return Promise.all(
    processes.map(async (process: DockerodeProcess) => {
      console.log('stopping', process.container.id);
      try {
        await process.container.stop();
      } catch (err) {
        if (err instanceof Error) {
          const error = err as DockerodeError;
          // Container might not exist or already be stopped, thats ok
          if (error.statusCode !== 304 && error.statusCode !== 404) {
            throw new HardhatPluginError(
              PLUGIN_NAME,
              'Could not stop ' + process.container.id,
              error
            );
          }
        }
      }

      console.log('removing', process.container.id);
      try {
        await process.container.remove();
      } catch (err) {
        if (err instanceof Error) {
          const error = err as DockerodeError;
          // Container might not exist, thats ok
          if (error.statusCode !== 404) {
            throw new HardhatPluginError(
              PLUGIN_NAME,
              'Could not remove ' + process.container.id,
              error
            );
          }
        }
      }
    })
  );
}

task(TASK_SUBGRAPH_CLEANUP, 'shutdown graph dockers').setAction(subgraphCleanup);

async function subgraphCleanup() {
  console.log('cleaning up subgraph containers');

  const docker = new Docker();

  // on the off chance containers weren't cleaned up
  const leftovers: DockerodeProcess[] = compose.map((svc) => {
    if (!svc.name || !svc.Image) {
      throw new HardhatPluginError(PLUGIN_NAME, 'type undefiend on DFContainerCreateOptions');
    }

    return {
      name: svc.name,
      container: docker.getContainer(svc.name),
      stream: undefined,
    };
  });

  await terminate(leftovers);
}

subtask(
  TASK_SUBGRAPH_DOCKER,
  'hook when docker containers are fully deployed, but graph hasnt been deployed yet'
).setAction(subgraphDocker);

async function subgraphDocker({}, hre: HardhatRuntimeEnvironment) {
  const docker = new Docker();

  await hre.run(TASK_SUBGRAPH_CLEANUP);

  try {
    await docker.createNetwork({ Name: 'thegraph_default', CheckDuplicate: true });
  } catch (err) {
    if (err instanceof Error) {
      const error = err as DockerodeError;
      // There is no network remove so after first run this always exists. No
      // reason to error
      if (error.statusCode !== 409) {
        throw new HardhatPluginError(PLUGIN_NAME, 'Could not createNetwork', error);
      }
    }
  }

  await docker.createVolume({ Name: 'thegraph_data' });

  const processes: DockerodeProcess[] = [];
  for (const svc of compose) {
    if (!svc.name) {
      throw new HardhatPluginError(PLUGIN_NAME, 'type undefiend on DFContainerCreateOptions');
    }

    console.log('starting', svc.name);

    await new Promise<void>((resolve, reject) => {
      if (!svc.Image) {
        throw new HardhatPluginError(PLUGIN_NAME, 'type undefiend on DFContainerCreateOptions');
      }
      docker.pull(svc.Image, (err: Error, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);

        docker.modem.followProgress(stream, onFinished, () => {});

        function onFinished(err: Error, _output: never) {
          if (err) return reject(err);

          console.log('Done pulling.');
          return resolve();
        }
      });
    });

    try {
      const c = await docker.createContainer(svc);
      await c.start();

      if (svc.Healthcheck) {
        let info;
        do {
          info = await c.inspect();
        } while (info.State.Health?.Status !== 'healthy');
      }

      const p: DockerodeProcess = {
        name: svc.name,
        container: c,
        stream: undefined,
      };

      if (svc.stdout && hre.hardhatArguments.verbose) {
        const stream = await p.container.logs({ follow: true, stdout: true, stderr: true });

        stream.on('data', function (chunk: Buffer) {
          //dont want all the newlines from console.log
          process.stdout.write(chunk.toString('utf8'));
        });

        p.stream = stream;
      }

      processes.push(p);
    } catch (err) {
      throw new HardhatPluginError(PLUGIN_NAME, `Unable to create service: ${svc.name}`);
    }
  }

  return processes;
}

const isLinux = process.platform !== 'darwin' && process.platform !== 'win32';

const compose: DFContainerCreateOptions[] = [
  {
    name: 'thegraph_postgres',
    Image: 'postgres:latest',
    HostConfig: {
      Binds: ['thegraph_data:/data/postgresql:rw'],
      PortBindings: { '5432/tcp': [{ HostPort: '5432' }] },
    },
    Env: ['POSTGRES_USER=graph-node', 'POSTGRES_PASSWORD=let-me-in', 'POSTGRES_DB=graph-node'],
    NetworkingConfig: {
      EndpointsConfig: {
        thegraph_default: {
          Aliases: ['postgres'],
        },
      },
    },
    Volumes: { 'thegraph_data:/data/postgresql': {} },
  },
  {
    name: 'thegraph_ipfs',
    Image: 'ipfs/go-ipfs:v0.4.23',
    HostConfig: {
      Binds: ['thegraph_data:/data/ipfs:rw'],
      PortBindings: { '5001/tcp': [{ HostPort: '5001' }] },
    },
    NetworkingConfig: {
      EndpointsConfig: {
        thegraph_default: {
          Aliases: ['ipfs'],
        },
      },
    },
    Volumes: { 'thegraph_data:/data/ipfs': {} },
  },
  {
    name: 'thegraph_graph-node',
    stdout: true,
    Image: 'graphprotocol/graph-node:latest',
    HostConfig: {
      PortBindings: {
        '8000/tcp': [{ HostPort: '8000' }],
        '8001/tcp': [{ HostPort: '8001' }],
        '8020/tcp': [{ HostPort: '8020' }],
        '8030/tcp': [{ HostPort: '8030' }],
        '8040/tcp': [{ HostPort: '8040' }],
      },
    },
    Env: [
      'postgres_host=postgres',
      'postgres_user=graph-node',
      'postgres_pass=let-me-in',
      'postgres_db=graph-node',
      'ipfs=ipfs:5001',
      `ethereum=xdai:http://${isLinux ? '172.17.0.1' : 'host.docker.internal'}:8545`,
      'RUST_LOG=info',
      'GRAPH_LOG=debug',
    ],
    NetworkingConfig: {
      EndpointsConfig: {
        thegraph_default: {
          Aliases: ['graph-node'],
        },
      },
    },
    Healthcheck: {
      Test: [
        'CMD-SHELL',
        'printf "GET /subgraphs/name//graphql HTTP/1.0\r\n\r\n" | nc localhost 8000 | grep "HTTP/1.0 200 OK" || exit 1  ',
      ],
      Interval: 2000000000, // 2 second, in nanoseconds
    },
  },
];
