import { IntegerVector } from '@dfdao/hashing';
// eslint-disable-next-line import/no-extraneous-dependencies
import { perlin } from '@dfdao/procgen-utils';
import { locationIdFromEthersBNKeccack } from '@dfdao/serde';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import {
  calcPlanetData,
  calcPlanetDataFromId,
  generate,
  getPerlinConfig,
} from './utils/PlanetGenerator';
import { calcDist, cleanCoords } from './utils/TestUtils';
import { noZkWorldFixture, World } from './utils/TestWorld';
import { noZkInitializers, SPAWN_PLANET_1 } from './utils/WorldConstants';

//TODO: Add x,y mirror to Nalin's perlin
describe.only('NoZk', function () {
  let world: World;
  const inits = noZkInitializers;

  beforeEach('load fixture', async function () {
    world = await loadFixture(noZkWorldFixture);
  });

  it('gets correct perlin value with positive coords', async function () {
    const x = 7000;
    const y = 29409; // Max value is ...
    const key = inits.SPACETYPE_KEY;
    const scale = inits.PERLIN_LENGTH_SCALE;
    const contract = (await world.contract.perlin(x, y, key, scale)).toNumber();
    const coords: IntegerVector = {
      x,
      y,
    };
    const perlinConfig = getPerlinConfig(inits);
    const client = perlin(coords, perlinConfig);
    expect(contract).to.equal(client);
  });
  it('gets correct perlin value with negative coords', async function () {
    const x = -7000;
    const y = -6000; // Max value is ...
    const key = inits.SPACETYPE_KEY;
    const scale = inits.PERLIN_LENGTH_SCALE;
    const contract = (await world.contract.perlin(x, y, key, scale)).toNumber();
    // We clean the coords before submitting.
    const coords: IntegerVector = cleanCoords({
      x,
      y,
    });
    const perlinConfig = getPerlinConfig(inits);
    const client = perlin(coords, perlinConfig);
    expect(contract).to.equal(client);
  });
  it('calls init player and makes a new planet with synthetic location', async function () {
    const x = 12;
    const y = 71; // Max value is 2^31 - 1
    const perlinConfig = getPerlinConfig(inits);
    const clientPerlin = perlin({ x, y }, perlinConfig);
    const expectedPlanetData = calcPlanetDataFromId(
      locationIdFromEthersBNKeccack(SPAWN_PLANET_1.id),
      clientPerlin,
      inits
    );
    if (!expectedPlanetData) {
      throw new Error('data not found');
    }
    const tx = await world.user1Core.noZkInitializePlayer(x, y, SPAWN_PLANET_1.id);
    await tx.wait();
    const players = await world.user1Core.bulkGetPlayers(0, 1);
    expect(players[0].player).to.equal(world.user1.address);
    // Fetch new planet
    const numPlanets = (await world.user1Core.getNPlanets()).toNumber();
    const planets = await world.user1Core.bulkGetPlanets(0, numPlanets);
    const planet = planets[0];
    expect(planet.owner).to.equal(world.user1.address);
    expect(planet.x).to.equal(x);
    expect(planet.y).to.equal(y);
    expect(planet.planetLevel).to.equal(expectedPlanetData.level);
    expect(planet.planetType).to.equal(expectedPlanetData.type);
    expect(planet.spaceType).to.equal(expectedPlanetData.spaceType);
    expect(planet.perlin).to.equal(expectedPlanetData.planetPerlin);
  });
  it('calls init player and makes a new planet with real location', async function () {
    const x = 12;
    const y = 71; // Max value is 2^31 - 1
    const expectedPlanetData = calcPlanetData(x, y, inits);
    if (!expectedPlanetData) {
      throw new Error('data not found');
    }
    const tx = await world.user1Core.noZkInitializePlayer(x, y, 0);
    await tx.wait();
    const players = await world.user1Core.bulkGetPlayers(0, 1);
    expect(players[0].player).to.equal(world.user1.address);
    const numPlanets = (await world.user1Core.getNPlanets()).toNumber();
    const planets = await world.user1Core.bulkGetPlanets(0, numPlanets);
    const planet = planets[0];
    expect(planet.owner).to.equal(world.user1.address);
    expect(planet.x).to.equal(x);
    expect(planet.y).to.equal(y);
    expect(planet.planetLevel).to.equal(expectedPlanetData.level);
    expect(planet.planetType).to.equal(expectedPlanetData.type);
    expect(planet.spaceType).to.equal(expectedPlanetData.spaceType);
    expect(planet.perlin).to.equal(expectedPlanetData.planetPerlin);
  });
  it.skip('generates planets', async function () {
    const verbose = true;
    generate(200, 0, inits, verbose);
  });
  it.skip('gets correct distance', async function () {
    const coords = [
      {
        x1: 0,
        y1: 0,
        x2: 5,
        y2: 5,
      },
      {
        x1: 2,
        y1: 2,
        x2: -10,
        y2: -10,
      },
      {
        x1: 100,
        y1: -2394,
        x2: 3,
        y2: -4932,
      },
    ];

    coords.map(async (coord) => {
      const contractDist = (
        await world.contract.getPlanetDist(coord.x1, coord.y1, coord.x2, coord.y2)
      ).toNumber();
      const clientDist = calcDist(coord.x1, coord.y1, coord.x2, coord.y2);
      expect(contractDist).to.equal(clientDist);
    });
  });
  it.only('test move', async function () {
    const x = 12;
    const y = 71; // Max value is 2^31 - 1
    const shipsSent = 50000;
    const silverSent = 0;
    const expectedPlanetData = calcPlanetData(x, y, inits);
    if (!expectedPlanetData) {
      throw new Error('data not found');
    }
    const toLoc = { x: -5, y: 168 };
    const toLocExtendedData = calcPlanetData(toLoc.x, toLoc.y, inits);
    // if (!toLocExtendedData) throw new Error('not found');
    const tx = await world.user1Core.noZkInitializePlayer(x, y, 0);
    await tx.wait();
    const moveTx = await world.user1Core.noZkMove(
      x,
      y,
      toLoc.x,
      toLoc.y,
      shipsSent,
      silverSent,
      0,
      0
    );
    await moveTx.wait();
    // const data = await world.user1Core.bulkGetPlanetsDataByIds([
    //   '0x' + expectedPlanetData.location,
    //   '0x' + toLocExtendedData.location,
    // ]);
    // console.log(`data`, data);
    // Expect new planet to exist now
  });
});
