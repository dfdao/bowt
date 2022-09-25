import { IntegerVector } from '@dfdao/hashing';
// eslint-disable-next-line import/no-extraneous-dependencies
import { perlin, PerlinConfig } from '@dfdao/procgen-utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { cleanCoords } from './utils/TestUtils';

import { noZkWorldFixture, World } from './utils/TestWorld';
import { noZkDefaultInitializerValues, SPAWN_PLANET_1 } from './utils/WorldConstants';

//TODO: Add x,y mirror to Nalin's perlin

describe('NoZk', function () {
  let world: World;

  beforeEach('load fixture', async function () {
    world = await loadFixture(noZkWorldFixture);
  });

  it('gets correct perlin value with positive coords', async function () {
    const x = 7000;
    const y = 29409; // Max value is ...
    const inits = noZkDefaultInitializerValues;
    const key = 100;
    const scale = inits.PERLIN_LENGTH_SCALE;
    const contract = (await world.contract.perlin(x, y, key, scale)).toNumber();
    const coords: IntegerVector = {
      x,
      y,
    };
    const perlinConfig: PerlinConfig = {
      seed: key,
      scale,
      mirrorX: false,
      mirrorY: false,
      floor: true,
    };
    const client = perlin(coords, perlinConfig);
    console.log(contract, client);
    expect(contract).to.equal(client);
  });
  it('gets correct perlin value with negative coords', async function () {
    const x = -7000;
    const y = -6000; // Max value is ...
    const inits = noZkDefaultInitializerValues;
    const key = 100;
    const scale = inits.PERLIN_LENGTH_SCALE;
    const contract = (await world.contract.perlin(x, y, key, scale)).toNumber();
    // We clean the coords before submitting.
    const coords: IntegerVector = cleanCoords({
      x,
      y,
    });
    const perlinConfig: PerlinConfig = {
      seed: key,
      scale,
      mirrorX: false,
      mirrorY: false,
      floor: true,
    };
    const client = perlin(coords, perlinConfig);
    expect(contract).to.equal(client);
  });
  it('calls init player and makes a new planet', async function () {
    const x = -7000;
    const y = -6000; // Max value is ...
    // const inits = noZkDefaultInitializerValues;
    // const key = 100;
    const id = SPAWN_PLANET_1.id;
    console.log('id gt max uint?', id.gt(ethers.constants.Two.pow(256)));
    console.log('max uint gt id', ethers.constants.Two.pow(256).gt(id));
    console.log(`id hex`, SPAWN_PLANET_1.id._hex);
    const tx = await world.user1Core.noZkInitializePlayer(x, y, SPAWN_PLANET_1.id);
    await tx.wait();
    const players = await world.user1Core.bulkGetPlayers(0, 1);
    expect(players[0].player).to.equal(world.user1.address);
  });
});
