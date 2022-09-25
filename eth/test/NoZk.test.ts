import { IntegerVector } from '@dfdao/hashing';
// eslint-disable-next-line import/no-extraneous-dependencies
import { perlin, PerlinConfig } from '@dfdao/procgen-utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { cleanCoords } from './utils/TestUtils';

import { noZkWorldFixture, World } from './utils/TestWorld';
import { noZkDefaultInitializerValues } from './utils/WorldConstants';

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
    console.log('contract perlin', contract);
    const client = perlin(coords, perlinConfig);
    console.log('client perlin', client);
    expect(contract).to.equal(client);
  });
});
